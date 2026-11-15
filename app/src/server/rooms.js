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
    for (const sid of room.modSockets) io.to(sid).emit('state', modView);
  };
}
const ack = (cb, v) => { if (typeof cb === 'function') cb(v); };

module.exports = { rooms, token, newCode, lobbyView, createPushState, ack };
