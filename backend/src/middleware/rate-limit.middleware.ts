import rateLimit from "express-rate-limit";

export const standardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
    error: { code: "RATE_LIMIT_EXCEEDED" },
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // max 20 AI generations per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "AI request rate limit reached. Please wait a moment before generating again.",
    error: { code: "AI_RATE_LIMIT" },
  },
});
