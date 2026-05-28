import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { register, login, getProfile, updateProfile } from "../../controllers/patientController.js";
import prescriptionRoutes from "./prescriptions.js";
import reportRoutes from "./reports.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticate, authorize("patient"), getProfile);
router.put("/profile", authenticate, authorize("patient"), updateProfile);

router.use("/prescriptions", prescriptionRoutes);
router.use("/reports", reportRoutes);

export default router;
