
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const fastify = Fastify({ logger: false });
await fastify.register(cors, {
  origin: process.env.CORS_ALLOW_ORIGIN || '*'
});

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const kafka = new Kafka({
  clientId: 'tamaghost-interactions',
  brokers,
  ssl: process.env.KAFKA_SSL_ENABLED === 'true' ? true : false,
  sasl: process.env.KAFKA_SASL_ENABLED === 'true' ? {
    mechanism: 'plain',
    username: process.env.KAFKA_SASL_USERNAME || '',
    password: process.env.KAFKA_SASL_PASSWORD || '',
  } : undefined,
});

const producer = kafka.producer();
await producer.connect();

type Action = 'FEED'|'PET'|'BATH'|'BUY_OUTFIT'|'CHANGE_LOOK';
async function publish(petId: string, action: Action, payload:any, username:string) {
  const evt = {
    eventId: randomUUID(),
    petId, action, payload, username,
    at: Date.now()
  };
  await producer.send({ topic: 'interactions', messages: [{ key: petId, value: JSON.stringify(evt) }] });
  return { ok: true, evt };
}

fastify.get('/health', async ()=> ({ ok: true }));

fastify.post('/feed', async (req, reply)=> {
  const body:any = await req.body;
  const res = await publish(body.petId, 'FEED', {}, body.username || 'anon');
  reply.send(res);
});
fastify.post('/pet', async (req, reply)=> {
  const body:any = await req.body;
  const res = await publish(body.petId, 'PET', {}, body.username || 'anon');
  reply.send(res);
});
fastify.post('/bath', async (req, reply)=> {
  const body:any = await req.body;
  const res = await publish(body.petId, 'BATH', {}, body.username || 'anon');
  reply.send(res);
});
fastify.post('/buy-outfit', async (req, reply)=> {
  const body:any = await req.body;
  const res = await publish(body.petId, 'BUY_OUTFIT', { item: body.item || 'default' }, body.username || 'anon');
  reply.send(res);
});
fastify.post('/change-look', async (req, reply)=> {
  const body:any = await req.body;
  const res = await publish(body.petId, 'CHANGE_LOOK', { style: body.style || 'default' }, body.username || 'anon');
  reply.send(res);
});

fastify.listen({ port: 4001, host: '0.0.0.0' });
console.log('Interactions API on :4001');
