import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { uploadSingle } from "../../middleware/upload.js";
import { create, list, getOne, remove, extractMedications, addMedication, removeMedication } from "../../controllers/prescriptionController.js";

const router = Router();

router.use(authenticate, authorize("patient"));

router.post("/", uploadSingle, create);
router.get("/", list);
router.get("/:id", getOne);
router.delete("/:id", remove);

router.post("/:id/extract", extractMedications);
router.post("/:id/medications", addMedication);
router.delete("/:prescriptionId/medications/:medId", removeMedication);

export default router;
