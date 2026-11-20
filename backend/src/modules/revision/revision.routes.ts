import { Router, Request, Response, NextFunction } from "express";
import { revisionService, generateRevisionSchema } from "./revision.service.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { aiRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { sendSuccess } from "../../utils/response.js";

const router = Router();

// POST /api/v1/revision/generate
router.post(
  "/generate",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = generateRevisionSchema.parse(req.body);
      const sheet = await revisionService.generateRevisionSheet(userId, input);
      sendSuccess(res, sheet, "Revision sheet generated successfully", 201);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/revision
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const sheets = await revisionService.getUserRevisionSheets(userId);
    sendSuccess(res, sheets, "Revision sheets retrieved");
  } catch (err) {
    next(err);
  }
});

export default router;
