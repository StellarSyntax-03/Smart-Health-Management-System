import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { drugSearch } from "../../controllers/ekaCareController.js";

const router = Router();

router.get("/search", authenticate, authorize("patient"), drugSearch);

export default router;
