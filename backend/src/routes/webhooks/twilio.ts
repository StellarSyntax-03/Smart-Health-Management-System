import { Router, Request, Response } from "express";
import twilio from "twilio";
import { env } from "../../config/env.js";
import prisma from "../../config/database.js";

const router = Router();

const AFFIRMATIONS = new Set([
  "ok", "okay", "yes", "coming", "on my way", "omw", "noted",
  "haan", "theek", "theek hai", "aa raha", "aa rahi", "ha", "ji",
]);

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^+\d]/g, "");
}

router.post("/whatsapp", async (req: Request, res: Response) => {
  if (env.TWILIO_AUTH_TOKEN) {
    const signature = req.headers["x-twilio-signature"] as string;
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const valid = twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature || "", url, req.body);
    if (!valid) {
      res.status(403).send("<Response></Response>");
      return;
    }
  }

  const body = (req.body.Body || "").trim().toLowerCase();
  const from = normalizePhone((req.body.From || "").replace("whatsapp:", ""));

  if (!from || !body) {
    res.status(200).send("<Response></Response>");
    return;
  }

  if (!AFFIRMATIONS.has(body)) {
    res.status(200).send("<Response></Response>");
    return;
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { emergencyContactPhone: from },
          { familyDoctorPhone: from },
        ],
        sosEnabled: true,
      },
      include: { user: { select: { name: true } } },
    });

    if (!patient) {
      res.status(200).send("<Response></Response>");
      return;
    }

    const activeAlert = await prisma.sOSAlert.findFirst({
      where: { patientId: patient.id, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    if (!activeAlert) {
      res.status(200).send("<Response></Response>");
      return;
    }

    await prisma.sOSAlert.update({
      where: { id: activeAlert.id },
      data: { status: "resolved" },
    });

    const responderName =
      patient.emergencyContactPhone === from
        ? patient.emergencyContactName
        : patient.familyDoctorName;

    const safeName = escapeXml(responderName || "");
    const safePatient = escapeXml(patient.user.name);
    const twiml = `<Response><Message>Thank you ${safeName}. The SOS alert for ${safePatient} has been marked as resolved.</Message></Response>`;
    res.type("text/xml").status(200).send(twiml);
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(200).send("<Response></Response>");
  }
});

export default router;
