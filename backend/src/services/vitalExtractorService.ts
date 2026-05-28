import prisma from "../config/database.js";
import { healthAgents } from "../mastra/index.js";

const EXTRACTION_PROMPT = `Analyze this medical report image and extract any vital signs or lab values present.

Return ONLY a JSON array of objects with these fields:
- type: one of "heart_rate", "blood_pressure", "temperature", "spo2", "blood_sugar", "weight"
- value: the reading as a string (e.g. "120/80", "98.6", "72")
- unit: the unit (e.g. "mmHg", "bpm", "°F", "%", "mg/dL", "kg")

If no vitals are found, return an empty array: []
Do NOT include any explanation, markdown, or text outside the JSON array.`;

interface ExtractedVital {
  type: string;
  value: string;
  unit: string;
}

const VALID_TYPES = new Set(["blood_pressure", "heart_rate", "temperature", "spo2", "blood_sugar", "weight"]);

export async function extractVitalsFromReport(
  imageUrl: string,
  patientId: string,
): Promise<ExtractedVital[]> {
  let response: { text: string } | null = null;

  for (const agent of healthAgents) {
    try {
      response = await agent.generate(
        [{
          role: "user" as const,
          content: [
            { type: "image" as const, image: imageUrl, mimeType: "image/jpeg" },
            { type: "text" as const, text: EXTRACTION_PROMPT },
          ],
        }],
      );
      break;
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes("429") ||
          err.message.includes("RESOURCE_EXHAUSTED") ||
          err.message.includes("quota"));
      if (!isRateLimit || agent === healthAgents[healthAgents.length - 1]) {
        throw err;
      }
    }
  }

  if (!response) return [];

  let extracted: ExtractedVital[];
  try {
    const cleaned = response.text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    extracted = JSON.parse(cleaned);
  } catch {
    return [];
  }

  if (!Array.isArray(extracted)) return [];

  const valid = extracted.filter(
    (v) => VALID_TYPES.has(v.type) && v.value && v.unit,
  );

  if (valid.length === 0) return [];

  await prisma.vital.createMany({
    data: valid.map((v) => ({
      patientId,
      type: v.type,
      value: v.value,
      unit: v.unit,
    })),
  });

  return valid;
}
