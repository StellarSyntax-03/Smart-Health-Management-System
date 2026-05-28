import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { upload } from "../../middleware/upload.js";
import {
  createChatSession,
  listChatSessions,
  getChatMessages,
  sendChatMessage,
  deleteChatSession,
} from "../../controllers/chatController.js";

const router = Router();

router.post("/sessions", authenticate, authorize("patient"), createChatSession);
router.get("/sessions", authenticate, authorize("patient"), listChatSessions);
router.get("/sessions/:id/messages", authenticate, authorize("patient"), getChatMessages);
router.post("/sessions/:id/messages", authenticate, authorize("patient"), upload.single("image"), sendChatMessage);
router.delete("/sessions/:id", authenticate, authorize("patient"), deleteChatSession);

router.get("/", (_req, res) => {
  res.json({ success: true, message: "AI routes ready" });
});

export default router;
