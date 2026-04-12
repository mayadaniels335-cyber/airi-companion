import { Hono } from "hono";
export const gameRoute = new Hono();
gameRoute.get("/status", c => c.json({ game: null, connected: false, server: null }));
gameRoute.post("/connect", async (c) => c.json({ connected: false, note: "Start the Minecraft agent to enable game control" }));
gameRoute.post("/command", async (c) => c.json({ ok: false, error: "Not connected" }));
gameRoute.get("/plugins", c => c.json({ plugins: [] }));