import { Router, Request, Response, NextFunction } from "express";
import { questionsService, analyzePapersSchema, analyzeSyllabusAndBookSchema } from "./questions.service.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { aiRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { sendSuccess } from "../../utils/response.js";

const router = Router();

// POST /api/v1/question-papers/analyze-syllabus-book (AI Syllabus & Book Analyzer, 15 coins)
router.post(
  "/analyze-syllabus-book",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = analyzeSyllabusAndBookSchema.parse(req.body);
      const result = await questionsService.analyzeSyllabusAndBook(userId, input);
      sendSuccess(res, result, "Syllabus and book matched successfully", 200);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/question-papers/predict (Multi-year prediction & syllabus analysis, 25 coins)
router.post(
  "/predict",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await questionsService.predictExamQuestions(userId, req.body);
      sendSuccess(res, result, "AI exam question prediction generated successfully", 201);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/question-papers/analyze
router.post(
  "/analyze",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = analyzePapersSchema.parse(req.body);
      const result = await questionsService.analyzePapers(userId, input);
      sendSuccess(res, result, "Question paper analysis completed successfully", 201);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/question-papers/analyses
router.get("/analyses", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const records = await questionsService.getUserAnalyses(userId);
    sendSuccess(res, records, "Past paper analyses retrieved");
  } catch (err) {
    next(err);
  }
});

export default router;
