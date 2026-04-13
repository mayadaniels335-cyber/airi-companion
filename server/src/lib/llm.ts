// llm.ts - Gemini API integration
const GOOGLE_API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY ?? '';

export interface LLMMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface AIResponse {
  reply: string;
  done: boolean;
}

export async function callAI(messages: LLMMessage[]): Promise<AIResponse> {
  if (!GOOGLE_API_KEY) {
    return { reply: "⚠️ No API key configured. Add GOOGLE_AI_STUDIO_API_KEY to your .env", done: true };
  }

  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');
  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`;

  const contents = chatMsgs.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const body: any = { contents };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      if (res.status === 429) return { reply: "⚠️ AI quota exceeded. Try again later.", done: true };
      if (res.status === 403) return { reply: "⚠️ Invalid or unauthorized API key.", done: true };
      return { reply: `⚠️ AI error (${res.status}): ${err.slice(0, 100)}`, done: true };
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response.";
    return { reply, done: true };
  } catch (err) {
    return { reply: "⚠️ Network error. Is the server connected to the internet?", done: true };
  }
}

export { callAI as genAI };
