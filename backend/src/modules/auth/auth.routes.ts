import { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin, supabasePublic } from "../../lib/supabase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { googleSheetsService } from "../google-sheets/google-sheets.service.js";
import { z } from "zod";

const router = Router();

const signupSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  mobileNumber: z.string().min(4, "Valid mobile number is required"),
  country: z.string().min(2, "Country is required"),
  classLevel: z.string().optional().default("9-10"),
});

const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/v1/auth/signup - Register new user via Supabase Auth Admin & Google Sheets
router.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, mobileNumber, country, classLevel } = signupSchema.parse(req.body);

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split("T")[0]!;

    // 1. Create user with pre-confirmed email so they don't hit SMTP rate limits
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        mobile_number: mobileNumber,
        country: country,
        class_level: classLevel,
        login_count: 1,
        last_login: nowIso,
        registration_date: nowIso,
        login_dates: [todayStr],
        distinct_login_days: 1,
        login_streak: 0,
      },
    });

    if (createError) {
      if (
        createError.message.toLowerCase().includes("already registered") ||
        createError.message.toLowerCase().includes("already been registered")
      ) {
        sendError(res, "This email is already registered. Please sign in instead.", 400, "EMAIL_EXISTS");
        return;
      }
      sendError(res, createError.message, 400, "SIGNUP_FAILED");
      return;
    }

    const newUser = createData.user;
    if (!newUser) {
      sendError(res, "Failed to create user account", 500, "USER_CREATION_FAILED");
      return;
    }

    // 2. Ensure profile exists in profiles table with 500 starter coins
    let profileData: any = null;
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", newUser.id)
      .maybeSingle();

    if (existingProfile) {
      profileData = existingProfile;
    } else {
      const { data: insertedProfile, error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: newUser.id,
          email: newUser.email,
          full_name: fullName,
          class_level: classLevel || "9-10",
          coins: 500,
          subscription_tier: "free",
        })
        .select()
        .single();

      if (!insertError && insertedProfile) {
        profileData = insertedProfile;
      } else {
        profileData = {
          id: newUser.id,
          email: newUser.email,
          full_name: fullName,
          class_level: classLevel || "9-10",
          coins: 500,
          subscription_tier: "free",
        };
      }
    }

    // 3. Automatically sync user registration to Google Sheets (Non-blocking)
    googleSheetsService.syncUserRegistration({
      userId: newUser.id,
      fullName,
      email,
      mobileNumber,
      country,
      registrationDate: nowIso,
      lastLogin: nowIso,
      totalLoginCount: 1,
    }).catch((sheetErr) => {
      console.warn("[Auth] Background Google Sheets registration sync warning:", sheetErr?.message || sheetErr);
    });

    // 4. Immediately sign in to generate a valid JWT session for the frontend
    const { data: signinData } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    sendSuccess(
      res,
      {
        user: {
          id: profileData.id,
          name: profileData.full_name || fullName,
          email: profileData.email,
          mobileNumber,
          country,
          class_level: profileData.class_level || "9-10",
          classLevel: profileData.class_level || "9-10",
          coins: profileData.coins ?? 500,
          subscription_tier: profileData.subscription_tier || "free",
          createdAt: profileData.created_at || nowIso,
        },
        session: signinData?.session || null,
      },
      "Registration successful! 500 starter coins credited to your wallet.",
      201
    );
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login - Log in with Supabase Auth & track login in Google Sheets
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      sendError(
        res,
        "Invalid email or password. If you do not have an account yet, please register first.",
        401,
        "INVALID_CREDENTIALS"
      );
      return;
    }

    const userId = data.user.id;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split("T")[0]!;

    // 1. Retrieve metadata from auth user
    const { data: authUserObj } = await supabaseAdmin.auth.admin.getUserById(userId);
    const existingMeta = authUserObj?.user?.user_metadata || {};
    const nextLoginCount = Number(existingMeta.login_count || 0) + 1;

    // Track distinct calendar days
    const existingDates: string[] = Array.isArray(existingMeta.login_dates)
      ? existingMeta.login_dates
      : existingMeta.registration_date
      ? [existingMeta.registration_date.split("T")[0]]
      : [];
    const uniqueDatesSet = new Set(existingDates);
    uniqueDatesSet.add(todayStr);
    const sortedDates = Array.from(uniqueDatesSet).sort();

    // Calculate consecutive login streak based on actual unique calendar days
    let streakCount = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const isoKey = d.toISOString().split("T")[0]!;
      if (uniqueDatesSet.has(isoKey)) {
        streakCount++;
      } else {
        break;
      }
    }

    // 2. Update user metadata in background (fire & forget)
    supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingMeta,
        login_count: nextLoginCount,
        last_login: nowIso,
        login_dates: sortedDates,
        distinct_login_days: sortedDates.length,
        login_streak: streakCount,
      },
    }).catch(() => {});

    // 3. Fetch user profile from database
    let profileData: any = null;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profile) {
      profileData = profile;
    } else {
      const fullName = (existingMeta.full_name as string) || email.split("@")[0] || "Student";
      const { data: createdProf } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          email: data.user.email,
          full_name: fullName,
          class_level: "9-10",
          coins: 500,
          subscription_tier: "free",
        })
        .select()
        .single();

      profileData = createdProf || {
        id: userId,
        email: data.user.email,
        full_name: fullName,
        class_level: "9-10",
        coins: 500,
        subscription_tier: "free",
      };
    }

    const userName = existingMeta.full_name || profileData.full_name || "Student";
    const mobileNumber = existingMeta.mobile_number || "";
    const country = existingMeta.country || "";

    // 4. Automatically sync login activity to Google Sheets (Non-blocking)
    googleSheetsService.syncUserLogin({
      userId,
      userName,
      email: data.user.email || email,
      mobileNumber,
      country,
      loginCount: nextLoginCount,
      lastLogin: nowIso,
    }).catch((sheetErr) => {
      console.warn("[Auth] Background Google Sheets login sync warning:", sheetErr?.message || sheetErr);
    });

    sendSuccess(
      res,
      {
        user: {
          id: profileData.id,
          name: userName,
          email: profileData.email,
          mobileNumber,
          country,
          class_level: profileData.class_level || "9-10",
          classLevel: profileData.class_level || "9-10",
          coins: profileData.coins ?? 500,
          subscription_tier: profileData.subscription_tier || "free",
          createdAt: profileData.created_at || nowIso,
        },
        session: data.session,
      },
      "Login successful"
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/google-sheets-status - Verify Google Sheets synchronization status
router.get("/google-sheets-status", (_req: Request, res: Response) => {
  const isConfigured = googleSheetsService.isConfigured();
  sendSuccess(res, {
    configured: isConfigured,
    mode: process.env.GOOGLE_SHEETS_WEBHOOK_URL
      ? "Webhook (Google Apps Script)"
      : process.env.GOOGLE_SHEET_ID
      ? "Google Sheets API v4 (Service Account)"
      : "Pending Configuration",
    tabs: ["Registered Users", "Login History"],
    status: isConfigured ? "ready" : "needs_setup",
    helpDocs: "/GOOGLE_SHEETS_SETUP.md",
  }, "Google Sheets integration status");
});

// GET /api/v1/auth/me - Current authenticated user & profile
router.get("/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user!;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profile) {
      sendSuccess(res, {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        class_level: profile.class_level || "9-10",
        classLevel: profile.class_level || "9-10",
        coins: profile.coins,
        subscription_tier: profile.subscription_tier,
        createdAt: profile.created_at,
      }, "Profile retrieved");
      return;
    }

    const fallbackProfile = {
      id: authUser.id,
      name: authUser.email.split("@")[0] || "Student",
      email: authUser.email,
      class_level: "9-10",
      classLevel: "9-10",
      coins: 500,
      subscription_tier: "free",
      createdAt: new Date().toISOString(),
    };

    sendSuccess(res, fallbackProfile, "Profile retrieved");
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/auth/class-level - Switch / update student academic class level
router.put("/class-level", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawClass = req.body.classLevel || req.body.class_level || "9-10";
    const userId = req.user!.id;

    const { data: updated, error } = await supabaseAdmin
      .from("profiles")
      .update({ class_level: rawClass })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      sendError(res, "Failed to update academic class level", 500);
      return;
    }

    sendSuccess(res, {
      class_level: updated?.class_level || rawClass,
      classLevel: updated?.class_level || rawClass,
    }, `Academic level set to ${rawClass}`);
  } catch (err) {
    next(err);
  }
});

export default router;
