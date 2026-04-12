import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { chatRoute } from "./routes/chat";
import { voiceRoute } from "./routes/voice";
import { memoryRoute } from "./routes/memory";
import { gameRoute } from "./routes/game";
import { configRoute } from "./routes/config";

const app = new Hono();

// ─── CORS: allow configured frontend origins ──────────────────────────────────
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "https://mayadaniels.zo.space,http://localhost:5173"
).split(",").map(s => s.trim());

app.use("/*", cors({
  origin: (origin) => {
    if (!origin) return false;
    if (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) return origin;
    return false;
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
}));

// ─── Security headers ──────────────────────────────────────────────────────────
app.use("/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({
  status: "ok",
  version: "1.0.0",
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  timestamp: Date.now(),
}));

// ─── API routes ────────────────────────────────────────────────────────────────
app.route("/api/chat", chatRoute);
app.route("/api/voice", voiceRoute);
app.route("/api/memory", memoryRoute);
app.route("/api/game", gameRoute);
app.route("/api/config", configRoute);

// ─── 404 handler ────────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: "Not found", path: c.req.path }, 404));

// ─── Error handler ──────────────────────────────────────────────────────────────
app.onError((c, err) => {
  console.error("Unhandled error:", err.message);
  return c.json({ error: "Internal server error" }, 500);
});

// ─── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "3001", 10);

console.log(`AIRI Companion Server starting on port ${PORT}`);
console.log(`CORS origins: ${ALLOWED_ORIGINS.join(", ")}`);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Server ready at http://localhost:${info.port}`);
});

export default app;
