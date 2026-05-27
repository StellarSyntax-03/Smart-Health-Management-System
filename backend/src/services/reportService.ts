import prisma from "../config/database.js";
import { uploadFile, deleteFile, getResourceType } from "./cloudinaryService.js";
import { ReportType } from "../generated/prisma/client.js";

interface CreateReportInput {
  patientId: string;
  file: { buffer: Buffer; originalname: string; mimetype: string };
  name: string;
}

function detectReportType(mimetype: string): ReportType {
  if (mimetype === "application/pdf") return "pdf";
  return "image";
}

export async function createReport(input: CreateReportInput) {
  const resourceType = getResourceType(input.file.mimetype);
  const folder = `smarthealth/reports/${input.patientId}`;

  const { secureUrl, publicId } = await uploadFile(
    input.file.buffer,
    folder,
    resourceType,
  );

  try {
    return await prisma.medicalReport.create({
      data: {
        patientId: input.patientId,
        name: input.name,
        type: detectReportType(input.file.mimetype),
        url: secureUrl,
        filePublicId: publicId,
      },
    });
  } catch (err) {
    await deleteFile(publicId, resourceType).catch(() => {});
    throw err;
  }
}

export async function listReports(patientId: string) {
  return prisma.medicalReport.findMany({
    where: { patientId },
    orderBy: { date: "desc" },
  });
}

export async function getReport(id: string, patientId: string) {
  const report = await prisma.medicalReport.findUnique({ where: { id } });

  if (!report || report.patientId !== patientId) {
    throw new Error("Report not found");
  }

  return report;
}

export async function deleteReport(id: string, patientId: string) {
  const report = await prisma.medicalReport.findUnique({ where: { id } });

  if (!report || report.patientId !== patientId) {
    throw new Error("Report not found");
  }

  if (report.filePublicId) {
    const resourceType = report.url.includes("/raw/") ? "raw" : "image";
    await deleteFile(report.filePublicId, resourceType);
  }

  await prisma.medicalReport.delete({ where: { id } });
}
