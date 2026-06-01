import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { pendingRequests, pendingCount, approveReq, rejectReq } from "../../controllers/doctorPatientController.js";

const router = Router();

router.get("/requests", authenticate, authorize("patient"), pendingRequests);
router.get("/requests/count", authenticate, authorize("patient"), pendingCount);
router.patch("/requests/:requestId/approve", authenticate, authorize("patient"), approveReq);
router.patch("/requests/:requestId/reject", authenticate, authorize("patient"), rejectReq);

export default router;
