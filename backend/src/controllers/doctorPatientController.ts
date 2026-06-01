import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import prisma from "../config/database.js";
import {
  searchPatients,
  sendConnectionRequest,
  getConnectedPatients,
  getSentRequests,
  removePatient,
  getPatientDetails,
  getPendingRequests,
  getPendingRequestCount,
  approveRequest,
  rejectRequest,
} from "../services/doctorPatientService.js";

async function resolveDoctorId(userId: string): Promise<string | null> {
  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  return doctor?.id ?? null;
}

async function resolvePatientId(userId: string): Promise<string | null> {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  return patient?.id ?? null;
}

export async function search(req: AuthRequest, res: Response) {
  const q = req.query.q as string;
  if (!q || q.trim().length === 0) {
    res.status(400).json({ error: "Query parameter q is required" });
    return;
  }

  try {
    const doctorId = await resolveDoctorId(req.user!.userId);
    if (!doctorId) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    const results = await searchPatients(q.trim());
    res.json({ success: true, data: results });
  } catch {
    res.status(500).json({ error: "Failed to search patients" });
  }
}

export async function sendRequest(req: AuthRequest, res: Response) {
  const { patientId } = req.body;
  if (!patientId) {
    res.status(400).json({ error: "patientId is required" });
    return;
  }

  try {
    const doctorId = await resolveDoctorId(req.user!.userId);
    if (!doctorId) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    const result = await sendConnectionRequest(doctorId, patientId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Connection request already pending" || message === "Already connected to this patient") {
      res.status(409).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to send connection request" });
    }
  }
}

export async function listConnected(req: AuthRequest, res: Response) {
  try {
    const doctorId = await resolveDoctorId(req.user!.userId);
    if (!doctorId) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    const patients = await getConnectedPatients(doctorId);
    res.json({ success: true, data: patients });
  } catch {
    res.status(500).json({ error: "Failed to fetch connected patients" });
  }
}

export async function listSentRequests(req: AuthRequest, res: Response) {
  try {
    const doctorId = await resolveDoctorId(req.user!.userId);
    if (!doctorId) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    const requests = await getSentRequests(doctorId);
    res.json({ success: true, data: requests });
  } catch {
    res.status(500).json({ error: "Failed to fetch sent requests" });
  }
}

export async function removeConnection(req: AuthRequest, res: Response) {
  const patientId = req.params.patientId as string;

  try {
    const doctorId = await resolveDoctorId(req.user!.userId);
    if (!doctorId) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    await removePatient(doctorId, patientId);
    res.json({ success: true, message: "Connection removed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Connection not found") {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to remove connection" });
    }
  }
}

export async function patientDetails(req: AuthRequest, res: Response) {
  const patientId = req.params.patientId as string;

  try {
    const doctorId = await resolveDoctorId(req.user!.userId);
    if (!doctorId) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    const patient = await getPatientDetails(doctorId, patientId);
    if (!patient) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }

    res.json({ success: true, data: patient });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Access denied") {
      res.status(403).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to fetch patient details" });
    }
  }
}

export async function pendingRequests(req: AuthRequest, res: Response) {
  try {
    const patientId = await resolvePatientId(req.user!.userId);
    if (!patientId) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }

    const requests = await getPendingRequests(patientId);
    res.json({ success: true, data: requests });
  } catch {
    res.status(500).json({ error: "Failed to fetch pending requests" });
  }
}

export async function pendingCount(req: AuthRequest, res: Response) {
  try {
    const patientId = await resolvePatientId(req.user!.userId);
    if (!patientId) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }

    const count = await getPendingRequestCount(patientId);
    res.json({ success: true, data: { count } });
  } catch {
    res.status(500).json({ error: "Failed to fetch pending count" });
  }
}

export async function approveReq(req: AuthRequest, res: Response) {
  const requestId = req.params.requestId as string;

  try {
    const patientId = await resolvePatientId(req.user!.userId);
    if (!patientId) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }

    const result = await approveRequest(requestId, patientId);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Request not found") {
      res.status(404).json({ error: message });
    } else if (message === "Request is not pending") {
      res.status(409).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to approve request" });
    }
  }
}

export async function rejectReq(req: AuthRequest, res: Response) {
  const requestId = req.params.requestId as string;

  try {
    const patientId = await resolvePatientId(req.user!.userId);
    if (!patientId) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }

    const result = await rejectRequest(requestId, patientId);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Request not found") {
      res.status(404).json({ error: message });
    } else if (message === "Request is not pending") {
      res.status(409).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to reject request" });
    }
  }
}
