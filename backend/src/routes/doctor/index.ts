import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { register, login, approve, getProfile, updateProfile } from "../../controllers/doctorController.js";
import { search, sendRequest, listConnected, listSentRequests, patientDetails, removeConnection } from "../../controllers/doctorPatientController.js";
import { addPrescription, addVital, addReport } from "../../controllers/doctorActionsController.js";
import { uploadSingle } from "../../middleware/upload.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/approve/:doctorId", approve);
router.get("/profile", authenticate, authorize("doctor"), getProfile);
router.put("/profile", authenticate, authorize("doctor"), updateProfile);

router.get("/patients/search", authenticate, authorize("doctor"), search);
router.post("/patients/request", authenticate, authorize("doctor"), sendRequest);
router.get("/patients/connected", authenticate, authorize("doctor"), listConnected);
router.get("/patients/requests", authenticate, authorize("doctor"), listSentRequests);
router.get("/patients/:patientId", authenticate, authorize("doctor"), patientDetails);
router.delete("/patients/:patientId", authenticate, authorize("doctor"), removeConnection);

router.post("/patients/:patientId/prescriptions", authenticate, authorize("doctor"), uploadSingle, addPrescription);
router.post("/patients/:patientId/vitals", authenticate, authorize("doctor"), addVital);
router.post("/patients/:patientId/reports", authenticate, authorize("doctor"), uploadSingle, addReport);

export default router;
