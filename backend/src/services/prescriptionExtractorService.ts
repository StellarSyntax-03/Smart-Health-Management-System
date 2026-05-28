import prisma from "../config/database.js";
import { env } from "../config/env.js";

const EXTRACTION_PROMPT = `Analyze this prescription image and extract all medications listed.

Return ONLY a JSON array of objects with these fields:
- name: the medicine name (string)
- dosage: the dosage like "500mg", "10ml" (string)
- frequency: one of "Once daily", "Twice daily", "Three times daily", "Four times daily" (string)
- duration: how long to take it like "7 days", "2 weeks", "1 month" (string)

If no medications are found, return an empty array: []
Do NOT include any explanation, markdown, or text outside the JSON array.`;

interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

const VALID_FREQUENCIES = new Set([
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
]);

export async function extractMedicationsFromPrescription(
  imageUrl: string,
  prescriptionId: string,
): Promise<ExtractedMedication[]> {
  if (!env.GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Groq API failed (${res.status}): ${errBody}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  const text = data.choices?.[0]?.message?.content;
  if (!text) return [];

  let extracted: ExtractedMedication[];
  try {
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    extracted = JSON.parse(cleaned);
  } catch {
    return [];
  }

  if (!Array.isArray(extracted)) return [];

  const valid = extracted
    .filter((m) => typeof m.name === "string" && m.name)
    .map((m) => ({
      name: m.name,
      dosage: m.dosage || "As prescribed",
      frequency: VALID_FREQUENCIES.has(m.frequency) ? m.frequency : "Once daily",
      duration: m.duration || "As directed",
    }));

  if (valid.length === 0) return [];

  await prisma.medication.createMany({
    data: valid.map((m) => ({
      prescriptionId,
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
    })),
  });

  return valid;
}
