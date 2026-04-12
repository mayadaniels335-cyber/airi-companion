// API client for Airi Companion backend
// Uses environment variable or falls back to relative paths (for Vercel proxy)

const API_BASE = (() => {
  if (typeof window !== "undefined") {
    // In browser: use env var or relative path (Vercel handles proxy)
    return import.meta.env.VITE_API_URL || "";
  }
  return "";
})();

export const API = {
  chat: (messages: {role: string; content: string}[]) =>
    fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({messages}),
    }).then(r => r.json()).catch(() => ({reply: "Connection error. Please try again.", expression: "sad"})),

  voice: (audioData: string) =>
    fetch(`${API_BASE}/api/voice`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({audio: audioData}),
    }).then(r => r.json()).catch(() => ({text: "", expression: "sad"})),

  memory: {
    store: (text: string) =>
      fetch(`${API_BASE}/api/memory/store`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({text}),
      }).then(r => r.json()).catch(() => ({ok: false})),
    recall: (query: string) =>
      fetch(`${API_BASE}/api/memory/recall?query=${encodeURIComponent(query)}`)
        .then(r => r.json()).catch(() => ({memories: []})),
  },

  game: {
    status: () =>
      fetch(`${API_BASE}/api/game/status`)
        .then(r => r.json()).catch(() => ({connected: false, game: null, lastAction: ""})),
    connect: (gameId: string) =>
      fetch(`${API_BASE}/api/game/connect`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({gameId}),
      }).then(r => r.json()).catch(() => ({ok: false})),
    action: (action: string, params: Record<string, unknown>) =>
      fetch(`${API_BASE}/api/game/action`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({action, params}),
      }).then(r => r.json()).catch(() => ({ok: false})),
  },

  config: {
    get: () => fetch(`${API_BASE}/api/config/character`).then(r => r.json()).catch(() => null),
    update: (cfg: Record<string, unknown>) =>
      fetch(`${API_BASE}/api/config/character`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(cfg),
      }).then(r => r.json()).catch(() => ({ok: false})),
  },
};
