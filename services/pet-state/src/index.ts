
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Kafka } from 'kafkajs';
import Database from 'better-sqlite3';
import 'dotenv/config';

// CONFIGURAÇÃO DE DECAIMENTO
const DECAY_INTERVAL_MS = 10_000; // 10 segundos
const DECAY_PERCENT = 5;          // 1% (ou 1 ponto)

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: process.env.CORS_ALLOW_ORIGIN || '*' });

// Persistence (DEV: SQLite)
const mode = process.env.DB_MODE || 'sqlite';
let db: any;
if (mode === 'sqlite') {
  const file = process.env.SQLITE_FILE || '/data/app.db';
  db = new Database(file);
  db.exec(`CREATE TABLE IF NOT EXISTS pet_state (
    pet_id TEXT PRIMARY KEY,
    hunger INT, happiness INT, cleanliness INT, mood TEXT, outfit TEXT, last_updated INT
  );`);
} else {
  // In produção usar AJD via SODA REST; aqui omitimos para manter o starter simples.
}

function get(petId:string) {
  const row = db.prepare('SELECT * FROM pet_state WHERE pet_id = ?').get(petId);
  
  // Se não existir, cria o padrão (sem alterações aqui)
  if (!row) {
    const now = Date.now();
    db.prepare('INSERT OR REPLACE INTO pet_state (pet_id,hunger,happiness,cleanliness,mood,outfit,last_updated) VALUES (?,?,?,?,?,?,?)')
      .run(petId, 50, 50, 50, 'curioso', JSON.stringify([]), now);
    return { id: petId, hunger: 50, happiness: 50, cleanliness: 50, mood:'curioso', outfit:[], lastUpdated: now };
  }

  // LÓGICA DE DECAIMENTO (Lazy Decay)
  const now = Date.now();
  const elapsed = now - row.last_updated;
  const ticks = Math.floor(elapsed / DECAY_INTERVAL_MS); // Quantos intervalos de 10s passaram

  let { hunger, happiness, cleanliness } = row;

  if (ticks > 0) {
    const decayAmount = ticks * DECAY_PERCENT;

    // Fome aumenta (máximo 100)
    hunger = Math.min(100, hunger + decayAmount);
    
    // Felicidade e Limpeza diminuem (mínimo 0)
    happiness = Math.max(0, happiness - decayAmount);
    cleanliness = Math.max(0, cleanliness - decayAmount);
  }

  // Retorna o estado calculado "ao vivo"
  return { 
    id: row.pet_id, 
    hunger: hunger, 
    happiness: happiness, 
    cleanliness: cleanliness, 
    mood: row.mood, 
    outfit: JSON.parse(row.outfit||'[]'), 
    lastUpdated: row.last_updated 
    // Nota: Mantemos o lastUpdated original do banco para que o cálculo 
    // continue consistente até que haja uma nova interação (que salvará o novo estado).
  };
}

function save(p:any) {
  db.prepare('INSERT OR REPLACE INTO pet_state (pet_id,hunger,happiness,cleanliness,mood,outfit,last_updated) VALUES (?,?,?,?,?,?,?)')
    .run(p.id, p.hunger, p.happiness, p.cleanliness, p.mood, JSON.stringify(p.outfit||[]), p.lastUpdated);
}

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const kafka = new Kafka({ clientId: 'tamaghost-pet-state', brokers });
const consumer = kafka.consumer({ groupId: 'pet-state' });
await consumer.connect();
await consumer.subscribe({ topic: 'interactions', fromBeginning: true });

function clamp(n:number){ return Math.max(0, Math.min(100, n)); }

await consumer.run({
  eachMessage: async ({ message }) => {
    if (!message.value) return;
    const evt = JSON.parse(message.value.toString());
    const p = get(evt.petId);
    switch(evt.action){
      case 'FEED': p.hunger = clamp(p.hunger - 10); p.happiness = clamp(p.happiness + 5); break;
      case 'PET': p.happiness = clamp(p.happiness + 8); break;
      case 'BATH': p.cleanliness = clamp(p.cleanliness + 15); break;
      case 'BUY_OUTFIT': p.outfit = Array.from(new Set([...(p.outfit||[]), evt.payload?.item].filter(Boolean))); p.happiness = clamp(p.happiness + 4); break;
      case 'CHANGE_LOOK': p.mood = 'estiloso'; break;
    }
    const sum = p.happiness + (100 - p.hunger) + p.cleanliness;
    p.mood = sum > 210 ? 'radiante' : sum > 180 ? 'feliz' : sum > 140 ? 'ok' : 'tristonho';
    p.lastUpdated = Date.now();
    save(p);
  }
});

fastify.get('/pet/:id', async (req, reply)=> {
  // @ts-ignore
  const id = req.params.id as string;
  reply.send(get(id));
});

fastify.listen({ port: 4002, host: '0.0.0.0' });
console.log('Pet State API on :4002');
