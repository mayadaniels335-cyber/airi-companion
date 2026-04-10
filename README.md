# Airi Companion

A mobile-first AI gaming companion with real-time chat, mini-games, XP rewards and customizable avatar — inspired by [Airi](https://x.com/i/status/2041434768936771705).

**Stack**: React + TypeScript + Vite + Tailwind CSS · Bun

---

## Screens

| Screen | Description |
|--------|-------------|
| **Home** | Profile stats (Level, XP, win rate), featured game card, quick-play CTA |
| **Play** | 6 mini-games grid + AI chat tab with LLM integration |
| **Rewards** | XP progress bar, level display, badge collection, XP history |
| **Settings** | Character name, LLM model, avatar style, voice preset, game toggle |

---

## Games

| Game | Description |
|------|-------------|
| Memory Match | Classic card-flip matching — flip pairs before time runs out |
| Reflex Rush | Tap targets as fast as possible within the time limit |
| Pattern Lock | Simon-says memorization with growing sequences |
| Color Stack | Match falling color blocks quickly and accurately |

---

## Quick Start

```bash
bun install
bun run dev        # starts on :5173
```

For AI chat, create `services/server/.env`:

```env
OPENAI_API_KEY=sk-...
```

Then start the backend:

```bash
cd services/server && bun run dev
```

The app is fully playable without an API key — chat falls back to a local greeting engine.

---

## Build

```bash
bun run build     # production build → dist/
```
