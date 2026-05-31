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
  console.log("[Twilio Webhook] === Incoming POST /whatsapp ===");
  console.log("[Twilio Webhook] Body:", JSON.stringify(req.body));
  console.log("[Twilio Webhook] Headers:", JSON.stringify({
    "x-twilio-signature": req.headers["x-twilio-signature"],
    "x-forwarded-proto": req.headers["x-forwarded-proto"],
    "x-forwarded-host": req.headers["x-forwarded-host"],
    host: req.headers["host"],
  }));

  if (env.TWILIO_AUTH_TOKEN) {
    const signature = req.headers["x-twilio-signature"] as string;
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
    const url = `${proto}://${host}${req.originalUrl}`;
    console.log("[Twilio Webhook] Validating signature for URL:", url);
    const valid = twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature || "", url, req.body);
    if (!valid) {
      console.warn("[Twilio Webhook] Signature INVALID - skipping validation in dev");
      if (env.NODE_ENV === "production") {
        res.status(403).send("<Response></Response>");
        return;
      }
    } else {
      console.log("[Twilio Webhook] Signature valid");
    }
  }

  const body = (req.body.Body || "").trim().toLowerCase();
  const from = normalizePhone((req.body.From || "").replace("whatsapp:", ""));
  console.log("[Twilio Webhook] Parsed - from:", from, "body:", body);

  if (!from || !body) {
    console.log("[Twilio Webhook] Empty from or body, ignoring");
    res.status(200).send("<Response></Response>");
    return;
  }

  const words = body.split(/\s+/);
  const hasAffirmation = words.some((w: string) => AFFIRMATIONS.has(w));
  if (!hasAffirmation) {
    console.log("[Twilio Webhook] No affirmation found in:", body);
    res.status(200).send("<Response></Response>");
    return;
  }

  try {
    console.log("[Twilio Webhook] Looking for patient with emergency/doctor phone:", from);
    const sosPatients = await prisma.patient.findMany({
      where: { sosEnabled: true },
      include: { user: { select: { name: true } } },
    });

    const patient = sosPatients.find(
      (p) =>
        normalizePhone(p.emergencyContactPhone || "") === from ||
        normalizePhone(p.familyDoctorPhone || "") === from,
    );

    if (!patient) {
      console.log("[Twilio Webhook] No patient found for phone:", from);
      res.status(200).send("<Response></Response>");
      return;
    }

    console.log("[Twilio Webhook] Found patient:", patient.id, patient.user.name);
    const activeAlert = await prisma.sOSAlert.findFirst({
      where: { patientId: patient.id, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    if (!activeAlert) {
      console.log("[Twilio Webhook] No active SOS alert for patient:", patient.id);
      res.status(200).send("<Response></Response>");
      return;
    }
    console.log("[Twilio Webhook] Found active alert:", activeAlert.id);

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
