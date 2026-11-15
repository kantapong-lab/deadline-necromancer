// Session handlers: mod:create, mod:join, player:join, disconnect.
const { MAX_PLAYERS } = require('../../engine');
const { token, newCode, ack } = require('../rooms');

module.exports = function registerSession(socket, { rooms, ctx, member, pushState }) {
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
};
