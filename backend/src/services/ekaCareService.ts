import { env } from "../config/env.js";

const BASE_URL = "https://api.eka.care";
const AUTH_URL = `${BASE_URL}/connect-auth/v1/account/login`;
const DRUG_SEARCH_URL = `${BASE_URL}/medical-db/v1/drugs-and-labs`;

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.EKA_CARE_CLIENT_ID,
      client_secret: env.EKA_CARE_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Eka Care auth failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

export interface DrugResult {
  id: string;
  name: string;
  generic_name?: string;
  manufacturer_name?: string;
  product_type?: string;
  product_sku?: string;
}

export async function searchDrugs(query: string, limit = 10): Promise<DrugResult[]> {
  const token = await getAccessToken();

  const url = new URL(DRUG_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("s_type", "drug");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Eka Care drug search failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { drugs?: DrugResult[] };
  return data.drugs ?? [];
}

const LINK_BATCH_URL = `${BASE_URL}/med-link/nel/link/batch`;

export interface CodifiedEntity {
  text: string;
  snomedCode: string;
  snomedName: string;
  score: number;
}

export async function codifyEntities(terms: string[]): Promise<CodifiedEntity[]> {
  if (!terms.length) return [];

  const token = await getAccessToken();

  const chunks: string[][] = [];
  for (let i = 0; i < terms.length; i += 5) {
    chunks.push(terms.slice(i, i + 5));
  }

  const results: CodifiedEntity[] = [];

  for (const chunk of chunks) {
    const res = await fetch(LINK_BATCH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queries: chunk,
        ontology: "snomed",
        version: "20250401_extended",
        top_k: 1,
      }),
    });

    if (!res.ok) continue;

    const data = (await res.json()) as {
      results: Array<{
        query: string;
        results: Array<{
          term_id: string;
          term_name: string;
          score: number;
          is_linked: boolean;
        }>;
      }>;
    };

    for (const item of data.results) {
      const top = item.results?.[0];
      if (top?.is_linked) {
        results.push({
          text: item.query,
          snomedCode: top.term_id,
          snomedName: top.term_name,
          score: top.score,
        });
      }
    }
  }

  return results;
}

const DOC_UPLOAD_URL = `${BASE_URL}/mr/api/v2/docs`;
const DOC_RESULT_URL = `${BASE_URL}/mr/api/v1/docs`;

interface DocInitResponse {
  document_id: string;
  forms: { url: string; fields: Record<string, string> }[];
}

export async function initiateDocParse(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const token = await getAccessToken();

  const initForm = new FormData();
  initForm.append("file", new Blob([fileBuffer], { type: mimeType }), fileName);

  const initRes = await fetch(`${DOC_UPLOAD_URL}?task=smart`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: initForm,
  });

  if (!initRes.ok) {
    const body = await initRes.text().catch(() => "");
    throw new Error(`Eka Care doc upload failed (${initRes.status}): ${body}`);
  }

  const initData = (await initRes.json()) as DocInitResponse;
  const docId = initData.document_id;

  if (initData.forms?.[0]) {
    const s3Form = new FormData();
    for (const [key, value] of Object.entries(initData.forms[0].fields)) {
      s3Form.append(key, value);
    }
    s3Form.append("file", new Blob([fileBuffer], { type: mimeType }), fileName);

    const s3Res = await fetch(initData.forms[0].url, {
      method: "POST",
      body: s3Form,
    });

    if (!s3Res.ok && s3Res.status !== 204) {
      console.warn(`[EkaCare] S3 upload returned ${s3Res.status}`);
    }
  }

  return docId;
}

export interface ParsedReportResult {
  status: string;
  data?: {
    document_classification?: string;
    output?: {
      data?: Array<{
        test_name?: string;
        test_eka_id?: string;
        loinc_id?: string;
        confidence?: number;
        value?: string;
        unit?: string;
        normal_range?: { min?: number; max?: number };
        interpretation?: string;
      }>;
      pii?: {
        patient_name?: string;
        age?: string;
        gender?: string;
        doctor_name?: string;
        facility_name?: string;
        report_date?: string;
      };
    };
    fhir?: string;
  };
}

export async function getDocParseResult(documentId: string): Promise<ParsedReportResult> {
  const token = await getAccessToken();

  const res = await fetch(`${DOC_RESULT_URL}/${documentId}/result`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Eka Care result fetch failed (${res.status}): ${body}`);
  }

  return (await res.json()) as ParsedReportResult;
}

export async function parseDocumentWithPolling(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  maxAttempts = 10,
  intervalMs = 5000,
): Promise<ParsedReportResult> {
  const docId = await initiateDocParse(fileBuffer, mimeType, fileName);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const result = await getDocParseResult(docId);

    if (result.status === "completed" || result.status === "error") {
      return { ...result, data: result.data };
    }
  }

  throw new Error("Document parsing timed out");
}

// ── Health Assessment ──

const ASSESSMENT_URL = `${BASE_URL}/assessment/api/v1`;

function assessmentHeaders(): Record<string, string> {
  return {
    "client-id": env.EKA_CARE_CLIENT_ID,
    "Content-Type": "application/json",
  };
}

async function assessmentHeadersWithAuth(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return { ...assessmentHeaders(), auth: token };
}

export async function searchSymptoms(query: string, gender: string, age: number) {
  const genderCode = gender === "female" ? "f" : gender === "other" ? "o" : "m";
  const url = `https://mdb.dev.eka.care/v1/sa-terms?gender=${genderCode}&age=${age}&src=sn&q=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data as any[]) || [];
}

export async function initAssessment(gender: string, age: number): Promise<string> {
  const headers = await assessmentHeadersWithAuth();
  const genderCode = gender === "female" ? "F" : gender === "other" ? "O" : "M";

  const res = await fetch(`${ASSESSMENT_URL}/init/`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      user_info: { gender: genderCode, age },
      workflow_id: 1000,
      unique_identifier: `sa-${Date.now()}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Assessment init failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { assessment_id: string };
  return data.assessment_id;
}

export async function startAssessment(assessmentId: string) {
  const headers = await assessmentHeadersWithAuth();

  const res = await fetch(`${ASSESSMENT_URL}/start/${assessmentId}`, {
    method: "PUT",
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Assessment start failed (${res.status}): ${body}`);
  }

  return res.json();
}

export async function continueAssessment(assessmentId: string, qid: number, userResponse: any) {
  const headers = await assessmentHeadersWithAuth();

  const res = await fetch(`${ASSESSMENT_URL}/continue/${assessmentId}/${qid}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ user_response: [userResponse] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Assessment continue failed (${res.status}): ${body}`);
  }

  return res.json();
}

export async function submitAssessment(assessmentId: string) {
  const headers = await assessmentHeadersWithAuth();

  const res = await fetch(`${ASSESSMENT_URL}/submit/${assessmentId}`, {
    method: "PUT",
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Assessment submit failed (${res.status}): ${body}`);
  }

  return res.json();
}
