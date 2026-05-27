import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "Doctor routes ready" });
});

export default router;
