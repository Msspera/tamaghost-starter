
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import 'dotenv/config';
import cors from 'cors';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' }});

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const pub = new Redis(redisUrl);
const sub = new Redis(redisUrl);
io.adapter(createAdapter(pub, sub));

io.on('connection', (socket) => {
  const petId = String(socket.handshake.query.petId || 'default');
  const username = String(socket.handshake.query.username || 'anon');
  socket.join(`pet:${petId}`);
  socket.to(`pet:${petId}`).emit('system', { message: `${username} entrou.` });

  socket.on('msg', (payload) => {
    io.to(`pet:${petId}`).emit('msg', { u: username, m: String(payload.m || ''), t: Date.now() });
    // Resposta simples do tamaghost (regras bobas)
    const m = String(payload.m || '').toLowerCase();
    let reply = 'Buu! :)';
    if (m.includes('oi') || m.includes('ola') || m.includes('olá')) reply = 'Olá! Eu sou o Tamaghost. Obrigado por brincar comigo!';
    if (m.includes('fome')) reply = 'Se você me alimentar, fico feliz!';
    if (m.includes('banho')) reply = 'Adoro bolhas ✨';
    setTimeout(()=> io.to(`pet:${petId}`).emit('system', { message: reply }), 400);
  });

  socket.on('disconnect', ()=>{
    socket.to(`pet:${petId}`).emit('system', { message: `${username} saiu.` });
  });
});

httpServer.listen(7001, ()=> console.log('Chat WS on :7001'));
