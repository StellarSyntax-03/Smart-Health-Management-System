import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.js";
import {
  registerDoctor,
  loginDoctor,
  approveDoctor,
  getDoctorProfile,
  updateDoctorProfile,
} from "../services/doctorService.js";
import { generateToken } from "../services/auth.js";
import { env } from "../config/env.js";

const EXPECTED_ERRORS = [
  "Email already registered",
  "Invalid email or password",
  "Your account is pending approval.",
];

export async function register(req: Request, res: Response) {
  const { email, password, name, phone, specialization, licenseNumber, qualification, experience, clinicName, clinicAddress, bio } = req.body;

  if (email == null || password == null || name == null || specialization == null || licenseNumber == null) {
    res.status(400).json({ error: "Missing required fields: email, password, name, specialization, licenseNumber" });
    return;
  }

  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    await registerDoctor({
      email,
      password,
      name,
      phone,
      specialization,
      licenseNumber,
      qualification,
      experience: experience !== undefined ? Number(experience) : undefined,
      clinicName,
      clinicAddress,
      bio,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful. Your account is pending approval.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    if (message === "Email already registered") {
      res.status(409).json({ error: message });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const user = await loginDoctor(email, password);
    const token = generateToken({ userId: user.id, role: user.role });

    res.json({
      success: true,
      data: { user, token },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Your account is pending approval.") {
      res.status(403).json({ error: message });
    } else if (EXPECTED_ERRORS.includes(message)) {
      res.status(401).json({ error: message });
    } else {
      res.status(500).json({ error: "Login failed" });
    }
  }
}

export async function approve(req: Request, res: Response) {
  const doctorId = req.params.doctorId as string;
  const secret = req.query.secret as string | undefined;

  if (!secret || secret !== env.JWT_SECRET) {
    res.status(403).send("<html><body><h1>Unauthorized</h1></body></html>");
    return;
  }

  try {
    await approveDoctor(doctorId);
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0fdf4;">
          <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #16a34a;">Doctor Approved Successfully!</h1>
            <p style="color: #4b5563;">The doctor can now log in to their account.</p>
          </div>
        </body>
      </html>
    `);
  } catch {
    res.status(500).send("<html><body><h1>Approval failed</h1></body></html>");
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const user = await getDoctorProfile(req.user!.userId);

    if (!user) {
      res.status(404).json({ error: "Doctor not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const { name, phone, specialization, licenseNumber, qualification, experience, clinicName, clinicAddress, bio } = req.body;

  try {
    const updated = await updateDoctorProfile(req.user!.userId, {
      name,
      phone,
      specialization,
      licenseNumber,
      qualification,
      experience: experience !== undefined ? Number(experience) : undefined,
      clinicName,
      clinicAddress,
      bio,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "Doctor not found") {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
}
