import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("4000").transform((val) => parseInt(val, 10)),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().url("Invalid SUPABASE_URL format").or(z.string().default("https://placeholder.supabase.co")),
  SUPABASE_PUBLISHABLE_KEY: z.string().default("placeholder_publishable_key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default("placeholder_service_role_key"),
  SUPABASE_STORAGE_BUCKET: z.string().default("study_materials"),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  MAX_UPLOAD_MB: z.string().default("50").transform((val) => parseInt(val, 10)),
  INITIAL_FREE_COINS: z.string().default("500").transform((val) => parseInt(val, 10)),
  DAILY_BONUS_COINS: z.string().default("50").transform((val) => parseInt(val, 10)),
  GOOGLE_SHEETS_WEBHOOK_URL: z.string().optional().default(""),
  GOOGLE_SHEET_ID: z.string().optional().default(""),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional().default(""),
  GOOGLE_PRIVATE_KEY: z.string().optional().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Environment configuration validation failed:");
  parsed.error.issues.forEach((issue) => {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;

export const pricingConfig = {
  notes: 20,
  topicSummary: 5,
  quiz: 15,
  tutorMessage: 5,
  questionAnalysis: 25,
  revisionSheet: 15,
  audioExplanation: 30,
};
