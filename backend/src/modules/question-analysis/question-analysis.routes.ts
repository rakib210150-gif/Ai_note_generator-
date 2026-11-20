import { Router, Request, Response, NextFunction } from "express";
import { questionAnalysisService, analyzeQuestionsSchema } from "./question-analysis.service";
import { aiRateLimiter } from "../../middleware/rate-limit.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { sendSuccess } from "../../utils/response";

const router = Router();

// GET /api/v1/question-analysis/bank - Retrieve authentic questions from database question papers
router.get("/bank", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { level, educationLevel, department, semester, subject } = req.query;
    const result = await questionAnalysisService.getDatabaseQuestions({
      educationLevel: (educationLevel || level) as string | undefined,
      department: department as string | undefined,
      semester: semester as string | undefined,
      subject: subject as string | undefined,
    });
    sendSuccess(res, result, "Question bank retrieved");
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/question-analysis/analyze
router.post(
  "/analyze",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = analyzeQuestionsSchema.parse(req.body);
      const result = await questionAnalysisService.analyzeQuestions(userId, input);
      sendSuccess(res, result, "AI Question Analysis completed successfully", 200);
    } catch (err) {
      next(err);
    }
  }
);

export default router;

