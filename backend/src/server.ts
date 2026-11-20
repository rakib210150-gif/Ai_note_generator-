import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Brain Nest Backend is running!`);
  console.log(`📡 URL: http://localhost:${env.PORT}`);
  console.log(`🩺 Health: http://localhost:${env.PORT}/api/v1/health`);
  console.log(`⚙️  Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Allowed Frontend: ${env.FRONTEND_ORIGIN}`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received, gracefully closing server...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
 
