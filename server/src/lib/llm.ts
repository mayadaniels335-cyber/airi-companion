import type { ChatMessage } from "../types.js";

interface AIResult { reply: string; expression: string; }

const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash-preview",
  "gemini-2.5-pro-preview",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

async function callAI(messages: ChatMessage[]): Promise<AIResult> {
  const geminiKey  = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GEMINI_API_KEY;
  const aihoKey    = process.env.AIHO_API_KEY;
  const model      = process.env.AI_MODEL || "gemini-2.0-flash";
  const fallback  = () => {
    const q = messages.at(-1)?.content || "";
    if (!q) return { reply: "Say something and I'll respond! 😊", expression: "happy" };
    if (q.match(/hello|hi|hey|yo/i))
      return { reply: "Hey there! I'm Airi, your AI companion. What's on your mind?", expression: "happy" };
    if (q.match(/\?$/))
      return { reply: "Great question! Let me think about that...", expression: "thinking" };
    return { reply: "I'm here and ready to chat! What would you like to do?", expression: "excited" };
  };

  // ── Google AI Studio (Gemini — official OpenAI compat endpoint) ──────
  if (geminiKey) {
    try {
      const m = MODELS.includes(model as typeof MODELS[number]) ? model : "gemini-2.0-flash";
      // ✅ Official: key as query param, model as Gemini ID string
      const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: m, messages, max_tokens: 300, temperature: 0.8 })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err}`);
      }
      const data = await res.json();
      const raw: string = data.choices?.[0]?.message?.content || "Hmm, I'm not sure how to respond.";
      const mood = raw.match(/\[(happy|thinking|listening|excited|sad)\]/i)?.[1]?.toLowerCase() || "happy";
      return { reply: raw.replace(/\[(happy|thinking|listening|excited|sad)\]/gi, "").trim(), expression: mood };
    } catch (err) {
      console.error("Gemini API error:", err);
      return fallback();
    }
  }

  // ── AIHO (generic OpenAI-compatible proxy) ────────────────────────────
  if (aihoKey) {
    try {
      const res = await fetch("https://api.ai-hos.es/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${aihoKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: 300, temperature: 0.8 })
      });
      if (!res.ok) throw new Error(`AIHO ${res.status}`);
      const data = await res.json();
      const raw: string = data.choices?.[0]?.message?.content || "I'm not sure what to say.";
      const mood = raw.match(/\[(happy|thinking|listening|excited|sad)\]/i)?.[1]?.toLowerCase() || "happy";
      return { reply: raw.replace(/\[(happy|thinking|listening|excited|sad)\]/gi, "").trim(), expression: mood };
    } catch (err) {
      console.error("AIHO API error:", err);
      return fallback();
    }
  }

  return fallback();
}

export { callAI as genAI };
