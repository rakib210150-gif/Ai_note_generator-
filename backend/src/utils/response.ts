import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
}

export function sendSuccess<T>(res: Response, data: T, message = "Success", statusCode = 200): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errorCode = "BAD_REQUEST",
  details?: any
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    },
  });
}
