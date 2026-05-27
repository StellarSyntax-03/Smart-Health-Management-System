import { Router, Request, Response } from "express";
import { registerPatient, loginPatient } from "../../services/patientService.js";
import { generateToken } from "../../services/auth.js";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name, phone, age, gender, bloodGroup, address, allergies, chronicConditions } = req.body;

  if (!email || !password || !name || !age || !gender) {
    res.status(400).json({ error: "Missing required fields: email, password, name, age, gender" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const validGenders = ["male", "female", "other"];
  if (!validGenders.includes(gender)) {
    res.status(400).json({ error: "Gender must be male, female, or other" });
    return;
  }

  try {
    const user = await registerPatient({
      email,
      password,
      name,
      phone,
      age: Number(age),
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
    const status = message === "Email already registered" ? 409 : 500;
    res.status(status).json({ error: message });
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
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(401).json({ error: message });
  }
});

export default router;
