import prisma from "../config/database.js";

const FREQUENCY_SLOTS: Record<string, string[]> = {
  "Once daily": ["morning"],
  "Twice daily": ["morning", "evening"],
  "Three times daily": ["morning", "afternoon", "evening"],
  "Four times daily": ["morning", "afternoon", "evening", "night"],
};

function getTimeSlotsForFrequency(frequency: string): string[] {
  return FREQUENCY_SLOTS[frequency] ?? ["morning"];
}

function getTodayIST(): Date {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const year = istTime.getUTCFullYear();
  const month = istTime.getUTCMonth();
  const day = istTime.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

export async function getTodaySchedule(patientId: string) {
  const today = getTodayIST();

  const medications = await prisma.medication.findMany({
    where: {
      prescription: { patientId },
    },
    include: {
      prescription: { select: { date: true, notes: true } },
    },
  });

  for (const med of medications) {
    const slots = getTimeSlotsForFrequency(med.frequency);
    for (const slot of slots) {
      await prisma.medicationLog.upsert({
        where: {
          medicationId_date_timeSlot: {
            medicationId: med.id,
            date: today,
            timeSlot: slot,
          },
        },
        update: {},
        create: {
          medicationId: med.id,
          date: today,
          timeSlot: slot,
        },
      });
    }
  }

  return prisma.medication.findMany({
    where: {
      prescription: { patientId },
    },
    include: {
      logs: {
        where: { date: today },
        orderBy: { timeSlot: "asc" },
      },
      prescription: { select: { date: true, notes: true } },
    },
  });
}

export async function toggleDose(logId: string, patientId: string) {
  const log = await prisma.medicationLog.findUnique({
    where: { id: logId },
    include: {
      medication: {
        include: {
          prescription: { select: { patientId: true } },
        },
      },
    },
  });

  if (!log || log.medication.prescription.patientId !== patientId) {
    return null;
  }

  const nowTaken = !log.taken;

  return prisma.medicationLog.update({
    where: { id: logId },
    data: {
      taken: nowTaken,
      takenAt: nowTaken ? new Date() : null,
    },
  });
}

export async function getAdherence(patientId: string, days: number) {
  const today = getTodayIST();
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);

  const logs = await prisma.medicationLog.findMany({
    where: {
      medication: {
        prescription: { patientId },
      },
      date: {
        gte: startDate,
        lte: today,
      },
    },
  });

  const total = logs.length;
  const taken = logs.filter((l) => l.taken).length;
  const missed = total - taken;
  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

  return { total, taken, missed, percentage };
}
