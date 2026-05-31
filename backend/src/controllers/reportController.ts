import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { REPORT_MIMES } from "../middleware/upload.js";
import { createReport, listReports, getReport, deleteReport } from "../services/reportService.js";
import { extractVitalsFromReport } from "../services/vitalExtractorService.js";
import { initiateDocParse, getDocParseResult } from "../services/ekaCareService.js";
import prisma from "../config/database.js";

async function resolvePatientId(userId: string): Promise<string | null> {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  return patient?.id ?? null;
}

export async function create(req: AuthRequest, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: "File is required" });
    return;
  }

  if (!REPORT_MIMES.includes(req.file.mimetype)) {
    res.status(400).json({ error: "Reports only accept JPEG, PNG, WebP, or PDF files" });
    return;
  }

  if (!req.body.name || typeof req.body.name !== "string" || !req.body.name.trim()) {
    res.status(400).json({ error: "Report name is required" });
    return;
  }

  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const report = await createReport({
      patientId,
      file: req.file,
      name: req.body.name.trim(),
    });

    if (report.type === "image") {
      extractVitalsFromReport(report.url, patientId).catch((err) =>
        console.warn("Vital extraction failed:", err)
      );
    }

    res.status(201).json({ success: true, data: report });
  } catch {
    res.status(500).json({ error: "Failed to upload report" });
  }
}

export async function list(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const reports = await listReports(patientId);
    res.json({ success: true, data: reports });
  } catch {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const report = await getReport(req.params.id as string, patientId);
    res.json({ success: true, data: report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Report not found") {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to fetch report" });
    }
  }
}

export async function remove(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    await deleteReport(req.params.id as string, patientId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Report not found") {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to delete report" });
    }
  }
}

export async function parseReport(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const report = await getReport(req.params.id as string, patientId);

    if (report.ekaDocId) {
      const result = await getDocParseResult(report.ekaDocId);
      const hasOutput = result.data?.output?.pii || result.data?.output?.data || result.data?.document_classification;
      if (result.status === "completed" || hasOutput) {
        const normalized = normalizeEkaResult(result.data);
        await prisma.medicalReport.update({
          where: { id: report.id },
          data: { parsedData: normalized as any },
        });
        res.json({ success: true, status: "completed", data: normalized });
        return;
      }
      res.json({ success: true, status: result.status, ekaDocId: report.ekaDocId });
      return;
    }

    if (!report.url) {
      res.status(400).json({ error: "Report has no file to parse" });
      return;
    }

    const fileRes = await fetch(report.url);
    if (!fileRes.ok) throw new Error("Failed to download report file");
    const buffer = Buffer.from(await fileRes.arrayBuffer());

    const mimeType = report.url.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
    const fileName = report.url.split("/").pop() || "report";

    const docId = await initiateDocParse(buffer, mimeType, fileName);

    await prisma.medicalReport.update({
      where: { id: report.id },
      data: { ekaDocId: docId },
    });

    res.json({ success: true, status: "processing", ekaDocId: docId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Report not found") {
      res.status(404).json({ error: message });
    } else {
      console.error("[EkaCare] Parse error:", err);
      res.status(500).json({ error: "Failed to parse report" });
    }
  }
}

function normalizeEkaResult(raw: any) {
  const output = raw?.output || {};
  const classification = raw?.document_classification || null;

  let pii: any = null;
  if (output.pii && typeof output.pii === "object") {
    const values = Object.values(output.pii) as any[];
    if (values.length > 0 && Array.isArray(values[0]) && values[0].length > 0) {
      const p = values[0][0];
      pii = {
        patient_name: p?.Patient?.Name || null,
        age: p?.Patient?.Age || null,
        gender: p?.Patient?.Gender || null,
        doctor_name: p?.Report?.Doctor || null,
        facility_name: p?.Report?.Facility || null,
        report_date: p?.Report?.GeneratedDate || p?.DocumentDate || null,
      };
    }
  }

  return {
    classification,
    tests: output.data || null,
    pii,
  };
}

export async function getParseResult(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const report = await getReport(req.params.id as string, patientId);

    if (report.parsedData) {
      res.json({ success: true, status: "completed", data: report.parsedData });
      return;
    }

    if (!report.ekaDocId) {
      res.status(400).json({ error: "Report has not been submitted for parsing" });
      return;
    }

    const result = await getDocParseResult(report.ekaDocId);
    const hasOutput = result.data?.output?.pii || result.data?.output?.data || result.data?.document_classification;

    if (result.status === "completed" || hasOutput) {
      const normalized = normalizeEkaResult(result.data);
      await prisma.medicalReport.update({
        where: { id: report.id },
        data: { parsedData: normalized as any },
      });
      res.json({ success: true, status: "completed", data: normalized });
      return;
    }

    res.json({ success: true, status: result.status, data: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Report not found") {
      res.status(404).json({ error: message });
    } else {
      console.error("[EkaCare] Parse result error:", err);
      res.status(500).json({ error: "Failed to fetch parse result" });
    }
  }
}
