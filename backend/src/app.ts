import express, { Express } from "express";
import helmet from "helmet";
import { corsMiddleware } from "./config/cors";
import { standardRateLimiter } from "./middleware/rate-limit.middleware";
import { errorMiddleware } from "./middleware/error.middleware";
import apiRoutes from "./routes";

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(helmet());
  app.use(corsMiddleware);

  // Rate Limiting
  app.use("/api/", standardRateLimiter);

  // Request Body Parsers
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Root Welcome Endpoint
  app.get("/", (_req, res) => {
    res.json({
      name: "Brain Nest Intelligence Platform API",
      status: "operational",
      version: "1.0.0",
      documentation: "/api/v1/health",
    });
  });

  // API v1 Routes
  app.use("/api/v1", apiRoutes);

  // Global Error Handler
  app.use(errorMiddleware);

  return app;
}
