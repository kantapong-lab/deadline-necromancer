// Moderator handler: mod:do (start/secrets/kick/reset and the engine-delegated actions).
const { Game, MIN_PLAYERS, MAX_PLAYERS } = require('../../engine');
const { ack } = require('../rooms');

module.exports = function registerModerator(socket, { io, ctx, pushState }) {
  socket.on('mod:do', (data, cb) => {
    const { action, payload } = data || {};
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
        else if (action === 'openRound2') err = g.openRound2();
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
};
