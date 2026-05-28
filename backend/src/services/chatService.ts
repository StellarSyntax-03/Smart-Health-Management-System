import prisma from "../config/database.js";
import { mastra } from "../mastra/index.js";

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

export async function sendMessage(sessionId: string, patientId: string, text: string, image?: ImageInput) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, patientId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      patient: {
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!session) return null;

  const userMessage = await prisma.chatMessage.create({
    data: { sessionId, role: "user", text },
  });

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
  if (patient.allergies.length) contextParts.push(`Known allergies: ${patient.allergies.join(", ")}`);
  if (patient.chronicConditions.length) contextParts.push(`Chronic conditions: ${patient.chronicConditions.join(", ")}`);

  const contextNote = contextParts.length
    ? `\n\nPatient context:\n${contextParts.join("\n")}`
    : "";

  const agent = mastra.getAgent("healthAgent");
  const baseInstructions = await agent.getInstructions();
  const response = await agent.generate(history, {
    instructions: (baseInstructions || "") + contextNote,
  });

  const assistantMessage = await prisma.chatMessage.create({
    data: { sessionId, role: "assistant", text: response.text },
  });

  return {
    userMessage,
    assistantMessage,
    usage: response.usage,
  };
}
