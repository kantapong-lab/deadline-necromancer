// Player handlers: p:chat, p:dark, p:vote, p:night, p:event, p:booster (all go through playerAct).
const { ack } = require('../rooms');

module.exports = function registerPlayer(socket, { ctx, member, pushState }) {
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
  socket.on('p:traproll', playerAct((g, pid) => g.rerollTraps(pid)));
  socket.on('p:event', playerAct((g, pid, d) => g.castEventChoice(pid, d.accept)));
  socket.on('p:booster', playerAct((g, pid, d) => g.castBooster(pid, d.key)));
};
