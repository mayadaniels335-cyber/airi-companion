import { Hono } from "hono";
import { z } from "zod";
export const memoryRoute = new Hono();
const memStore = [];
const schema = z.object({ content: z.string(), importance: z.number().min(0).max(1).default(0.5) });
memoryRoute.post("/remember", async (c) => {
  const { content, importance } = schema.parse(await c.req.json());
  const id = crypto.randomUUID();
  memStore.push({ id, content, createdAt: Date.now(), importance });
  return c.json({ id, count: memStore.length });
});
memoryRoute.get("/recall", c => c.json({ memories: memStore }));
memoryRoute.delete("/forget/:id", c => { const idx = memStore.findIndex(m => m.id === c.req.param("id")); if (idx >= 0) memStore.splice(idx, 1); return c.json({ ok: true }); });
memoryRoute.delete("/clear", c => { memStore.length = 0; return c.json({ ok: true }); });