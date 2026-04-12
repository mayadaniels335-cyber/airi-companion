# Airi Companion — Backend Server

Node.js/Bun HTTP API server for the Airi Companion app.

## Quick Start

```bash
cd services/server
cp .env.example .env   # then add your AIHOSES_API_KEY
bun install
bun run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/chat` | Send a message, get AI reply |
| GET | `/api/chat/models` | List available AI models |
| POST | `/api/voice/tts` | Text-to-Speech (ElevenLabs, optional) |
| POST | `/api/voice/stt` | Speech-to-Text (browser fallback, optional) |
| POST | `/api/memory/remember` | Store a memory |
| GET | `/api/memory/recall` | Get all memories |
| DELETE | `/api/memory/forget/:id` | Delete a memory |
| DELETE | `/api/memory/clear` | Clear all memories |
| GET | `/api/game/status` | Game integration status |
| POST | `/api/game/connect` | Connect to a game agent |
| GET | `/api/config/character` | Get character config |
| PUT | `/api/config/character` | Update character config |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AIHOSES_API_KEY` | Yes | — | AI API key (get from platform) |
| `PORT` | No | `3001` | HTTP server port |
| `HOST` | No | `0.0.0.0` | Bind address |
| `ALLOWED_ORIGINS` | No | (see .env.example) | CORS origins, comma-separated |
| `AIRI_NAME` | No | `Airi` | Character name |
| `ELEVENLABS_API_KEY` | No | — | For server-side TTS |
