import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { schedule, toggle, adherence } from "../../controllers/medicationController.js";

const router = Router();

router.use(authenticate, authorize("patient"));

router.get("/", schedule);
router.patch("/:logId/toggle", toggle);
router.get("/adherence", adherence);

export default router;
