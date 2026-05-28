import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { createVital, listVitals, deleteVital, isValidVitalType } from "../services/vitalService.js";
import prisma from "../config/database.js";

async function resolvePatientId(userId: string): Promise<string | null> {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  return patient?.id ?? null;
}

export async function create(req: AuthRequest, res: Response) {
  const { type, value, unit, recordedAt } = req.body;

  if (!type || !value || !unit) {
    res.status(400).json({ error: "type, value, and unit are required" });
    return;
  }

  if (!isValidVitalType(type)) {
    res.status(400).json({ error: "Invalid vital type" });
    return;
  }

  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const vital = await createVital(patientId, {
      type,
      value,
      unit,
      recordedAt: recordedAt ? new Date(recordedAt) : undefined,
    });
    res.status(201).json({ success: true, data: vital });
  } catch {
    res.status(500).json({ error: "Failed to create vital" });
  }
}

export async function list(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const { type, from, to } = req.query;
    const vitals = await listVitals(
      patientId,
      type as string | undefined,
      from ? new Date(from as string) : undefined,
      to ? new Date(to as string) : undefined,
    );
    res.json({ success: true, data: vitals });
  } catch {
    res.status(500).json({ error: "Failed to fetch vitals" });
  }
}

export async function remove(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const result = await deleteVital(req.params.id as string, patientId);
    if (!result) {
      res.status(404).json({ error: "Vital not found" });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete vital" });
  }
}
