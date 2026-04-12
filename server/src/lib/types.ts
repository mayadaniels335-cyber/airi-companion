export interface Message { role: "user" | "assistant" | "system"; content: string; }
export interface Character { id: string; name: string; persona: string; greeting: string; avatar?: string; }
export interface Memory { id: string; content: string; embedding?: number[]; createdAt: number; importance: number; }
export interface GameState { game: string; server: string; connected: boolean; }
