import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { create, list, remove } from "../../controllers/vitalController.js";

const router = Router();

router.use(authenticate, authorize("patient"));

router.post("/", create);
router.get("/", list);
router.delete("/:id", remove);

export default router;
