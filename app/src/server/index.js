// Deadline Necromancer — multiplayer server (Node + Socket.IO)
// รัน: node src/server/index.js   →  ผู้เล่นเปิด http://<host>:3000/   Moderator เปิด http://<host>:3000/mod
// Bootstrap only: build the HTTP server + Socket.IO, wire the per-socket handlers, listen. Requiring this file starts listening.
const http = require('http');
const { Server } = require('socket.io');
const { handleRequest } = require('./http');
const { rooms, createPushState } = require('./rooms');
const registerSession = require('./handlers/session');
const registerModerator = require('./handlers/moderator');
const registerPlayer = require('./handlers/player');

const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(handleRequest);
const io = new Server(httpServer);
const pushState = createPushState(io);

io.on('connection', socket => {
  const ctx = () => rooms.get(socket.data.code);
  const member = () => { const r = ctx(); return r && r.members.find(m => m.token === socket.data.token); };
  const deps = { io, rooms, ctx, member, pushState };
  registerSession(socket, deps);
  registerModerator(socket, deps);
  registerPlayer(socket, deps);
});

httpServer.listen(PORT, () => console.log(`Deadline Necromancer: ผู้เล่น http://localhost:${PORT}/  ·  Moderator http://localhost:${PORT}/mod`));
module.exports = { httpServer, io, rooms };
