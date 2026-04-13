import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "./lib/utils";
import { API } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────────────
interface GameState {
  tab: "home"|"play"|"rewards"|"settings";
  playerName: string;
  xp: number;
  level: number;
  games: { id: string; name: string; icon: string; rating: number; players: number; desc: string }[];
  featuredGame: { name: string; icon: string; desc: string; players: number };
  gamePhase: "idle"|"difficulty"|"playing"|"won"|"lost";
  selectedGame: string | null;
  difficulty: "easy"|"medium"|"hard";
  score: number;
  moves: number;
  won: boolean;
  xpLog: { label: string; xp: number; ts: number }[];
  badges: { id: string; name: string; icon: string; earned: boolean; desc: string }[];
  streak: number;
  messages: { id: string; from: "user"|"airi"; text: string; ts: number }[];
  cfg: {
    name: string; model: string; voice: string; avatar: string; pushToTalk: boolean;
    musicVol: number; sfxVol: number;
    tab: "char"|"voice"|"game";
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const XP_PER_LEVEL = 500;

function xpToLevel(xp: number) { return Math.floor(xp / XP_PER_LEVEL) + 1; }

function loadState(): GameState {
  try {
    const s = localStorage.getItem("airi-state");
    if (s) {
      const p = JSON.parse(s);
      return { ...p, messages: [], gamePhase: "idle", tab: p.tab || "home" };
    }
  } catch {}
  return {
    tab: "home",
    playerName: "Airi",
    xp: 12450, level: 25, streak: 2,
    featuredGame: { name: "Memory Match", icon: "🧠", desc: "Match all pairs before time runs out to earn XP and climb the leaderboard!", players: 2417 },
    games: [
      { id: "memory", name: "Memory Match", icon: "🧠", rating: 4.9, players: 2417, desc: "Find matching pairs" },
      { id: "reflex", name: "Reflex Rush", icon: "⚡", rating: 4.7, players: 1823, desc: "Test your reflexes" },
      { id: "pattern", name: "Pattern Lock", icon: "🧩", rating: 4.8, players: 2104, desc: "Crack the pattern" },
      { id: "color", name: "Color Stack", icon: "🎨", rating: 4.6, players: 1540, desc: "Stack colors" },
    ],
    gamePhase: "idle", selectedGame: null, difficulty: "medium", score: 0, moves: 0, won: false,
    xpLog: [
      { label: "Memory Match — First Win", xp: 150, ts: Date.now() - 86400000 },
      { label: "Daily Login", xp: 50, ts: Date.now() - 172800000 },
      { label: "Hot Streak Bonus", xp: 100, ts: Date.now() - 259200000 },
    ],
    badges: [
      { id: "first-win", name: "First Win", icon: "🏆", earned: true, desc: "Win your first game" },
      { id: "regular", name: "Regular", icon: "⭐", earned: true, desc: "Play 7 days in a row" },
      { id: "hot-streak", name: "Hot Streak", icon: "🔥", earned: true, desc: "Win 5 games in a row" },
      { id: "rising-star", name: "Rising Star", icon: "🌟", earned: true, desc: "Reach Level 10" },
      { id: "veteran", name: "Veteran", icon: "🎖️", earned: true, desc: "Play 100 games" },
      { id: "perfectionist", name: "Perfectionist", icon: "💎", earned: false, desc: "Get a perfect game" },
    ],
    messages: [],
    cfg: { name: "Airi", model: "gpt-4o", voice: "alloy", avatar: "emoji", pushToTalk: false, musicVol: 70, sfxVol: 80, tab: "char" },
  };
}

function saveState(s: GameState) { localStorage.setItem("airi-state", JSON.stringify(s)); }function HomeScreen({state,update}:{state:GameState;update:(s:Partial<GameState>)=>void}) {
  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1 pb-24">
      {/* Featured Game */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 flex flex-col gap-3">
        <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">✦ Featured Game</div>
        <div className="flex items-center gap-3">
          <span className="text-5xl">{state.featuredGame.icon}</span>
          <div>
            <div className="text-white font-bold text-lg">{state.featuredGame.name}</div>
            <div className="text-indigo-200 text-sm">{state.featuredGame.players.toLocaleString()} playing</div>
          </div>
        </div>
        <div className="text-indigo-100 text-sm">{state.featuredGame.desc}</div>
        <button onClick={()=>update({tab:"play",selectedGame:"memory",gamePhase:"difficulty"})}
          className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors">
          ▶ PLAY NOW
        </button>
      </div>

      {/* XP */}
      <div className="grid grid-cols-3 gap-3">
        {[{label:"Rating",val:"4.9 ⭐",icon:""},{label:"Played",val:"142",icon:""},{label:"Win Rate",val:"68%",icon:""}].map(x=>(
          <div key={x.label} className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-zinc-400 text-xs">{x.label}</div>
            <div className="text-white font-bold text-sm mt-1">{x.val}</div>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-zinc-500">v1.0 · AI Companion</div>
      </div>
    </div>
  );
}// ─── ChatArea (reusable) ───────────────────────────────────────────────────────
function ChatArea({messages,onSend,sending}:{messages:GameState["messages"];onSend:(t:string)=>void;sending?:boolean}) {
  const [input,setInput]=useState("");
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length===0 && (
          <div className="text-center text-zinc-500 mt-20 text-sm">Say hello! 👋</div>
        )}
        {messages.map(m=>{
          if (m.text === "__typing__") return <div key={m.id} className="flex justify-start"><div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-bl-md px-4 py-2 text-sm animate-pulse">typing...</div></div>;
          const isUser=m.from==="user";
          return (
            <div key={m.id} className={cn("flex",isUser?"justify-end":"justify-start")}>
              <div className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                isUser ? "bg-indigo-600 text-white rounded-br-md" : "bg-zinc-800 text-zinc-100 rounded-bl-md"
              )}>
                {m.text}
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-zinc-800 flex gap-2">
        <input className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          placeholder={sending?"Airi is thinking...":"Say something..."} value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!sending&&input.trim()&&(onSend(input.trim()),setInput(""))} disabled={sending} />
        <button onClick={()=>!sending&&input.trim()&&(onSend(input.trim()),setInput(""))} disabled={sending}
          className="px-5 py-2 bg-indigo-600 rounded-xl text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
          Send
        </button>
      </div>
    </div>
  );
}

function PlayScreen({state,update}:{state:GameState;update:(s:Partial<GameState>)=>void}) {
  const [sub,setSub]=useState<"games"|"chat">("games");

  const [sending,setSending]=useState(false);
  function handleSend(text: string) {
    if (sending) return;
    const newMsg = { id: crypto.randomUUID(), from: "user" as const, text, ts: Date.now() };
    const typingMsg = { id: "typing", from: "airi" as const, text: "__typing__", ts: Date.now() };
    const msgs = [...state.messages, newMsg, typingMsg];
    update({ messages: msgs });
    setSending(true);
    API.chat(msgs.slice(0,-1).map(({from, text}) => ({role: from === "user" ? "user" : "assistant", content: text})))
      .then(data => {
        const reply = { id: crypto.randomUUID(), from: "airi" as const, text: data.reply || "I'm here! What can I help you with?", ts: Date.now() };
        update({ messages: [...msgs.slice(0,-1), reply] });
      })
      .catch(() => {
        const reply = { id: crypto.randomUUID(), from: "airi" as const, text: "Connection error — is the backend running?", ts: Date.now() };
        update({ messages: [...msgs.slice(0,-1), reply] });
      })
      .finally(() => setSending(false));
  }

  if (state.gamePhase!=="idle" && state.selectedGame) {
    const game = state.games.find(g=>g.id===state.selectedGame)!;
    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <button onClick={()=>update({gamePhase:"idle",selectedGame:null,score:0,moves:0})} className="text-sm text-indigo-400 hover:text-indigo-300">← Back</button>
          <span className="text-xl">{game.icon}</span>
          <div className="text-xs text-zinc-500">v1.0</div>
        </div>
        <div className="text-center font-bold text-white">{game.name}</div>

        {state.gamePhase==="difficulty" && (
          <div className="flex flex-col gap-3 mt-4">
            <div className="text-center text-sm text-zinc-400">Choose difficulty</div>
            {(["easy","medium","hard"] as const).map(d=>(
              <button key={d} onClick={()=>update({difficulty:d,gamePhase:"playing"})}
                className="w-full py-3 rounded-xl font-semibold capitalize text-sm transition-colors bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700">
                {d} {d==="easy"?"— 3 min":d==="medium"?"— 2 min":"— 1 min"}
              </button>
            ))}
          </div>
        )}

        {state.gamePhase==="playing" && (
          <div className="mt-2">
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[0,1,2,3,4,5,6,7].map(i=>(
                <button key={i} onClick={()=>update({moves:state.moves+1,score:Math.min(100,state.score+5)})}
                  className="aspect-square bg-indigo-600 rounded-lg flex items-center justify-center text-2xl hover:bg-indigo-500 transition-colors"
                >?
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm text-zinc-400">
              <span>Moves: {state.moves}</span>
              <span>Score: {state.score}</span>
            </div>
            <button onClick={()=>update({gamePhase:"won",xp:state.xp+50})}
              className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors">
              ✓ Finish Game
            </button>
          </div>
        )}

        {(state.gamePhase==="won"||state.gamePhase==="lost") && (
          <div className="text-center mt-6 flex flex-col items-center gap-3">
            <div className="text-5xl">{state.gamePhase==="won"?"🎉":"😢"}</div>
            <div className="text-xl font-bold text-white">{state.gamePhase==="won"?"You Won!":"Game Over"}</div>
            <div className="text-sm text-zinc-400">Score: {state.score} · Moves: {state.moves}</div>
            <button onClick={()=>update({gamePhase:"idle",selectedGame:null,score:0,moves:0})}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-colors">
              Back to Games
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-zinc-800">
        {([["games","Games"],["chat","Chat"]] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setSub(t)}
            className={cn("flex-1 py-3 text-sm font-semibold transition-colors border-b-2",
              sub===t?"border-indigo-500 text-indigo-400":"border-transparent text-zinc-500")}>
            {label}
          </button>
        ))}
      </div>

      {sub==="games"?(
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {state.games.map(g=>(
            <div key={g.id} className="bg-zinc-900 rounded-xl p-4 flex items-center gap-3 border border-zinc-800">
              <span className="text-3xl">{g.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm">{g.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{g.desc}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-zinc-400">⭐ {g.rating}</span>
                  <span className="text-xs text-zinc-600">·</span>
                  <span className="text-xs text-zinc-400">{g.players.toLocaleString()} online</span>
                </div>
              </div>
              <button onClick={()=>update({selectedGame:g.id,gamePhase:"difficulty"})}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg whitespace-nowrap transition-colors">
                ▶
              </button>
            </div>
          ))}
        </div>
      ):(
        <ChatArea messages={state.messages} onSend={handleSend} sending={sending} />
      )}
    </div>
  );
}function RewardsScreen({state}:{state:GameState}) {
  const [sub,setSub]=useState<"badges"|"xp"|"history">("badges");
  const progress = (state.xp % XP_PER_LEVEL) / XP_PER_LEVEL;
  const nextXP = XP_PER_LEVEL - (state.xp % XP_PER_LEVEL);

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1 pb-24">
      {/* Level */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
        <div className="text-center mb-3">
          <div className="text-4xl font-black text-white">Level {state.level}</div>
          <div className="text-xs text-zinc-500 mt-1">{nextXP} XP to Level {state.level+1}</div>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full transition-all" style={{width:`${progress*100}%`}} />
        </div>
        <div className="text-center text-xs text-indigo-400">{Math.round(progress*100)}% to Level {state.level+1}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
          <div className="text-indigo-400 font-black text-lg">{state.xp.toLocaleString()}</div>
          <div className="text-zinc-500 text-xs mt-0.5">Total XP</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
          <div className="text-rose-400 font-black text-lg">{state.streak} 🔥</div>
          <div className="text-zinc-500 text-xs mt-0.5">Streak</div>
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
          <div className="text-amber-400 font-black text-lg">{state.badges.filter(b=>b.earned).length}</div>
          <div className="text-zinc-500 text-xs mt-0.5">Badges</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {([["badges","Badges"],["xp","XP Log"],["history","History"]] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setSub(t)}
            className={cn("flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2",
              sub===t?"border-indigo-500 text-indigo-400":"border-transparent text-zinc-500")}>
            {label}
          </button>
        ))}
      </div>

      {sub==="badges"&&(
        <div className="grid grid-cols-2 gap-3">
          {state.badges.map(b=>(
            <div key={b.id} className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all",
              b.earned?"bg-zinc-900 border-zinc-800":"bg-zinc-900/50 border-zinc-800 opacity-40")}>
              <span className="text-3xl">{b.icon}</span>
              <div className="text-xs font-semibold text-white">{b.name}</div>
              <div className="text-xs text-zinc-500">{b.desc}</div>
            </div>
          ))}
        </div>
      )}

      {sub==="xp"&&(
        <div className="space-y-2">
          {state.xpLog.map((x,i)=>(
            <div key={i} className="flex justify-between items-center bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-800">
              <div className="text-sm text-zinc-300">{x.label}</div>
              <div className="text-sm font-bold text-indigo-400">+{x.xp} XP</div>
            </div>
          ))}
        </div>
      )}

      {sub==="history"&&(
        <div className="text-center text-zinc-600 text-sm py-8">
          No games played today. Start playing! 🎮
        </div>
      )}
    </div>
  );
}function SettingsScreen({state,update}:{state:GameState;update:(s:Partial<GameState>)=>void}) {
  const {cfg} = state;
  const set = (k: string, val: any) => update({cfg:{...cfg,[k]:val}});
  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto flex-1 pb-24">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-6xl">😊</div>
        <div className="text-white font-bold text-lg">{cfg.name}</div>
        <div className="text-xs text-zinc-500">Level {state.level} · {state.xp.toLocaleString()} XP</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {([["char","Character"],["voice","Voice"],["game","Game"]] as const).map(([t,label])=>(
          <button key={t} onClick={()=>set("tab",t)}
            className={cn("flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2",
              cfg.tab===t?"border-indigo-500 text-indigo-400":"border-transparent text-zinc-500")}>
            {label}
          </button>
        ))}
      </div>

      {cfg.tab==="char"&&(
        <div className="flex flex-col gap-4 py-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Name</span>
            <input className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500" value={cfg.name} onChange={e=>set("name",e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Model</span>
            <select className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" value={cfg.model} onChange={e=>set("model",e.target.value)}>
              <option>GPT-4o</option>
              <option>Claude 3.7</option>
              <option>DeepSeek V3</option>
              <option>Ollama (local)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Avatar Style</span>
            <select className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" value={cfg.avatar} onChange={e=>set("avatar",e.target.value)}>
              <option>Emoji</option>
              <option>VRM 3D</option>
              <option>Live2D</option>
            </select>
          </label>
        </div>
      )}

      {cfg.tab==="voice"&&(
        <div className="flex flex-col gap-4 py-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Voice Preset</span>
            <select className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" value={cfg.voice} onChange={e=>set("voice",e.target.value)}>
              <option>Alloy (neutral)</option>
              <option>Nova (warm)</option>
              <option>Shimmer (bright)</option>
              <option>Echo (deep)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Push to Talk</span>
            <div className="flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-300">Enable push-to-talk</span>
              <button onClick={()=>set("pushToTalk",!cfg.pushToTalk)}
                className={cn("w-12 h-6 rounded-full transition-colors relative",cfg.pushToTalk?"bg-indigo-600":"bg-zinc-700")}>
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",cfg.pushToTalk?"translate-x-7":"translate-x-1")} />
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase">Music Volume ({cfg.musicVol}%)</span>
            <input type="range" min="0" max="100" value={cfg.musicVol}
              onChange={e=>set("musicVol",Number(e.target.value))}
              className="w-full accent-indigo-500" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase">SFX Volume ({cfg.sfxVol}%)</span>
            <input type="range" min="0" max="100" value={cfg.sfxVol}
              onChange={e=>set("sfxVol",Number(e.target.value))}
              className="w-full accent-indigo-500" />
          </label>
        </div>
      )}

      {cfg.tab==="game"&&(
        <div className="flex flex-col gap-4 py-2">
          <div className="text-sm text-zinc-400">Game settings will appear here.</div>
        </div>
      )}
    </div>
  );
}
// ─── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState<GameState>(loadState);
  const update = useCallback((partial: Partial<GameState>) => {
    setState(prev => { const next = { ...prev, ...partial }; saveState(next); return next; });
  }, []);

  useEffect(() => { saveState(state); }, [state]);

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden" style={{fontFamily:"system-ui,-apple-system,sans-serif"}}>
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm">😊</div>
          <div className="text-sm font-semibold text-white">{state.playerName}</div>
          <div className="text-xs bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded-full">Online</div>
        </div>
        <div className="text-sm font-bold text-indigo-400">{state.xp.toLocaleString()} XP</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {state.tab === "home" && <HomeScreen state={state} update={update} />}
        {state.tab === "play" && <PlayScreen state={state} update={update} />}
        {state.tab === "rewards" && <RewardsScreen state={state} />}
        {state.tab === "settings" && <SettingsScreen state={state} update={update} />}
      </div>

      {/* Bottom Nav */}
      <div className="flex border-t border-zinc-800 bg-zinc-950 pb-safe">
        {[
          { tab: "home", icon: "⌂", label: "HOME" },
          { tab: "play", icon: "▶", label: "PLAY" },
          { tab: "rewards", icon: "🎁", label: "REWARDS" },
          { tab: "settings", icon: "⚙️", label: "SETTINGS" },
        ].map(nav => (
          <button key={nav.tab} onClick={() => update({ tab: nav.tab as GameState["tab"] })}
            className={cn("flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-semibold transition-colors", state.tab === nav.tab ? "text-indigo-400" : "text-zinc-500")}>
            <span className="text-lg">{nav.icon}</span>
            {nav.label}
          </button>
        ))}
      </div>
    </div>
  );
}
