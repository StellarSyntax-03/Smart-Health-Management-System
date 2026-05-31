import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { create, list, cancel, active, setup, disable, config, sendPhotos } from "../../controllers/sosController.js";
import { uploadImages } from "../../middleware/upload.js";

const router = Router();

router.use(authenticate, authorize("patient"));

router.get("/config", config);
router.post("/setup", setup);
router.post("/disable", disable);
router.post("/", create);
router.get("/", list);
router.get("/active", active);
router.patch("/:id/cancel", cancel);
router.post("/photos", uploadImages, sendPhotos);

export default router;
