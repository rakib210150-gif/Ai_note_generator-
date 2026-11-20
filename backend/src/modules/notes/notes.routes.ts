import { Router, Request, Response, NextFunction } from "express";
import { notesService, generateNotesSchema, generateSummarySchema } from "./notes.service";
import { requireAuth } from "../../middleware/auth.middleware";
import { aiRateLimiter } from "../../middleware/rate-limit.middleware";
import { sendSuccess } from "../../utils/response";

const router = Router();

// POST /api/v1/notes/summary - Generate AI Topic-Wise Short Summary (10 coins)
router.post(
  "/summary",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const validatedInput = generateSummarySchema.parse(req.body);
      const result = await notesService.generateTopicSummary(userId, validatedInput);
      sendSuccess(res, result, "Topic summary generated successfully", 201);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/notes/generate - Generate structured notes via Gemini
router.post(
  "/generate",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const validatedInput = generateNotesSchema.parse(req.body);
      const result = await notesService.generateNotes(userId, validatedInput);
      sendSuccess(res, result, "Notes generated successfully", 201);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/notes - List user's notes
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const notes = await notesService.getUserNotes(userId);
    sendSuccess(res, notes, "Notes retrieved");
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/notes/:id - Single note
router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id as string;
    const note = await notesService.getNoteById(userId, noteId);
    sendSuccess(res, note, "Note details retrieved");
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/notes/:id - Delete note
router.delete("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id as string;
    const result = await notesService.deleteNote(userId, noteId);
    sendSuccess(res, result, "Note deleted successfully");
  } catch (err) {
    next(err);
  }
});

export default router;
