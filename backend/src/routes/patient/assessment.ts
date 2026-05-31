import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { init, answer, submit, symptoms } from "../../controllers/assessmentController.js";

const router = Router();

router.use(authenticate, authorize("patient"));

router.get("/symptoms", symptoms);
router.post("/init", init);
router.post("/answer", answer);
router.post("/submit", submit);

export default router;
