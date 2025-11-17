
import Fastify from 'fastify';
import cors from '@fastify/cors';
import Redis from 'ioredis';
import 'dotenv/config';

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: process.env.CORS_ALLOW_ORIGIN || '*' });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function topZ(key:string, limit=10) {
  const res = await redis.zrevrange(key, 0, limit-1, 'WITHSCORES');
  const arr: any[] = [];
  for (let i = 0; i < res.length; i+=2) arr.push({ member: res[i], score: Number(res[i+1]) });
  return arr;
}

fastify.get('/top', async (req, reply)=>{
  const limit = Number((req.query as any).limit || 10);
  const total = await topZ('lb:total', limit);
  const feed = await topZ('lb:feed', limit);
  const pet = await topZ('lb:pet', limit);
  const bath = await topZ('lb:bath', limit);
  reply.send({ total, feed, pet, bath });
});

fastify.listen({ port: 4005, host: '0.0.0.0' });
console.log('Leaderboard API on :4005');
