import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { register, login, getProfile, updateProfile } from "../../controllers/patientController.js";
import prescriptionRoutes from "./prescriptions.js";
import reportRoutes from "./reports.js";
import vitalRoutes from "./vitals.js";
import medicationRoutes from "./medications.js";
import sosRoutes from "./sos.js";
import drugRoutes from "./drugs.js";
import assessmentRoutes from "./assessment.js";
import { codifyProfile } from "../../controllers/ekaCareController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticate, authorize("patient"), getProfile);
router.put("/profile", authenticate, authorize("patient"), updateProfile);

router.use("/prescriptions", prescriptionRoutes);
router.use("/reports", reportRoutes);
router.use("/vitals", vitalRoutes);
router.use("/medications", medicationRoutes);
router.use("/sos", sosRoutes);
router.use("/drugs", drugRoutes);
router.use("/assessment", assessmentRoutes);
router.post("/codify", authenticate, authorize("patient"), codifyProfile);

export default router;
