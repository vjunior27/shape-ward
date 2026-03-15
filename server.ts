import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(
    helmet({
      // Allow Firebase SDK and Vite HMR scripts
      contentSecurityPolicy: false,
    })
  );

  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000", "http://localhost:5173", "https://trainova.app"];

  app.use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    })
  );

  // ── Body parsing ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: "10kb" }));

  // ── Rate limiting ───────────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente em 15 minutos." },
  });
  app.use("/api/", globalLimiter);

  // ── API routes ──────────────────────────────────────────────────────────────
  app.get("/api/health", (_req: express.Request, res: express.Response) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files from dist
    app.use(express.static(path.join(__dirname, "dist")));
    
    // Handle SPA routing
    app.get("*", (_req: express.Request, res: express.Response) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
