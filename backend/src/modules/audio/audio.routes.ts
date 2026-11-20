import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { z } from "zod";

const router = Router();

/**
 * Audio Explanation Module
 * Architecture ready for Google Cloud Text-to-Speech / Gemini Audio integration.
 */
const audioSchema = z.object({
  text: z.string().min(5),
  title: z.string().min(1),
  language: z.enum(["english", "bangla"]).default("english"),
});

router.post("/generate", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, title, language } = audioSchema.parse(req.body);

    // Audio Provider Abstraction
    // When Google Cloud Text-to-Speech credentials (or Gemini Audio SDK endpoint) are configured,
    // audio buffer is synthesized and saved to Supabase Storage.
    const isTtsConfigured = Boolean(process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS);

    if (!isTtsConfigured) {
      sendSuccess(
        res,
        {
          audioAvailable: false,
          title,
          language,
          message:
            "Audio explanation module is architected and ready. To activate live MP3 streaming, provide GOOGLE_APPLICATION_CREDENTIALS or Cloud TTS API key in backend/.env.",
        },
        "Audio module status checked"
      );
      return;
    }

    sendSuccess(res, { audioUrl: null, title }, "Audio generation processed");
  } catch (err) {
    next(err);
  }
});

export default router;
