import { Router, Request, Response, NextFunction } from "express";
import { documentService } from "./documents.service";
import { requireAuth } from "../../middleware/auth.middleware";
import { uploadMiddleware } from "../../middleware/upload.middleware";
import { sendSuccess, sendError } from "../../utils/response";
import { supabaseAdmin } from "../../lib/supabase";

const router = Router();

// POST /api/v1/documents/analyze - Upload and deeply analyze document (PDF, DOCX, PPTX, TXT)
router.post(
  "/analyze",
  uploadMiddleware.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        sendError(res, "No file uploaded. Please attach a PDF, DOCX, PPTX, or TXT file.", 400, "NO_FILE");
        return;
      }

      let userId = "guest";
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ") && authHeader !== "Bearer guest") {
        try {
          const token = authHeader.split(" ")[1];
          const { data: { user } } = await supabaseAdmin.auth.getUser(token);
          if (user?.id) userId = user.id;
        } catch {}
      }

      const result = await documentService.analyzeDocument(userId, req.file);
      sendSuccess(res, result, "Document analyzed successfully", 200);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/documents - Upload single or multiple files
router.post(
  "/",
  requireAuth,
  uploadMiddleware.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        sendError(res, "No file uploaded. Please attach a PDF, DOCX, or TXT file.", 400, "NO_FILE");
        return;
      }

      const userId = req.user!.id;
      const subject = req.body.subject as string | undefined;
      const chapter = req.body.chapter as string | undefined;

      const result = await documentService.processAndStoreDocument(userId, req.file, subject, chapter);
      sendSuccess(res, result, "Document processed and stored successfully", 201);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/documents/academic-resources - List official classes & subjects stored in database
router.get("/academic-resources", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classLevel = (req.query.classLevel || req.query.target_class) as string | undefined;
    const resources = await documentService.getAcademicResources(classLevel);
    sendSuccess(res, resources, "Academic resources retrieved");
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/documents - List all user documents
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const documents = await documentService.getUserDocuments(userId);
    sendSuccess(res, documents, "Documents retrieved");
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/documents/:id - Single document with extracted text
router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const documentId = req.params.id as string;
    const document = await documentService.getDocumentById(userId, documentId);
    sendSuccess(res, document, "Document details retrieved");
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/documents/:id - Delete document
router.delete("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const documentId = req.params.id as string;
    const result = await documentService.deleteDocument(userId, documentId);
    sendSuccess(res, result, "Document deleted successfully");
  } catch (err) {
    next(err);
  }
});

export default router;
