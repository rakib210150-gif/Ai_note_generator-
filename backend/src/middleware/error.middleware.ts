import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { sendError } from "../utils/response";
import { env } from "../config/env";

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Unhandled Application Error:", err);

  // Handle Multer upload errors
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      sendError(res, `File too large. Maximum allowed size is ${env.MAX_UPLOAD_MB}MB.`, 400, "FILE_TOO_LARGE");
      return;
    }
    sendError(res, err.message, 400, "UPLOAD_ERROR");
    return;
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const formatted = err.issues.map((i) => ({ field: i.path.join(".") || "root", message: i.message }));
    const issueSummary = formatted.map((f) => `${f.field}: ${f.message}`).join(", ");
    sendError(res, `Validation error: ${issueSummary}`, 422, "VALIDATION_FAILED", formatted);
    return;
  }

  // Handle Custom / General Errors
  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected internal server error occurred.";
  const errorCode = err.errorCode || "INTERNAL_SERVER_ERROR";

  sendError(
    res,
    message,
    statusCode,
    errorCode,
    env.NODE_ENV === "development" ? { stack: err.stack } : undefined
  );
}
