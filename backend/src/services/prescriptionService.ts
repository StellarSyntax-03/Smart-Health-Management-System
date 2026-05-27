import prisma from "../config/database.js";
import { uploadFile, deleteFile, getResourceType } from "./cloudinaryService.js";

interface CreatePrescriptionInput {
  patientId: string;
  file: { buffer: Buffer; originalname: string; mimetype: string };
  notes?: string;
  medications?: { name: string; dosage: string; frequency: string; duration: string }[];
}

export async function createPrescription(input: CreatePrescriptionInput) {
  const resourceType = getResourceType(input.file.mimetype);
  const folder = `smarthealth/prescriptions/${input.patientId}`;

  const { secureUrl, publicId } = await uploadFile(
    input.file.buffer,
    folder,
    resourceType,
  );

  try {
    return await prisma.prescription.create({
      data: {
        patientId: input.patientId,
        notes: input.notes,
        fileUrl: secureUrl,
        fileName: input.file.originalname,
        filePublicId: publicId,
        ...(input.medications?.length && {
          medications: {
            create: input.medications,
          },
        }),
      },
      include: { medications: true },
    });
  } catch (err) {
    await deleteFile(publicId, resourceType).catch(() => {});
    throw err;
  }
}

export async function listPrescriptions(patientId: string) {
  return prisma.prescription.findMany({
    where: { patientId },
    include: { medications: true },
    orderBy: { date: "desc" },
  });
}

export async function getPrescription(id: string, patientId: string) {
  const prescription = await prisma.prescription.findUnique({
    where: { id },
    include: { medications: true },
  });

  if (!prescription || prescription.patientId !== patientId) {
    throw new Error("Prescription not found");
  }

  return prescription;
}

export async function deletePrescription(id: string, patientId: string) {
  const prescription = await prisma.prescription.findUnique({
    where: { id },
  });

  if (!prescription || prescription.patientId !== patientId) {
    throw new Error("Prescription not found");
  }

  if (prescription.filePublicId) {
    const resourceType = prescription.fileUrl?.includes("/raw/") ? "raw" : "image";
    await deleteFile(prescription.filePublicId, resourceType);
  }

  await prisma.prescription.delete({ where: { id } });
}
