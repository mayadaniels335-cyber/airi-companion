// llm.ts - Gemini API integration with retry
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
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`;

  const contents = chatMsgs.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  const body: any = { contents };
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        const status = res.status;
        if ((status === 429 || status === 503 || status === 500) && attempt < 2) {
          const delay = (attempt + 1) * 2000;
          console.log(`⚠️ AI busy (${status}), retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        if (status === 403) return { reply: "⚠️ Invalid or unauthorized API key.", done: true };
        return { reply: `⚠️ AI error (${status}): ${err.slice(0, 80)}`, done: true };
      }

      const data = await res.json();
      if (data.error) {
        const est = data.error.status || '';
        if ((est === 'RESOURCE_EXHAUSTED' || est === 'UNAVAILABLE' || est === 'INTERNAL' || est === '429') && attempt < 2) {
          const delay = (attempt + 1) * 2000;
          console.log(`⚠️ AI busy (${est}), retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        return { reply: `⚠️ AI error: ${data.error.message?.slice(0, 80) || est}`, done: true };
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response.";
      return { reply, done: true };
    } catch (err) {
      if (attempt === 2) return { reply: "⚠️ Network error. Check your internet connection.", done: true };
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { reply: "⚠️ AI is overloaded. Please try again in a moment.", done: true };
}

export { callAI as genAI };
