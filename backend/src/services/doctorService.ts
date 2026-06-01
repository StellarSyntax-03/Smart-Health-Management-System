import prisma from "../config/database.js";
import { hashPassword, comparePassword } from "./auth.js";
import { sendDoctorApprovalEmail } from "./emailService.js";

interface RegisterDoctorInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  specialization: string;
  licenseNumber: string;
  qualification?: string;
  experience?: number;
  clinicName?: string;
  clinicAddress?: string;
  bio?: string;
}

export async function registerDoctor(input: RegisterDoctorInput) {
  const hashedPassword = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: "doctor",
        phone: input.phone,
        doctor: {
          create: {
            specialization: input.specialization,
            licenseNumber: input.licenseNumber,
            qualification: input.qualification,
            experience: input.experience,
            clinicName: input.clinicName,
            clinicAddress: input.clinicAddress,
            bio: input.bio,
          },
        },
      },
      include: { doctor: true },
    });

    sendDoctorApprovalEmail({
      id: user.doctor!.id,
      user: { name: user.name, email: user.email },
      specialization: user.doctor!.specialization,
      licenseNumber: user.doctor!.licenseNumber,
      qualification: user.doctor!.qualification,
      experience: user.doctor!.experience,
      clinicName: user.doctor!.clinicName,
      clinicAddress: user.doctor!.clinicAddress,
      bio: user.doctor!.bio,
    }).catch((err) => console.warn("Failed to send approval email:", err));

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

export async function loginDoctor(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { doctor: true },
  });

  if (!user || user.role !== "doctor") {
    throw new Error("Invalid email or password");
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  if (!user.doctor?.approved) {
    throw new Error("Your account is pending approval.");
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function approveDoctor(doctorId: string) {
  return prisma.doctor.update({
    where: { id: doctorId },
    data: { approved: true },
  });
}

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  createdAt: true,
  doctor: true,
} as const;

export async function getDoctorProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });

  if (!user || user.role !== "doctor") return null;
  return user;
}

interface UpdateDoctorInput {
  name?: string;
  phone?: string | null;
  specialization?: string;
  licenseNumber?: string;
  qualification?: string;
  experience?: number;
  clinicName?: string | null;
  clinicAddress?: string | null;
  bio?: string | null;
}

export async function updateDoctorProfile(userId: string, input: UpdateDoctorInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { doctor: true },
  });

  if (!user || user.role !== "doctor" || !user.doctor) {
    throw new Error("Doctor not found");
  }

  const { name, phone, ...doctorFields } = input;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      doctor: {
        update: {
          ...(doctorFields.specialization !== undefined && { specialization: doctorFields.specialization }),
          ...(doctorFields.licenseNumber !== undefined && { licenseNumber: doctorFields.licenseNumber }),
          ...(doctorFields.qualification !== undefined && { qualification: doctorFields.qualification }),
          ...(doctorFields.experience !== undefined && { experience: doctorFields.experience }),
          ...(doctorFields.clinicName !== undefined && { clinicName: doctorFields.clinicName }),
          ...(doctorFields.clinicAddress !== undefined && { clinicAddress: doctorFields.clinicAddress }),
          ...(doctorFields.bio !== undefined && { bio: doctorFields.bio }),
        },
      },
    },
    select: PROFILE_SELECT,
  });

  return updated;
}
