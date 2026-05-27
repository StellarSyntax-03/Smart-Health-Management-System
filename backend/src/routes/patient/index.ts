import { Router, Request, Response } from "express";
import { registerPatient, loginPatient } from "../../services/patientService.js";
import { generateToken } from "../../services/auth.js";
import { authenticate, authorize, AuthRequest } from "../../middleware/auth.js";
import prisma from "../../config/database.js";

const router = Router();

const EXPECTED_ERRORS = ["Email already registered", "Invalid email or password"];

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name, phone, age, gender, bloodGroup, address, allergies, chronicConditions } = req.body;

  if (email == null || password == null || name == null || age == null || gender == null) {
    res.status(400).json({ error: "Missing required fields: email, password, name, age, gender" });
    return;
  }

  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const validGenders = ["male", "female", "other"];
  if (!validGenders.includes(gender)) {
    res.status(400).json({ error: "Gender must be male, female, or other" });
    return;
  }

  const parsedAge = Number(age);
  if (!Number.isFinite(parsedAge) || parsedAge < 0 || parsedAge > 150 || !Number.isInteger(parsedAge)) {
    res.status(400).json({ error: "Age must be a valid integer between 0 and 150" });
    return;
  }

  if (allergies != null && (!Array.isArray(allergies) || !allergies.every((a: unknown) => typeof a === "string"))) {
    res.status(400).json({ error: "Allergies must be an array of strings" });
    return;
  }

  if (chronicConditions != null && (!Array.isArray(chronicConditions) || !chronicConditions.every((c: unknown) => typeof c === "string"))) {
    res.status(400).json({ error: "Chronic conditions must be an array of strings" });
    return;
  }

  try {
    const user = await registerPatient({
      email,
      password,
      name,
      phone,
      age: parsedAge,
      gender,
      bloodGroup,
      address,
      allergies,
      chronicConditions,
    });

    const token = generateToken({ userId: user.id, role: user.role });

    res.status(201).json({
      success: true,
      data: { user, token },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    if (message === "Email already registered") {
      res.status(409).json({ error: message });
    } else {
      res.status(500).json({ error: "Registration failed" });
    }
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const user = await loginPatient(email, password);
    const token = generateToken({ userId: user.id, role: user.role });

    res.json({
      success: true,
      data: { user, token },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (EXPECTED_ERRORS.includes(message)) {
      res.status(401).json({ error: message });
    } else {
      res.status(500).json({ error: "Login failed" });
    }
  }
});

router.get("/profile", authenticate, authorize("patient"), async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
        patient: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
