import { Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import {
  initAssessment,
  startAssessment,
  continueAssessment,
  submitAssessment,
  searchSymptoms,
} from "../services/ekaCareService.js";
import prisma from "../config/database.js";

export async function init(req: AuthRequest, res: Response) {
  const patient = await prisma.patient.findUnique({
    where: { userId: req.user!.userId },
  });

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const assessmentId = await initAssessment(patient.gender, patient.age);
    const questions = await startAssessment(assessmentId);
    res.json({ success: true, assessmentId, ...questions });
  } catch (err) {
    console.error("[Assessment] Init error:", err);
    res.status(502).json({ error: "Assessment service unavailable" });
  }
}

export async function answer(req: AuthRequest, res: Response) {
  const { assessmentId, qid, selectedChoices } = req.body;

  if (!assessmentId || qid === undefined || !selectedChoices) {
    res.status(400).json({ error: "assessmentId, qid, and selectedChoices are required" });
    return;
  }

  try {
    const result = await continueAssessment(assessmentId, qid, {
      selected_choices: selectedChoices,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Assessment] Continue error:", err);
    res.status(502).json({ error: "Assessment service unavailable" });
  }
}

export async function symptoms(req: AuthRequest, res: Response) {
  const q = (req.query.q as string || "").trim();
  if (!q) {
    res.json({ success: true, data: [] });
    return;
  }

  const patient = await prisma.patient.findUnique({
    where: { userId: req.user!.userId },
  });

  try {
    const results = await searchSymptoms(q, patient?.gender || "male", patient?.age || 25);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error("[Assessment] Symptom search error:", err);
    res.status(502).json({ error: "Symptom search failed" });
  }
}

export async function submit(req: AuthRequest, res: Response) {
  const { assessmentId } = req.body;

  if (!assessmentId) {
    res.status(400).json({ error: "assessmentId is required" });
    return;
  }

  try {
    const result = await submitAssessment(assessmentId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Assessment] Submit error:", err);
    res.status(502).json({ error: "Assessment service unavailable" });
  }
}
