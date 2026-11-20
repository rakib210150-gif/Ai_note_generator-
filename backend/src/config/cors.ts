import cors, { CorsOptions } from "cors";
import { env } from "./env";

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      env.FRONTEND_ORIGIN,
      "http://localhost:5173",
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:3000",
      "http://localhost:4173",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:8080",
      "http://127.0.0.1:8081",
      "http://127.0.0.1:3000",
    ];

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (allowedOrigins.includes(origin) || isLocalhost || env.NODE_ENV === "development") {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

export const corsMiddleware = cors(corsOptions);
