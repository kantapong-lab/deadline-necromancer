// Room store and the helpers every handler shares: codes, tokens, lobby view, state push, ack.
const { MIN_PLAYERS, MAX_PLAYERS } = require('../engine');

const rooms = new Map();
const token = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
function newCode() { const L = 'ABCDEFGHJKMNPQRSTUVWXYZ'; let c; do { c = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join(''); } while (rooms.has(c)); return c; }

function lobbyView(room, extra) {
  return { phase: 'LOBBY', code: room.code, min: MIN_PLAYERS, max: MAX_PLAYERS, ...extra,
    players: room.members.map((m, i) => ({ idx: i, name: m.name, connected: m.sockets.size > 0 })) };
}
// pushState needs the socket.io server, so it is created once at bootstrap: const pushState = createPushState(io)
function createPushState(io) {
  return function pushState(room) {
    const g = room.game;
    for (const m of room.members) {
      if (!m.sockets.size) continue;
      const view = g ? g.viewFor(m.pid) : lobbyView(room, { role: 'player', youName: m.name });
      for (const sid of m.sockets) io.to(sid).emit('state', view);
    }
    const modView = g ? g.modView(room.secrets) : lobbyView(room, { role: 'moderator', secrets: room.secrets, canStart: room.members.length >= MIN_PLAYERS && room.members.length <= MAX_PLAYERS });
    const fullBase = g && room.fullSockets && room.fullSockets.size && !room.secrets ? g.modView(true) : modView;   // 3D spectator screens always get the secret view
    const fullView = g ? { ...fullBase, darkChat: g.darkChat } : fullBase;                                       // …plus the dark faction's night chat (server layer only, so engine snapshots stay unchanged)
    for (const sid of room.modSockets) io.to(sid).emit('state', room.fullSockets && room.fullSockets.has(sid) ? fullView : modView);
    // presentation events for the 3D Moderator screen: drained every push (so they never pile up), sent to Moderator sockets only,
    // and redacted like modView(secrets) — skills / curses / trap placement only travel while Secrets are on
    if (g) { const batch = g.drainFx(); if (batch.length) { const out = g.redactFx(batch, room.secrets); for (const sid of room.modSockets) { const o = room.fullSockets && room.fullSockets.has(sid) ? batch : out; if (o.length) io.to(sid).emit('fx', o); } } }
  };
}
const ack = (cb, v) => { if (typeof cb === 'function') cb(v); };

module.exports = { rooms, token, newCode, lobbyView, createPushState, ack };
