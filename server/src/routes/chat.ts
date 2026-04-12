import { Hono } from "hono";
import { z } from "zod";
import { genAI } from "../lib/llm";
const chatRoute = new Hono();
const MessageSchema = z.object({ role: z.enum(["user","assistant","system"]), content: z.string() });
const bodySchema = z.object({ messages: z.array(MessageSchema), model: z.string().optional() });
chatRoute.post("/", async (c) => {
  const { messages, model } = bodySchema.parse(await c.req.json());
  const systemMsg = { role: "system" as const, content: `You are ${process.env.AIRI_NAME || "Airi"} — a lively, curious AI companion. Keep responses conversational and concise (2-4 sentences). You have personality, make jokes, and remember things. You help with coding, gaming, writing, and everyday questions.` };
  const chatMessages = [systemMsg, ...messages.filter(m => m.role !== "system")];
  try {
    const aiResp = await genAI(chatMessages);
    return c.json({ reply: aiResp.reply, expression: aiResp.expression || "happy", model: model || "xsai:gpt-4o" });
  } catch (err) {
    console.error("Chat error:", err);
    return c.json({ reply: "I'm having trouble thinking right now. Please try again in a moment.", expression: "thinking" }, 500);
  }
});
chatRoute.get("/models", (c) => c.json({ models: ["xsai:gpt-4o","xsai:claude-3.5-sonnet","xsai:deepseek-v3"] }));
export { chatRoute };
