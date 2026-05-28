import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { getTodaySchedule, toggleDose, getAdherence } from "../services/medicationService.js";
import prisma from "../config/database.js";

async function resolvePatientId(userId: string): Promise<string | null> {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  return patient?.id ?? null;
}

export async function schedule(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const data = await getTodaySchedule(patientId);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ error: "Failed to fetch medication schedule" });
  }
}

export async function toggle(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const result = await toggleDose(req.params.logId as string, patientId);
    if (!result) {
      res.status(404).json({ error: "Medication log not found" });
      return;
    }
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ error: "Failed to toggle medication dose" });
  }
}

export async function adherence(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const days = parseInt(req.query.days as string) || 7;
    const data = await getAdherence(patientId, days);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ error: "Failed to fetch adherence stats" });
  }
}
