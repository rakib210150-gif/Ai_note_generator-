import { Router, Request, Response, NextFunction } from "express";
import { graphService, generateGraphSchema } from "./graph.service.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { aiRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { z } from "zod";

const router = Router();

// GET /api/v1/graph/presets - Get pre-curated high-yield dependency roadmaps
router.get("/presets", requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const presets = graphService.getPresets();
    sendSuccess(res, presets, "Curated roadmaps retrieved successfully");
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/graph/generate - AI Topic or Document Dependency Graph Generator (10 coins)
router.post(
  "/generate",
  requireAuth,
  aiRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const input = generateGraphSchema.parse(req.body);
      const graph = await graphService.generateGraph(userId, input);
      sendSuccess(res, graph, "Content dependency graph generated successfully", 201);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/graph/:id/node-status - Update a node's progress status with smart cascade
const updateStatusSchema = z.object({
  nodeId: z.string().min(1),
  status: z.enum(["mastered", "learning", "ready", "locked"]),
});

router.patch("/:id/node-status", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const graphId = req.params.id as string;
    const { nodeId, status } = updateStatusSchema.parse(req.body);

    const updatedGraph = await graphService.updateNodeStatus(userId, graphId, nodeId, status);
    sendSuccess(res, updatedGraph, `Node status updated to ${status}`);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/graph/:id - Get specific graph by id
router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const graphId = req.params.id as string;
    const graph = await graphService.getGraphById(graphId, userId);

    if (!graph) {
      sendError(res, "Graph roadmap not found", 404, "NOT_FOUND");
      return;
    }

    sendSuccess(res, graph, "Dependency graph retrieved");
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/graph - Default listing & fallback
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subject = (req.query.subject as string) || "Physics";
    const presets = graphService.getPresets();
    
    // Check if preset matches subject or return default
    const matched = presets.find((p) => p.subject.toLowerCase() === subject.toLowerCase()) || presets[0];

    sendSuccess(res, {
      subject: matched.subject,
      nodes: matched.nodes,
      edges: matched.edges,
      overview: matched.overview,
      totalEffortHours: matched.totalEffortHours,
      id: matched.id,
      targetTopic: matched.targetTopic,
      academicLevel: matched.academicLevel,
    }, "Graph data retrieved");
  } catch (err) {
    next(err);
  }
});

export default router;
