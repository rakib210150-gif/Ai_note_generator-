import { Router, Request, Response, NextFunction } from "express";
import { tutorService, tutorMessageSchema } from "./tutor.service";
import { requireAuth } from "../../middleware/auth.middleware";
import { aiRateLimiter } from "../../middleware/rate-limit.middleware";
import { sendSuccess } from "../../utils/response";

const router = Router();

// POST /api/v1/tutor/message - Chat with tutor
router.post(
  "/message",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = tutorMessageSchema.parse(req.body);
      const result = await tutorService.sendMessage(userId, input);
      sendSuccess(res, result, "Tutor response generated successfully");
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/tutor/conversations - List conversations
router.get("/conversations", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const conversations = await tutorService.getConversations(userId);
    sendSuccess(res, conversations, "Tutor conversations retrieved");
  } catch (err) {
    next(err);
  }
});

export default router;
