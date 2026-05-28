import { Router, Request, Response } from "express";
import prisma from "../../config/database.js";

const router = Router();

const AFFIRMATIONS = new Set([
  "ok", "okay", "yes", "coming", "on my way", "omw", "noted",
  "haan", "theek", "theek hai", "aa raha", "aa rahi", "ha", "ji",
]);

router.post("/whatsapp", async (req: Request, res: Response) => {
  const body = (req.body.Body || "").trim().toLowerCase();
  const from = (req.body.From || "").replace("whatsapp:", "").replace(/\s/g, "");

  if (!from || !body) {
    res.status(200).send("<Response></Response>");
    return;
  }

  const isAffirmative = AFFIRMATIONS.has(body);

  if (!isAffirmative) {
    res.status(200).send("<Response></Response>");
    return;
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { emergencyContactPhone: { contains: from.slice(-10) } },
          { familyDoctorPhone: { contains: from.slice(-10) } },
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
      patient.emergencyContactPhone?.includes(from.slice(-10))
        ? patient.emergencyContactName
        : patient.familyDoctorName;

    const twiml = `<Response><Message>Thank you ${responderName}. The SOS alert for ${patient.user.name} has been marked as resolved.</Message></Response>`;
    res.type("text/xml").status(200).send(twiml);
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(200).send("<Response></Response>");
  }
});

export default router;
