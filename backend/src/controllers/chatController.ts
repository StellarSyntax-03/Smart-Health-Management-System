import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import prisma from "../config/database.js";
import {
  createSession,
  listSessions,
  getSessionMessages,
  deleteSession,
  sendMessage,
} from "../services/chatService.js";

function getUserId(req: AuthRequest, res: Response): string | null {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return null;
  }
  return userId;
}

async function resolvePatientId(userId: string, res: Response): Promise<string | null> {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) {
    res.status(404).json({ success: false, error: "Patient profile not found" });
    return null;
  }
  return patient.id;
}

export async function createChatSession(req: AuthRequest, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) return;
  const patientId = await resolvePatientId(userId, res);
  if (!patientId) return;

  try {
    const session = await createSession(patientId);
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ success: false, error: "Failed to create session" });
  }
}

export async function listChatSessions(req: AuthRequest, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) return;
  const patientId = await resolvePatientId(userId, res);
  if (!patientId) return;

  try {
    const sessions = await listSessions(patientId);
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error("List sessions error:", err);
    res.status(500).json({ success: false, error: "Failed to list sessions" });
  }
}

export async function getChatMessages(req: AuthRequest, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) return;
  const patientId = await resolvePatientId(userId, res);
  if (!patientId) return;

  try {
    const session = await getSessionMessages(req.params.id as string, patientId);
    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }
    res.json({ success: true, data: session });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ success: false, error: "Failed to get messages" });
  }
}

export async function sendChatMessage(req: AuthRequest, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) return;
  const patientId = await resolvePatientId(userId, res);
  if (!patientId) return;

  const message = req.body.message;
  const file = req.file;

  if ((!message || typeof message !== "string" || !message.trim()) && !file) {
    res.status(400).json({ success: false, error: "Message or image is required" });
    return;
  }

  const imageInput = file
    ? { buffer: file.buffer, mimetype: file.mimetype }
    : undefined;

  try {
    const result = await sendMessage(
      req.params.id as string,
      patientId,
      (message || "").trim(),
      imageInput,
    );
    if (!result) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, error: "Failed to generate response" });
  }
}

export async function deleteChatSession(req: AuthRequest, res: Response) {
  const userId = getUserId(req, res);
  if (!userId) return;
  const patientId = await resolvePatientId(userId, res);
  if (!patientId) return;

  try {
    const result = await deleteSession(req.params.id as string, patientId);
    if (!result) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }
    res.json({ success: true, message: "Session deleted" });
  } catch (err) {
    console.error("Delete session error:", err);
    res.status(500).json({ success: false, error: "Failed to delete session" });
  }
}
