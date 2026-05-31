import prisma from "../config/database.js";
import { hashPassword, comparePassword } from "./auth.js";
import { Gender } from "../generated/prisma/client.js";
import { codifyEntities } from "./ekaCareService.js";

interface RegisterPatientInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  age: number;
  gender: Gender;
  bloodGroup?: string;
  address?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

export async function registerPatient(input: RegisterPatientInput) {
  const hashedPassword = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: "patient",
        phone: input.phone,
        patient: {
          create: {
            age: input.age,
            gender: input.gender,
            bloodGroup: input.bloodGroup,
            address: input.address,
            allergies: input.allergies || [],
            chronicConditions: input.chronicConditions || [],
          },
        },
      },
      include: { patient: true },
    });

    if (input.allergies?.length || input.chronicConditions?.length) {
      codifyPatientEntities(user.patient!.id, input.allergies, input.chronicConditions).catch((err) =>
        console.warn("Medical codification failed:", err),
      );
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (err: unknown) {
    if (
      typeof err === "object" && err !== null && "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new Error("Email already registered", { cause: err });
    }
    throw new Error("Registration failed", { cause: err });
  }
}

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  createdAt: true,
  patient: true,
} as const;

export async function getPatientProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });

  if (!user || user.role !== "patient") return null;
  return user;
}

interface UpdatePatientInput {
  name?: string;
  phone?: string | null;
  age?: number;
  gender?: Gender;
  bloodGroup?: string | null;
  address?: string | null;
  allergies?: string[];
  chronicConditions?: string[];
}

export async function updatePatientProfile(userId: string, input: UpdatePatientInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { patient: true },
  });

  if (!user || user.role !== "patient" || !user.patient) {
    throw new Error("Patient not found");
  }

  const { name, phone, ...patientFields } = input;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      patient: {
        update: {
          ...(patientFields.age !== undefined && { age: patientFields.age }),
          ...(patientFields.gender !== undefined && { gender: patientFields.gender }),
          ...(patientFields.bloodGroup !== undefined && { bloodGroup: patientFields.bloodGroup }),
          ...(patientFields.address !== undefined && { address: patientFields.address }),
          ...(patientFields.allergies !== undefined && { allergies: patientFields.allergies }),
          ...(patientFields.chronicConditions !== undefined && { chronicConditions: patientFields.chronicConditions }),
        },
      },
    },
    select: PROFILE_SELECT,
  });

  if (patientFields.allergies || patientFields.chronicConditions) {
    codifyPatientEntities(user.patient!.id, patientFields.allergies, patientFields.chronicConditions).catch((err) =>
      console.warn("Medical codification failed:", err),
    );
  }

  return updated;
}

async function codifyPatientEntities(
  patientId: string,
  allergies?: string[],
  conditions?: string[],
) {
  const updates: Record<string, any> = {};

  if (allergies?.length) {
    updates.codifiedAllergies = await codifyEntities(allergies);
  }
  if (conditions?.length) {
    updates.codifiedConditions = await codifyEntities(conditions);
  }

  if (Object.keys(updates).length > 0) {
    await prisma.patient.update({
      where: { id: patientId },
      data: updates,
    });
  }
}

export async function loginPatient(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { patient: true },
  });

  if (!user || user.role !== "patient") {
    throw new Error("Invalid email or password");
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
