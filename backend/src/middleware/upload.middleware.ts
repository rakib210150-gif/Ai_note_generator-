import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { env } from "../config/env.js";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (
    ALLOWED_MIME_TYPES.includes(file.mimetype) ||
    /\.(pdf|docx|doc|pptx|ppt|txt|md|png|jpe?g|webp)$/i.test(file.originalname)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file format. Please upload PDF, DOCX, PPTX, TXT, or Image files."));
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
  },
  fileFilter,
});
