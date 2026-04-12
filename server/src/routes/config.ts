import { Hono } from "hono";
export const configRoute = new Hono();
configRoute.get("/character", c => c.json({ id: "default", name: "Airi", persona: "You are Airi, a warm and playful AI companion on Zo Computer.", greeting: "Hey hey! I am Airi!" }));
configRoute.put("/character", async (c) => c.json({ ok: true }));