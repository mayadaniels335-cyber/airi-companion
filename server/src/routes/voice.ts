import { Hono } from "hono";
import { z } from "zod";
const voiceRoute = new Hono();
const ttsSchema = z.object({ text: z.string().max(500), voice: z.string().optional() });
const sttSchema = z.object({ audioUrl: z.string().optional(), language: z.string().optional() });

voiceRoute.post("/tts", async (c) => {
  const { text } = ttsSchema.parse(await c.req.json());
  const ELEVEN_API = process.env.ELEVENLABS_API_KEY;
  if (!ELEVEN_API) return c.json({ audioUrl: null, text, note: "Add ELEVENLABS_API_KEY to enable TTS" });
  try {
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "allmight";
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${ELEVEN_API}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice_settings: { stability: 0.5, similarity_boost: 0.8 } })
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return c.json({ audioUrl: `data:audio/mpeg;base64,${base64}`, duration: Math.ceil(text.length / 10) });
  } catch (err) {
    console.error("TTS error:", err);
    return c.json({ audioUrl: null, note: "TTS failed" }, 500);
  }
});

voiceRoute.post("/transcribe", async (c) => {
  const { audioUrl, language } = sttSchema.parse(await c.req.json());
  const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_KEY) return c.json({ text: "[STT not configured]", language: language || "en" });
  if (!audioUrl) return c.json({ text: "" });
  try {
    const res = await fetch("https://api.deepgram.com/v1/listen", {
      method: "POST",
      headers: { "Authorization": `Bearer ${DEEPGRAM_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: audioUrl, language: language || "en" })
    });
    const data = await res.json();
    return c.json({ text: data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "", language: language || "en" });
  } catch (err) {
    return c.json({ text: "[Transcription failed]", language: language || "en" }, 500);
  }
});

voiceRoute.get("/voices", (c) => c.json({
  voices: [
    { id: "allmight", name: "All Might (Heroic)", mood: "excited" },
    { id: "emma", name: "Emma (Warm)", mood: "happy" },
    { id: "josh", name: "Josh (Calm)", mood: "thinking" },
    { id: "sage", name: "Sage (Wise)", mood: "listening" }
  ]
}));

export { voiceRoute };
