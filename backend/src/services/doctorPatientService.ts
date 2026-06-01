import prisma from "../config/database.js";

export async function searchPatients(query: string) {
  const users = await prisma.user.findMany({
    where: {
      role: "patient",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      patient: {
        select: {
          id: true,
          age: true,
          gender: true,
        },
      },
    },
    take: 20,
  });

  return users;
}

export async function sendConnectionRequest(doctorId: string, patientId: string) {
  const existing = await prisma.doctorPatient.findUnique({
    where: { doctorId_patientId: { doctorId, patientId } },
  });

  if (existing) {
    if (existing.status === "rejected") {
      return prisma.doctorPatient.update({
        where: { id: existing.id },
        data: { status: "pending" },
      });
    }
    if (existing.status === "pending") {
      throw new Error("Connection request already pending");
    }
    if (existing.status === "approved") {
      throw new Error("Already connected to this patient");
    }
  }

  return prisma.doctorPatient.create({
    data: { doctorId, patientId, status: "pending" },
  });
}

export async function getPendingRequests(patientId: string) {
  return prisma.doctorPatient.findMany({
    where: { patientId, status: "pending" },
    include: {
      doctor: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });
}

export async function approveRequest(requestId: string, patientId: string) {
  const request = await prisma.doctorPatient.findUnique({
    where: { id: requestId },
  });

  if (!request || request.patientId !== patientId) {
    throw new Error("Request not found");
  }

  if (request.status !== "pending") {
    throw new Error("Request is not pending");
  }

  return prisma.doctorPatient.update({
    where: { id: requestId },
    data: { status: "approved" },
  });
}

export async function rejectRequest(requestId: string, patientId: string) {
  const request = await prisma.doctorPatient.findUnique({
    where: { id: requestId },
  });

  if (!request || request.patientId !== patientId) {
    throw new Error("Request not found");
  }

  if (request.status !== "pending") {
    throw new Error("Request is not pending");
  }

  return prisma.doctorPatient.update({
    where: { id: requestId },
    data: { status: "rejected" },
  });
}

export async function getSentRequests(doctorId: string) {
  return prisma.doctorPatient.findMany({
    where: { doctorId },
    select: {
      patientId: true,
      status: true,
    },
  });
}

export async function getConnectedPatients(doctorId: string) {
  return prisma.doctorPatient.findMany({
    where: { doctorId, status: "approved" },
    include: {
      patient: {
        include: {
          user: {
            select: { name: true, email: true, phone: true },
          },
        },
      },
    },
  });
}

export async function removePatient(doctorId: string, patientId: string) {
  const record = await prisma.doctorPatient.findUnique({
    where: { doctorId_patientId: { doctorId, patientId } },
  });

  if (!record) {
    throw new Error("Connection not found");
  }

  return prisma.doctorPatient.delete({
    where: { id: record.id },
  });
}

export async function hasAccess(doctorId: string, patientId: string): Promise<boolean> {
  const record = await prisma.doctorPatient.findUnique({
    where: { doctorId_patientId: { doctorId, patientId } },
  });

  return record?.status === "approved";
}

export async function getPatientDetails(doctorId: string, patientId: string) {
  const authorized = await hasAccess(doctorId, patientId);
  if (!authorized) {
    throw new Error("Access denied");
  }

  return prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      vitals: {
        orderBy: { recordedAt: "desc" },
        take: 10,
      },
      prescriptions: {
        include: { medications: true },
        orderBy: { date: "desc" },
      },
      reports: {
        orderBy: { date: "desc" },
      },
      records: {
        orderBy: { date: "desc" },
      },
    },
  });
}

export async function getPendingRequestCount(patientId: string): Promise<number> {
  return prisma.doctorPatient.count({ where: { patientId, status: "pending" } });
}
