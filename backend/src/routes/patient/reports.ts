import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { uploadSingle } from "../../middleware/upload.js";
import { create, list, getOne, remove } from "../../controllers/reportController.js";

const router = Router();

router.use(authenticate, authorize("patient"));

router.post("/", uploadSingle, create);
router.get("/", list);
router.get("/:id", getOne);
router.delete("/:id", remove);

export default router;
