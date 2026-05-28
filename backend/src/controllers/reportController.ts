import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { REPORT_MIMES } from "../middleware/upload.js";
import { createReport, listReports, getReport, deleteReport } from "../services/reportService.js";
import { extractVitalsFromReport } from "../services/vitalExtractorService.js";
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

  if (!REPORT_MIMES.includes(req.file.mimetype)) {
    res.status(400).json({ error: "Reports only accept JPEG, PNG, WebP, or PDF files" });
    return;
  }

  if (!req.body.name || typeof req.body.name !== "string" || !req.body.name.trim()) {
    res.status(400).json({ error: "Report name is required" });
    return;
  }

  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const report = await createReport({
      patientId,
      file: req.file,
      name: req.body.name.trim(),
    });

    if (report.type === "image") {
      extractVitalsFromReport(report.url, patientId).catch((err) =>
        console.warn("Vital extraction failed:", err)
      );
    }

    res.status(201).json({ success: true, data: report });
  } catch {
    res.status(500).json({ error: "Failed to upload report" });
  }
}

export async function list(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const reports = await listReports(patientId);
    res.json({ success: true, data: reports });
  } catch {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
}

export async function getOne(req: AuthRequest, res: Response) {
  const patientId = await resolvePatientId(req.user!.userId);
  if (!patientId) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const report = await getReport(req.params.id as string, patientId);
    res.json({ success: true, data: report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Report not found") {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to fetch report" });
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
    await deleteReport(req.params.id as string, patientId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Report not found") {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to delete report" });
    }
  }
}
