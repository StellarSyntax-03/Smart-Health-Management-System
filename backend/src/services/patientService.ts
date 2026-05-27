import prisma from "../config/database.js";
import { hashPassword, comparePassword } from "./auth.js";
import { Gender } from "../generated/prisma/client.js";

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
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await hashPassword(input.password);

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

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
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
