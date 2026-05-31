import prisma from "../config/database.js";
import { healthAgents } from "../mastra/index.js";
import { uploadFile } from "./cloudinaryService.js";
import { textToSpeech } from "./ttsService.js";
import { env } from "../config/env.js";

export async function createSession(patientId: string) {
  return prisma.chatSession.create({
    data: { patientId },
    include: { messages: true },
  });
}

export async function listSessions(patientId: string) {
  return prisma.chatSession.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getSessionMessages(sessionId: string, patientId: string) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, patientId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) return null;
  return session;
}

export async function deleteSession(sessionId: string, patientId: string) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, patientId },
  });

  if (!session) return null;

  await prisma.chatSession.delete({ where: { id: sessionId } });
  return true;
}

interface ImageInput {
  buffer: Buffer;
  mimetype: string;
}

export async function sendMessage(sessionId: string, patientId: string, text: string, image?: ImageInput, isVoice?: boolean, voiceLang?: string) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, patientId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      patient: {
        include: {
          user: { select: { name: true } },
          prescriptions: {
            include: { medications: true },
            orderBy: { date: "desc" },
            take: 10,
          },
          reports: {
            orderBy: { date: "desc" },
            take: 10,
          },
          vitals: {
            orderBy: { recordedAt: "desc" },
            take: 20,
          },
        },
      },
    },
  });

  if (!session) return null;

  let imageUrl: string | undefined;
  if (image) {
    const result = await uploadFile(image.buffer, `smarthealth/chat/${patientId}`, "image");
    imageUrl = result.secureUrl;
  }

  type TextContent = { type: "text"; text: string };
  type ImageContent = { type: "image"; image: string; mimeType: string };
  type UserMsg = { role: "user"; content: string | (TextContent | ImageContent)[] };
  type AssistantMsg = { role: "assistant"; content: string };

  const history: (UserMsg | AssistantMsg)[] = session.messages.map((m) =>
    m.role === "assistant"
      ? { role: "assistant" as const, content: m.text }
      : { role: "user" as const, content: m.text }
  );

  if (image) {
    const base64 = `data:${image.mimetype};base64,${image.buffer.toString("base64")}`;
    history.push({
      role: "user" as const,
      content: [
        { type: "image", image: base64, mimeType: image.mimetype },
        { type: "text", text: text || "Please analyze this image." },
      ],
    });
  } else {
    history.push({ role: "user" as const, content: text });
  }

  const patient = session.patient;
  const contextParts: string[] = [];
  if (patient.user.name) contextParts.push(`Patient name: ${patient.user.name}`);
  if (patient.age) contextParts.push(`Age: ${patient.age}`);
  if (patient.gender) contextParts.push(`Gender: ${patient.gender}`);
  if (patient.bloodGroup) contextParts.push(`Blood group: ${patient.bloodGroup}`);
  if (patient.allergies.length) {
    const codified = (patient.codifiedAllergies as any[]) || [];
    const allergyDetails = patient.allergies.map((a) => {
      const code = codified.find((c: any) => c.text === a);
      return code ? `${a} (SNOMED: ${code.snomedCode} - ${code.snomedName})` : a;
    });
    contextParts.push(`Known allergies: ${allergyDetails.join(", ")}`);
  }
  if (patient.chronicConditions.length) {
    const codified = (patient.codifiedConditions as any[]) || [];
    const condDetails = patient.chronicConditions.map((c) => {
      const code = codified.find((cd: any) => cd.text === c);
      return code ? `${c} (SNOMED: ${code.snomedCode} - ${code.snomedName})` : c;
    });
    contextParts.push(`Chronic conditions: ${condDetails.join(", ")}`);
  }
  if (patient.address) contextParts.push(`Location: ${patient.address}`);

  if (patient.prescriptions.length) {
    const rxLines = patient.prescriptions.map((rx) => {
      const meds = rx.medications.map((m) => `${m.name} ${m.dosage} (${m.frequency}, ${m.duration})`).join("; ");
      const date = rx.date.toISOString().split("T")[0];
      return `- [${date}] ${meds || "No medications listed"}${rx.notes ? ` | Notes: ${rx.notes}` : ""}`;
    });
    contextParts.push(`\nPrescriptions (recent):\n${rxLines.join("\n")}`);
  }

  if (patient.reports.length) {
    const reportLines = patient.reports.map((r) => {
      const date = r.date.toISOString().split("T")[0];
      return `- [${date}] ${r.name} (${r.type})`;
    });
    contextParts.push(`\nMedical Reports:\n${reportLines.join("\n")}`);
  }

  if (patient.vitals.length) {
    const vitalLines = patient.vitals.map((v) => {
      const date = v.recordedAt.toISOString().split("T")[0];
      return `- [${date}] ${v.type}: ${v.value} ${v.unit}`;
    });
    contextParts.push(`\nRecent Vitals:\n${vitalLines.join("\n")}`);
  }

  const contextNote = contextParts.length
    ? `\n\nPatient context:\n${contextParts.join("\n")}`
    : "";

  let response: { text: string; usage: Record<string, unknown> } | null = null;
  for (const agent of healthAgents) {
    try {
      const baseInstructions = await agent.getInstructions();
      response = await agent.generate(history, {
        instructions: (baseInstructions || "") + contextNote,
      });
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
      console.warn(`Rate limited on ${agent.id}, trying next model...`);
    }
  }

  if (!response) throw new Error("All models failed");

  let audioUrl: string | undefined;
  if (isVoice && env.SARVAM_API_KEY) {
    try {
      const plainText = response.text.replace(/[#*_~`>\-|[\]()]/g, "").replace(/\n{2,}/g, ". ").trim();
      const audioBuffer = await textToSpeech(plainText, voiceLang);
      const uploaded = await uploadFile(audioBuffer, `smarthealth/audio/${patientId}`, "raw");
      audioUrl = uploaded.secureUrl;
    } catch (err) {
      console.warn("TTS generation failed, continuing without audio:", err);
    }
  }

  const [userMessage, assistantMessage] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { sessionId, role: "user", text: text || "Please analyze this image.", imageUrl },
    }),
    prisma.chatMessage.create({
      data: { sessionId, role: "assistant", text: response.text, audioUrl },
    }),
  ]);

  return {
    userMessage,
    assistantMessage,
    usage: response.usage,
  };
}
