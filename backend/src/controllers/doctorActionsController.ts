import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import prisma from "../config/database.js";
import { hasAccess } from "../services/doctorPatientService.js";
import { createPrescription } from "../services/prescriptionService.js";
import { createVital, isValidVitalType } from "../services/vitalService.js";
import { createReport } from "../services/reportService.js";

async function resolveDoctorId(userId: string): Promise<string | null> {
  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  return doctor?.id ?? null;
}

async function verifyAccess(userId: string, patientId: string): Promise<string | null> {
  const doctorId = await resolveDoctorId(userId);
  if (!doctorId) return null;
  const authorized = await hasAccess(doctorId, patientId);
  return authorized ? doctorId : null;
}

export async function addPrescription(req: AuthRequest, res: Response) {
  const patientId = req.params.patientId as string;

  const doctorId = await verifyAccess(req.user!.userId, patientId);
  if (!doctorId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  let medications: { name: string; dosage: string; frequency: string; duration: string }[] | undefined;
  if (req.body.medications) {
    try {
      medications = typeof req.body.medications === "string"
        ? JSON.parse(req.body.medications)
        : req.body.medications;
    } catch {
      res.status(400).json({ error: "Invalid medications format" });
      return;
    }
  }

  if (!req.file && (!medications || medications.length === 0)) {
    res.status(400).json({ error: "Provide a prescription file or medications" });
    return;
  }

  try {
    let result;

    if (req.file) {
      result = await createPrescription({
        patientId,
        file: req.file,
        notes: req.body.notes,
        medications,
      });
    } else {
      result = await prisma.prescription.create({
        data: {
          patientId,
          notes: req.body.notes,
          ...(medications?.length && {
            medications: { create: medications },
          }),
        },
        include: { medications: true },
      });
    }

    await prisma.prescription.update({
      where: { id: result.id },
      data: { doctorId },
    });

    res.status(201).json({ success: true, data: result });
  } catch {
    res.status(500).json({ error: "Failed to create prescription" });
  }
}

export async function addVital(req: AuthRequest, res: Response) {
  const patientId = req.params.patientId as string;

  const doctorId = await verifyAccess(req.user!.userId, patientId);
  if (!doctorId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const { type, value, unit } = req.body;
  if (!type || !value || !unit) {
    res.status(400).json({ error: "type, value, and unit are required" });
    return;
  }

  if (!isValidVitalType(type)) {
    res.status(400).json({ error: "Invalid vital type" });
    return;
  }

  try {
    const vital = await createVital(patientId, { type, value, unit });
    res.status(201).json({ success: true, data: vital });
  } catch {
    res.status(500).json({ error: "Failed to add vital" });
  }
}

export async function addReport(req: AuthRequest, res: Response) {
  const patientId = req.params.patientId as string;

  const doctorId = await verifyAccess(req.user!.userId, patientId);
  if (!doctorId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "File is required" });
    return;
  }

  const name = req.body.name?.trim();
  if (!name) {
    res.status(400).json({ error: "Report name is required" });
    return;
  }

  try {
    const report = await createReport({ patientId, file: req.file, name });
    res.status(201).json({ success: true, data: report });
  } catch {
    res.status(500).json({ error: "Failed to upload report" });
  }
}
