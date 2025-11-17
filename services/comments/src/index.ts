
import Fastify from 'fastify';
import cors from '@fastify/cors';
import Database from 'better-sqlite3';
import 'dotenv/config';

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: process.env.CORS_ALLOW_ORIGIN || '*' });

const file = process.env.SQLITE_FILE || '/data/app.db';
const db = new Database(file);
db.exec(`CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id TEXT,
  username TEXT,
  rating INT,
  text TEXT,
  created_at INT
);`);

fastify.get('/health', async ()=>({ ok:true }));

fastify.get('/pet/:id', async (req, reply)=>{
  // @ts-ignore
  const id = req.params.id as string;
  const rows = db.prepare('SELECT username,rating,text,created_at FROM comments WHERE pet_id = ? ORDER BY created_at DESC LIMIT 100').all(id);
  reply.send(rows);
});

fastify.post('/pet/:id', async (req, reply)=>{
  // @ts-ignore
  const id = req.params.id as string;
  const body:any = await req.body;
  const rating = Math.max(1, Math.min(5, parseInt(body.rating)));
  db.prepare('INSERT INTO comments (pet_id,username,rating,text,created_at) VALUES (?,?,?,?,?)')
    .run(id, body.username || 'anon', rating, String(body.text||'').slice(0, 500), Date.now());
  reply.send({ ok:true });
});

fastify.listen({ port: 4003, host: '0.0.0.0' });
console.log('Comments API on :4003');
