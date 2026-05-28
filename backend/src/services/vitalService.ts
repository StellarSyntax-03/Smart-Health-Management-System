import prisma from "../config/database.js";

const VALID_TYPES = ["blood_pressure", "heart_rate", "temperature", "spo2", "blood_sugar", "weight"] as const;
export type VitalType = (typeof VALID_TYPES)[number];

export function isValidVitalType(type: string): type is VitalType {
  return (VALID_TYPES as readonly string[]).includes(type);
}

interface CreateVitalInput {
  type: string;
  value: string;
  unit: string;
  recordedAt?: Date;
}

export async function createVital(patientId: string, data: CreateVitalInput) {
  return prisma.vital.create({
    data: {
      patientId,
      type: data.type,
      value: data.value,
      unit: data.unit,
      ...(data.recordedAt && { recordedAt: data.recordedAt }),
    },
  });
}

export async function listVitals(
  patientId: string,
  type?: string,
  from?: Date,
  to?: Date,
) {
  return prisma.vital.findMany({
    where: {
      patientId,
      ...(type && { type }),
      ...((from || to) && {
        recordedAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      }),
    },
    orderBy: { recordedAt: "desc" },
  });
}

export async function deleteVital(vitalId: string, patientId: string) {
  const vital = await prisma.vital.findUnique({ where: { id: vitalId } });

  if (!vital || vital.patientId !== patientId) {
    return null;
  }

  await prisma.vital.delete({ where: { id: vitalId } });
  return vital;
}
