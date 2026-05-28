import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import {
  createPrescription,
  listPrescriptions,
  getPrescription,
  deletePrescription,
} from "../services/prescriptionService.js";
import { extractMedicationsFromPrescription } from "../services/prescriptionExtractorService.js";
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

    if (!medications?.length && prescription.fileUrl) {
      extractMedicationsFromPrescription(prescription.fileUrl, prescription.id).catch((err) =>
        console.warn("Medication extraction failed:", err)
      );
    }
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

export async function extractMedications(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const prescription = await getPrescription(req.params.id as string, patientId);

    if (!prescription.fileUrl) {
      res.status(400).json({ error: "Prescription has no file to extract from" });
      return;
    }

    const extractedMeds = await extractMedicationsFromPrescription(prescription.fileUrl, prescription.id);
    res.json({ success: true, data: extractedMeds });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Prescription not found") {
      res.status(404).json({ error: message });
    } else if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED") || message.includes("quota")) {
      res.status(429).json({ error: "AI service rate limited. Please try again later." });
    } else {
      res.status(500).json({ error: "Failed to extract medications" });
    }
  }
}

export async function addMedication(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const { name, dosage, frequency, duration } = req.body;
  if (
    typeof name !== "string" || !name ||
    typeof dosage !== "string" || !dosage ||
    typeof frequency !== "string" || !frequency ||
    typeof duration !== "string" || !duration
  ) {
    res.status(400).json({ error: "name, dosage, frequency, and duration are required as strings" });
    return;
  }

  try {
    const prescription = await getPrescription(req.params.id as string, patientId);

    const medication = await prisma.medication.create({
      data: {
        prescriptionId: prescription.id,
        name,
        dosage,
        frequency,
        duration,
      },
    });

    res.status(201).json({ success: true, data: medication });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Prescription not found") {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to add medication" });
    }
  }
}

export async function removeMedication(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const medication = await prisma.medication.findUnique({
      where: { id: req.params.medId as string },
      include: { prescription: true },
    });

    if (!medication || medication.prescription.patientId !== patientId) {
      res.status(404).json({ error: "Medication not found" });
      return;
    }

    await prisma.medication.delete({ where: { id: medication.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete medication" });
  }
}
