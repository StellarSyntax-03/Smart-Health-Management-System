import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { uploadSingle } from "../../middleware/upload.js";
import { create, list, getOne, remove, parseReport, getParseResult } from "../../controllers/reportController.js";

const router = Router();

router.use(authenticate, authorize("patient"));

router.post("/", uploadSingle, create);
router.get("/", list);
router.get("/:id", getOne);
router.delete("/:id", remove);

router.post("/:id/parse", parseReport);
router.get("/:id/parse", getParseResult);

export default router;
