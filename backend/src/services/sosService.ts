import prisma from "../config/database.js";
import { sendWhatsApp, buildSOSMessage } from "./whatsappService.js";

interface SOSSetupInput {
  emergencyContactName: string;
  emergencyContactPhone: string;
  familyDoctorName: string;
  familyDoctorPhone: string;
}

export async function setupSOS(patientId: string, input: SOSSetupInput) {
  return prisma.patient.update({
    where: { id: patientId },
    data: {
      sosEnabled: true,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: input.emergencyContactPhone,
      familyDoctorName: input.familyDoctorName,
      familyDoctorPhone: input.familyDoctorPhone,
    },
  });
}

export async function disableSOS(patientId: string) {
  return prisma.patient.update({
    where: { id: patientId },
    data: { sosEnabled: false },
  });
}

export async function getSOSConfig(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      sosEnabled: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      familyDoctorName: true,
      familyDoctorPhone: true,
    },
  });
  return patient;
}

export async function createAlert(patientId: string, latitude?: number, longitude?: number) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { user: { select: { name: true } } },
  });

  if (!patient?.sosEnabled) {
    throw new Error("SOS is not enabled. Please set up emergency contacts first.");
  }

  const alert = await prisma.sOSAlert.create({
    data: {
      patientId,
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
    },
  });

  const message = buildSOSMessage(patient.user.name, latitude, longitude);

  const notifications: Promise<boolean>[] = [];

  if (patient.emergencyContactPhone) {
    notifications.push(
      sendWhatsApp(patient.emergencyContactPhone, message),
    );
  }

  if (patient.familyDoctorPhone) {
    notifications.push(
      sendWhatsApp(patient.familyDoctorPhone, message),
    );
  }

  const results = await Promise.allSettled(notifications);
  const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;

  return { alert, notificationsSent: sent, notificationsTotal: notifications.length };
}

export async function listAlerts(patientId: string) {
  return prisma.sOSAlert.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelAlert(alertId: string, patientId: string) {
  const existing = await prisma.sOSAlert.findUnique({ where: { id: alertId } });

  if (!existing || existing.patientId !== patientId) {
    return null;
  }

  return prisma.sOSAlert.update({
    where: { id: alertId },
    data: { status: "cancelled" },
  });
}

export async function getActiveAlert(patientId: string) {
  return prisma.sOSAlert.findFirst({
    where: { patientId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}
