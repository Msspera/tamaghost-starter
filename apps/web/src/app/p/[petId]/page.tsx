
'use client';
import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import clsx from 'clsx';

const API_INTERACTIONS = process.env.NEXT_PUBLIC_API_INTERACTIONS_URL!;
const API_PET = process.env.NEXT_PUBLIC_API_PET_URL!;
const API_COMMENTS = process.env.NEXT_PUBLIC_API_COMMENTS_URL!;
const API_LEADERBOARD = process.env.NEXT_PUBLIC_API_LEADERBOARD_URL!;
const WS_URL = process.env.NEXT_PUBLIC_WS_URL!;
const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE_URL || '/assets';

type PetState = {
  id: string;
  hunger: number;
  happiness: number;
  cleanliness: number;
  mood: string;
  outfit: string[];
  lastUpdated: number;
}

export default function Page({ params }: { params: { petId: string } }) {
  const petId = params.petId;
  const [state, setState] = useState<PetState | null>(null);
  const [msg, setMsg] = useState('');
  const [chat, setChat] = useState<{u:string; m:string; t:number}[]>([]);
  const [username, setUsername] = useState(() => 'guest-' + Math.floor(Math.random()*9999));
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const socket = useMemo(() => io(WS_URL, { transports: ['websocket'], query: { petId, username } }), [petId]);

  const fetchState = async () => {
    const r = await fetch(`${API_PET}/pet/${petId}`);
    setState(await r.json());
  };
  const fetchLeaderboard = async () => {
    const r = await fetch(`${API_LEADERBOARD}/top?limit=5`);
    setLeaderboard(await r.json());
  };

  useEffect(() => {
    fetchState();
    fetchLeaderboard();

    // --- ATUALIZAÇÃO AUTOMÁTICA (Polling) ---
    // Chama o fetchState a cada 10 segundos para refletir o decaimento
    const intervalId = setInterval(() => {
      fetchState();
    }, 3000); 

    // Listeners do Chat
    socket.on('msg', (data:any) => setChat(c => [...c.slice(-30), data]));
    socket.on('system', (data:any) => setChat(c => [...c.slice(-30), {u:'tamaghost', m:data.message, t:Date.now()}]));
    
    // Cleanup ao sair da página
    return () => { 
      socket.close();
      clearInterval(intervalId); // Importante para não deixar o timer rodando no fundo
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(path: string, body: any = {}) {
    await fetch(`${API_INTERACTIONS}/${path}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ petId, ...body, username }),
    });
    fetchState();
    fetchLeaderboard();
  }

  async function send() {
    if (!msg) return;
    socket.emit('msg', { petId, m: msg, u: username });
    setMsg('');
  }

  const stat = (label:string, v:number, color:string) => (
    <div className="space-y-1">
      <div className="text-sm text-slate-300">{label}</div>
      <div className="w-full bg-slate-800 rounded h-2 overflow-hidden">
        {/* Adicionado 'transition-all duration-700' para suavizar a mudança */}
        <div 
          className={clsx('h-2 transition-all duration-700 ease-in-out', color)} 
          style={{ width: `${Math.max(0, Math.min(100,v))}%`}}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen grid md:grid-cols-[1fr_360px]">
      <main className="p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-semibold">Tamaghost — {petId}</h1>
            <div className="text-sm text-slate-300">Você: <input value={username} onChange={e=>setUsername(e.target.value)} className="bg-slate-900 rounded px-2 py-1 ml-2 outline-none"/></div>
          </header>

          {/* PET CANVAS */}
          <div className="mt-8">
            <div className="relative mx-auto w-72 h-72 rounded-full gradient-ghost shadow-glow">
              <div className="absolute inset-0 rounded-full border border-white/10"/>
              {/* Olhos */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-8">
                <div className="w-6 h-6 rounded-full bg-black/70" />
                <div className="w-6 h-6 rounded-full bg-black/70" />
              </div>
              {/* Boca */}
              <div className="absolute left-1/2 top-[60%] -translate-x-1/2 w-12 h-2 rounded-full bg-black/40"/>
              {/* Roupa simples */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-indigo-600/40 to-transparent rounded-b-full"/>
            </div>
          </div>

          {/* Ações */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
            <button onClick={()=>act('feed')} className="px-3 py-2 bg-emerald-600 rounded hover:bg-emerald-500">Alimentar</button>
            <button onClick={()=>act('pet')} className="px-3 py-2 bg-pink-600 rounded hover:bg-pink-500">Carinho</button>
            <button onClick={()=>act('bath')} className="px-3 py-2 bg-sky-600 rounded hover:bg-sky-500">Dar banho</button>
            <button onClick={()=>act('buy-outfit', { item:'chapelinho' })} className="px-3 py-2 bg-amber-600 rounded hover:bg-amber-500">Comprar roupa</button>
            <button onClick={()=>act('change-look', { style:'fantasma-neon' })} className="px-3 py-2 bg-violet-600 rounded hover:bg-violet-500">Novo visual</button>
          </div>

          {/* Stats */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {state && (
              <div className="col-span-2 p-4 rounded bg-slate-900/60 border border-white/5">
                <div className="text-lg font-medium mb-4">Status do bichinho</div>
                <div className="grid gap-3">
                  {stat('Fome', 100 - state.hunger, 'bg-emerald-500')}
                  {stat('Felicidade', state.happiness, 'bg-pink-500')}
                  {stat('Limpeza', state.cleanliness, 'bg-sky-500')}
                </div>
                <div className="mt-4 text-slate-300 text-sm">Humor: <b>{state.mood}</b> — Atualizado {new Date(state.lastUpdated).toLocaleTimeString()}</div>
              </div>
            )}
            <div className="p-4 rounded bg-slate-900/60 border border-white/5">
              <div className="text-lg font-medium mb-4">Ranking (Top 5)</div>
              <div className="space-y-2 text-sm">
                {leaderboard?.total?.map((r:any, i:number) => (
                  <div key={i} className="flex justify-between">
                    <span>{i+1}. {r.member}</span><span className="text-slate-300">{r.score}</span>
                  </div>
                )) || <div className="text-slate-400">Sem dados ainda…</div>}
              </div>
            </div>
          </div>

          {/* Comentários */}
          <Comments petId={petId} />

        </div>
      </main>

      {/* CHAT */}
      <aside className="border-l border-white/5 p-6">
        <div className="text-lg font-medium mb-2">Chat</div>
        <div className="h-[70vh] overflow-y-auto space-y-2 p-2 rounded bg-slate-900/60 border border-white/5">
          {chat.map((c,i) => (
            <div key={i} className="text-sm">
              <b className={c.u==='tamaghost' ? 'text-violet-400' : 'text-slate-200'}>{c.u}</b>: <span className="text-slate-300">{c.m}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter' && send()} placeholder="Diga algo…" className="flex-1 bg-slate-900 rounded px-3 py-2 outline-none"/>
          <button onClick={send} className="px-3 py-2 bg-violet-600 rounded hover:bg-violet-500">Enviar</button>
        </div>
      </aside>
    </div>
  )
}

function Comments({ petId }:{ petId:string }) {
  const [list, setList] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [username, setUsername] = useState(()=>'guest-'+Math.floor(Math.random()*9999));

  const load = async ()=>{
    const r = await fetch(`${API_COMMENTS}/pet/${petId}`);
    setList(await r.json());
  };

  useEffect(()=>{ load(); }, []);

  async function submit() {
    await fetch(`${API_COMMENTS}/pet/${petId}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ rating, text, username })
    });
    setText('');
    load();
  }

  return (
    <div className="mt-8 p-4 rounded bg-slate-900/60 border border-white/5">
      <div className="text-lg font-medium mb-4">Comentários & Avaliações</div>
      <div className="space-y-2">
        {list.map((c, i) => (
          <div key={i} className="p-3 rounded bg-slate-800/60">
            <div className="text-sm"><b>{c.username}</b> — ⭐ {c.rating}</div>
            <div className="text-slate-300 text-sm">{c.text}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid md:grid-cols-[auto_1fr_auto_auto] gap-2 items-center">
        <input className="bg-slate-900 rounded px-2 py-1 outline-none" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="bg-slate-900 rounded px-2 py-1 outline-none" placeholder="Deixe seu comentário…" value={text} onChange={e=>setText(e.target.value)} />
        <select className="bg-slate-900 rounded px-2 py-1 outline-none" value={rating} onChange={e=>setRating(parseInt(e.target.value))}>
          {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
        </select>
        <button onClick={submit} className="px-3 py-2 bg-emerald-600 rounded hover:bg-emerald-500">Enviar</button>
      </div>
    </div>
  );
}
