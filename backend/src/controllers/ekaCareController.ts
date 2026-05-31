import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import { searchDrugs, codifyEntities } from "../services/ekaCareService.js";
import prisma from "../config/database.js";

export async function drugSearch(req: Request, res: Response) {
  const q = (req.query.q as string || "").trim();
  if (!q) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);

  try {
    const results = await searchDrugs(q, limit);
    res.json({ results });
  } catch (err) {
    console.error("[EkaCare] Drug search error:", err);
    res.status(502).json({ error: "Drug search service unavailable" });
  }
}

export async function codifyProfile(req: AuthRequest, res: Response) {
  const patient = await prisma.patient.findUnique({
    where: { userId: req.user!.userId },
  });

  if (!patient) {
    res.status(404).json({ error: "Patient not found" });
    return;
  }

  try {
    const [codifiedAllergies, codifiedConditions] = await Promise.all([
      patient.allergies.length ? codifyEntities(patient.allergies) : Promise.resolve([]),
      patient.chronicConditions.length ? codifyEntities(patient.chronicConditions) : Promise.resolve([]),
    ]);

    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        codifiedAllergies: codifiedAllergies as any,
        codifiedConditions: codifiedConditions as any,
      },
    });

    res.json({ success: true, data: { codifiedAllergies, codifiedConditions } });
  } catch (err) {
    console.error("[EkaCare] Codification error:", err);
    res.status(502).json({ error: "Medical codification service unavailable" });
  }
}
