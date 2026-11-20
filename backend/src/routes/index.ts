import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import documentRoutes from "../modules/documents/documents.routes";
import notesRoutes from "../modules/notes/notes.routes";
import quizRoutes from "../modules/quizzes/quizzes.routes";
import questionRoutes from "../modules/questions/questions.routes";
import tutorRoutes from "../modules/tutor/tutor.routes";
import revisionRoutes from "../modules/revision/revision.routes";
import graphRoutes from "../modules/graph/graph.routes";
import progressRoutes from "../modules/progress/progress.routes";
import walletRoutes from "../modules/wallet/wallet.routes";
import subscriptionRoutes from "../modules/subscriptions/subscriptions.routes";
import audioRoutes from "../modules/audio/audio.routes";
import questionAnalysisRoutes from "../modules/question-analysis/question-analysis.routes";
import { geminiService } from "../lib/gemini";
import { sendSuccess } from "../utils/response";

const router = Router();

// Health check endpoint
router.get("/health", (_req, res) => {
  sendSuccess(res, {
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Brain Nest Backend API",
    version: "1.0.0",
    geminiConfigured: geminiService.isReady(),
    geminiModel: geminiService.getModelName(),
  });
});

// Mount module routes
router.use("/auth", authRoutes);
router.use("/documents", documentRoutes);
router.use("/notes", notesRoutes);
router.use("/quizzes", quizRoutes);
router.use("/question-papers", questionRoutes);
router.use("/tutor", tutorRoutes);
router.use("/revision", revisionRoutes);
router.use("/graph", graphRoutes);
router.use("/progress", progressRoutes);
router.use("/wallet", walletRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/audio", audioRoutes);
router.use("/question-analysis", questionAnalysisRoutes);

export default router;
