import { Hono } from "hono";
const SYSTEM_PROMPT = `You are Airi, a lively AI companion. Keep responses conversational, witty, concise (2-4 sentences). You have personality, opinions, make jokes. You help with coding, gaming, writing, everyday questions. You express emotion at the end using mood tags: [happy] [thinking] [listening] [excited] [sad]`;

interface ChatMessage { role: "system" | "user" | "assistant"; content: string; }

async function callAI(messages: ChatMessage[]): Promise<{ reply: string; expression: string }> {
  const AIHOSES_API = process.env.AIHOSES_API_KEY;
  const MODEL = process.env.AI_MODEL || "gpt-4o";
  if (!AIHOSES_API) {
    const lastMsg = messages.at(-1)?.content || "";
    if (lastMsg.toLowerCase().includes("hello")) return { reply: "Hey! I'm Airi, your AI companion. What shall we talk about? 😊", expression: "happy" };
    if (lastMsg.includes("?")) return { reply: "That's a great question! Let me think about it...", expression: "thinking" };
    return { reply: "I'm here and ready to chat! What's on your mind?", expression: "happy" };
  }
  try {
    const res = await fetch("https://api.ai-hos.es/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${AIHOSES_API}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: 300, temperature: 0.8 })
    });
    if (!res.ok) throw new Error(`AI API ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "I'm not sure how to respond to that.";
    const moodMatch = raw.match(/\[(happy|thinking|listening|excited|sad)\]/i);
    return { reply: raw.replace(/\[(happy|thinking|listening|excited|sad)\]/gi, "").trim(), expression: moodMatch ? moodMatch[1].toLowerCase() : "happy" };
  } catch (err) {
    console.error("AI API error:", err);
    return { reply: "I'm having trouble thinking right now. Please try again!", expression: "thinking" };
  }
}

export { callAI as genAI };
