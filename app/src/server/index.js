// Deadline Necromancer — multiplayer server (Node + Socket.IO)
// รัน: node src/server/index.js   →  ผู้เล่นเปิด http://<host>:3000/   Moderator เปิด http://<host>:3000/mod
const http = require('http');
const { Server } = require('socket.io');
const { Game, MIN_PLAYERS, MAX_PLAYERS } = require('../engine');
const { handleRequest } = require('./http');
const { rooms, token, newCode, createPushState, ack } = require('./rooms');

const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(handleRequest);
const io = new Server(httpServer);
const pushState = createPushState(io);

io.on('connection', socket => {
  const ctx = () => rooms.get(socket.data.code);
  const member = () => { const r = ctx(); return r && r.members.find(m => m.token === socket.data.token); };

  socket.on('mod:create', (_, cb) => {
    const code = newCode(), modToken = token();
    rooms.set(code, { code, modToken, modSockets: new Set([socket.id]), members: [], game: null, secrets: false });
    socket.data = { code, mod: true };
    ack(cb, { ok: true, code, modToken }); pushState(rooms.get(code));
  });
  socket.on('mod:join', ({ code, modToken } = {}, cb) => {
    const r = rooms.get((code || '').toUpperCase());
    if (!r || r.modToken !== modToken) return ack(cb, { ok: false, error: 'ห้องหรือรหัส Moderator ไม่ถูกต้อง' });
    r.modSockets.add(socket.id); socket.data = { code: r.code, mod: true };
    ack(cb, { ok: true, code: r.code }); pushState(r);
  });
  socket.on('player:join', ({ code, name, token: tk } = {}, cb) => {
    const r = rooms.get((code || '').toUpperCase());
    if (!r) return ack(cb, { ok: false, error: 'ไม่พบห้องนี้' });
    let m = tk && r.members.find(x => x.token === tk);
    if (!m) {
      name = String(name || '').trim().slice(0, 14);
      // เข้ากลับด้วยชื่อเดิม (ปิดแท็บแล้วเปิดใหม่): ยอมให้รับช่วงต่อได้เฉพาะเมื่อชื่อนั้นออฟไลน์อยู่
      const same = r.members.find(x => x.name === name && x.sockets.size === 0);
      if (same) { m = same; }
    }
    if (!m) {
      if (!name) return ack(cb, { ok: false, error: 'กรุณาใส่ชื่อ' });
      if (r.game) return ack(cb, { ok: false, error: 'เกมเริ่มไปแล้ว' });
      if (r.members.length >= MAX_PLAYERS) return ack(cb, { ok: false, error: 'ห้องเต็มแล้ว' });
      if (r.members.some(x => x.name === name)) return ack(cb, { ok: false, error: 'ชื่อนี้ถูกใช้แล้ว' });
      m = { token: token(), name, pid: null, sockets: new Set() }; r.members.push(m);
    }
    m.sockets.add(socket.id); socket.data = { code: r.code, token: m.token };
    ack(cb, { ok: true, token: m.token, code: r.code, name: m.name }); pushState(r);
  });
  socket.on('disconnect', () => {
    const r = ctx(); if (!r) return;
    if (socket.data.mod) r.modSockets.delete(socket.id);
    else { const m = member(); if (m) m.sockets.delete(socket.id); }
    pushState(r);
  });

  // ---- moderator actions ----
  socket.on('mod:do', ({ action, payload } = {}, cb) => {
    const r = ctx(); if (!r || !socket.data.mod) return ack(cb, { ok: false, error: 'ไม่ใช่ Moderator' });
    const g = r.game; let err = null;
    switch (action) {
      case 'start': {
        if (g && g.phase !== 'OVER') { err = 'เกมเริ่มแล้ว'; break; }
        const n = r.members.length;
        if (n < MIN_PLAYERS || n > MAX_PLAYERS) { err = `ต้องมีผู้เล่น ${MIN_PLAYERS}–${MAX_PLAYERS} คน (ตอนนี้ ${n})`; break; }
        const order = r.members.map((_, i) => i).sort(() => Math.random() - 0.5);   // สลับที่นั่ง
        const ordered = order.map(i => r.members[i]); ordered.forEach((m, i) => m.pid = i);
        r.game = new Game(ordered.map(m => m.name)); break;
      }
      case 'secrets': r.secrets = !!payload?.on; break;
      case 'kick': {
        if (r.game) { err = 'เตะผู้เล่นได้เฉพาะตอนอยู่ในล็อบบี้'; break; }
        const i = r.members.findIndex(m => m.token === payload?.token || m.name === payload?.name);
        if (i >= 0) { r.members[i].sockets.forEach(sid => io.to(sid).emit('kicked')); r.members.splice(i, 1); } break;
      }
      case 'reset': r.game = null; r.members.forEach(m => m.pid = null); break;
      default: {
        if (!g) { err = 'ยังไม่ได้เริ่มเกม'; break; }
        if (action === 'toVote') err = g.toVote();
        else if (action === 'closeVote') { if (g.phase !== 'VOTE') err = 'ไม่ได้อยู่ในเฟสโหวต'; else g.closeVote(); }
        else if (action === 'toNight') err = g.toNight();
        else if (action === 'closeNight') err = g.closeNight();
        else if (action === 'closeEvent') { if (!g.event?.pending) err = 'ไม่มีการโหวตการ์ดที่ค้างอยู่'; else g.closeEventVote(); }
        else if (action === 'closeBooster') { if (!g.booster.open) err = 'ไม่มีการโหวต Booster ที่ค้างอยู่'; else g.closeBoosterVote(); }
        else if (action === 'announce') { const t = String(payload?.text || '').trim().slice(0, 200); if (t) { g.sys('📣 Moderator: ' + t); g.log('ประกาศโดย Moderator', t); } }
        else if (action === 'pause') { g.paused = !!payload?.on; g.sys(g.paused ? '⏸️ Moderator พักเกมชั่วคราว' : '▶️ เกมดำเนินต่อ'); g.log(g.paused ? 'พักเกม' : 'เล่นต่อ'); }
        else if (action === 'timer') { const s = Number(payload?.sec); g.timer = s > 0 ? { sec: s, endsAt: Date.now() + s * 1000, phase: g.phase } : null; g.log(s > 0 ? `ตั้งเวลา ${s} วินาที` : 'ยกเลิกตัวจับเวลา'); }
        else err = 'คำสั่งไม่ถูกต้อง';
      }
    }
    pushState(r); ack(cb, err ? { ok: false, error: err } : { ok: true });
  });

  // ---- player actions ----
  const playerAct = (fn) => (data, cb) => {
    const r = ctx(), m = member();
    if (!r || !m || !r.game || m.pid == null) return ack(cb, { ok: false, error: 'ยังไม่ได้เริ่มเกม' });
    if (r.game.paused) return ack(cb, { ok: false, error: 'Moderator พักเกมอยู่' });
    const err = fn(r.game, m.pid, data || {});
    pushState(r); ack(cb, err ? { ok: false, error: err } : { ok: true });
  };
  socket.on('p:chat', playerAct((g, pid, d) => g.chat(pid, d.text)));
  socket.on('p:dark', playerAct((g, pid, d) => g.darkSay(pid, d.text)));
  socket.on('p:vote', playerAct((g, pid, d) => g.castVote(pid, d.target === 'SKIP' ? 'SKIP' : Number(d.target))));
  socket.on('p:night', playerAct((g, pid, d) => g.submitNight(pid, d)));
  socket.on('p:event', playerAct((g, pid, d) => g.castEventChoice(pid, d.accept)));
  socket.on('p:booster', playerAct((g, pid, d) => g.castBooster(pid, d.key)));
});

httpServer.listen(PORT, () => console.log(`Deadline Necromancer: ผู้เล่น http://localhost:${PORT}/  ·  Moderator http://localhost:${PORT}/mod`));
module.exports = { httpServer, io, rooms };
