import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../../lib/supabase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { sendSuccess } from "../../utils/response.js";

const router = Router();

// GET /api/v1/subscriptions/current - Entitlements & plan info
router.get("/current", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier, subscription_expires_at")
      .eq("id", userId)
      .single();

    const tier = profile?.subscription_tier || "free";

    const entitlements = {
      tier,
      expiresAt: profile?.subscription_expires_at,
      limits: {
        maxUploadMb: tier === "free" ? 15 : 100,
        unlimitedAiNotes: tier === "mastery",
        adFree: true,
      },
    };

    sendSuccess(res, entitlements, "Subscription details retrieved");
  } catch (err) {
    next(err);
  }
});

export default router;
