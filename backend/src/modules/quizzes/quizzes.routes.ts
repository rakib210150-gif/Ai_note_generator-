import { Router, Request, Response, NextFunction } from "express";
import { quizService, generateQuizSchema } from "./quizzes.service.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { aiRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { sendSuccess } from "../../utils/response.js";
import { z } from "zod";

const router = Router();

// POST /api/v1/quizzes/generate
router.post(
  "/generate",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = generateQuizSchema.parse(req.body);
      const quiz = await quizService.generateQuiz(userId, input);
      sendSuccess(res, quiz, "Quiz generated successfully", 201);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/quizzes
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const quizzes = await quizService.getUserQuizzes(userId);
    sendSuccess(res, quizzes, "Quizzes retrieved");
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/quizzes/:id/attempts - Submit attempt & calculate score
const attemptSchema = z.object({
  answers: z.record(z.string(), z.number()),
});

router.post("/:id/attempts", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const quizId = req.params.id as string;
    const { answers } = attemptSchema.parse(req.body);
    const result = await quizService.submitAttempt(userId, quizId, answers);
    sendSuccess(res, result, "Quiz attempt scored successfully");
  } catch (err) {
    next(err);
  }
});

export default router;
