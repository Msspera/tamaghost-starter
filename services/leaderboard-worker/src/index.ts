
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import 'dotenv/config';

const brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const kafka = new Kafka({ clientId: 'tamaghost-leaderboard-worker', brokers });
const consumer = kafka.consumer({ groupId: 'leaderboard-worker' });
await consumer.connect();
await consumer.subscribe({ topic: 'interactions', fromBeginning: true });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

function key(action:string) { return `lb:${action.toLowerCase()}`; }

await consumer.run({
  eachMessage: async ({ message }) => {
    if (!message.value) return;
    const evt = JSON.parse(message.value.toString());
    const user = evt.username || 'anon';
    const action = evt.action;
    await redis.zincrby(key('total'), 1, user);
    await redis.zincrby(key(action), 1, user);
  }
});

console.log('Leaderboard worker running…');
