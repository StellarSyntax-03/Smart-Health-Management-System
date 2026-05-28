import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import {
  createPrescription,
  listPrescriptions,
  getPrescription,
  deletePrescription,
} from "../services/prescriptionService.js";
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

  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  let medications: { name: string; dosage: string; frequency: string; duration: string }[] | undefined;
  if (req.body.medications) {
    try {
      const parsed = JSON.parse(req.body.medications);
      if (!Array.isArray(parsed)) {
        res.status(400).json({ error: "Medications must be a JSON array" });
        return;
      }
      const requiredKeys = ["name", "dosage", "frequency", "duration"] as const;
      for (const med of parsed) {
        if (typeof med !== "object" || med === null || requiredKeys.some((k) => typeof med[k] !== "string")) {
          res.status(400).json({ error: "Each medication must have name, dosage, frequency, and duration as strings" });
          return;
        }
      }
      medications = parsed;
    } catch {
      res.status(400).json({ error: "Medications must be a valid JSON array" });
      return;
    }
  }

  try {
    const prescription = await createPrescription({
      patientId,
      file: req.file,
      notes: req.body.notes,
      medications,
    });

    res.status(201).json({ success: true, data: prescription });
  } catch {
    res.status(500).json({ error: "Failed to upload prescription" });
  }
}

export async function list(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const prescriptions = await listPrescriptions(patientId);
    res.json({ success: true, data: prescriptions });
  } catch {
    res.status(500).json({ error: "Failed to fetch prescriptions" });
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const prescription = await getPrescription(req.params.id as string, patientId);
    res.json({ success: true, data: prescription });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Prescription not found") {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to fetch prescription" });
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
    await deletePrescription(req.params.id as string, patientId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Prescription not found") {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to delete prescription" });
    }
  }
}
