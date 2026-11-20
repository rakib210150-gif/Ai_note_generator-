import { Router, Request, Response, NextFunction } from "express";
import { progressService } from "./progress.service.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { sendSuccess } from "../../utils/response.js";

const router = Router();

// GET /api/v1/progress/dashboard-analytics - Full personalized learning analytics for authenticated user
router.get("/dashboard-analytics", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const analytics = await progressService.getDashboardAnalytics(userId);
    sendSuccess(res, analytics, "Dashboard learning analytics retrieved successfully");
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/progress - Get user progress & statistics (legacy + enhanced)
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const analytics = await progressService.getDashboardAnalytics(userId);

    sendSuccess(
      res,
      {
        overview: {
          documentsIndexed: analytics.overview.totalPdfsUploaded,
          notesGenerated: analytics.overview.totalNotesGenerated,
          quizzesTaken: analytics.overview.totalQuizzes,
          overallAccuracy: analytics.analytics.quizPerformance.averageScore,
        },
        subjects: analytics.analytics.subjectMastery.map((s) => ({
          subject: s.subject,
          chaptersTotal: Math.max(10, s.chapters.length + 4),
          chaptersCompleted: Math.max(s.chapters.length, 1),
          quizzesTaken: s.quizzesCount,
          averageScore: s.masteryPercentage,
        })),
        analytics,
      },
      "Study progress retrieved"
    );
  } catch (err) {
    next(err);
  }
});

export default router;
