import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import {
  createAlert,
  listAlerts,
  cancelAlert,
  getActiveAlert,
  setupSOS,
  disableSOS,
  getSOSConfig,
} from "../services/sosService.js";
import prisma from "../config/database.js";

async function resolvePatientId(userId: string): Promise<string | null> {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  return patient?.id ?? null;
}

export async function setup(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  const { emergencyContactName, emergencyContactPhone, familyDoctorName, familyDoctorPhone } = req.body;

  if (!emergencyContactName || !emergencyContactPhone || !familyDoctorName || !familyDoctorPhone) {
    res.status(400).json({ error: "All fields are required: emergencyContactName, emergencyContactPhone, familyDoctorName, familyDoctorPhone" });
    return;
  }

  try {
    const patient = await setupSOS(patientId, {
      emergencyContactName,
      emergencyContactPhone,
      familyDoctorName,
      familyDoctorPhone,
    });
    res.json({ success: true, data: patient });
  } catch {
    res.status(500).json({ error: "Failed to setup SOS" });
  }
}

export async function disable(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    await disableSOS(patientId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to disable SOS" });
  }
}

export async function config(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const data = await getSOSConfig(patientId);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ error: "Failed to fetch SOS config" });
  }
}

export async function create(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const { latitude, longitude } = req.body;

    let lat: number | undefined;
    let lng: number | undefined;

    if (latitude !== undefined) {
      lat = parseFloat(latitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        res.status(400).json({ error: "Invalid latitude. Must be between -90 and 90." });
        return;
      }
    }

    if (longitude !== undefined) {
      lng = parseFloat(longitude);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        res.status(400).json({ error: "Invalid longitude. Must be between -180 and 180." });
        return;
      }
    }

    const result = await createAlert(patientId, lat, lng);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create SOS alert";
    res.status(400).json({ error: message });
  }
}

export async function list(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const alerts = await listAlerts(patientId);
    res.json({ success: true, data: alerts });
  } catch {
    res.status(500).json({ error: "Failed to fetch SOS alerts" });
  }
}

export async function cancel(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const result = await cancelAlert(req.params.id as string, patientId);
    if (!result) {
      res.status(404).json({ error: "SOS alert not found" });
      return;
    }
    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ error: "Failed to cancel SOS alert" });
  }
}

export async function active(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const alert = await getActiveAlert(patientId);
    res.json({ success: true, data: alert ?? null });
  } catch {
    res.status(500).json({ error: "Failed to fetch active SOS alert" });
  }
}
