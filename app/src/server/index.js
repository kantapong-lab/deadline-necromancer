// Deadline Necromancer — multiplayer server (Node + Socket.IO)
// รัน: node src/server/index.js   →  ผู้เล่นเปิด http://<host>:3000/   Moderator เปิด http://<host>:3000/mod
// Bootstrap only: build the HTTP server + Socket.IO, wire the per-socket handlers, listen. Requiring this file starts listening.
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const { handleRequest } = require('./http');
const { rooms, createPushState } = require('./rooms');
const registerSession = require('./handlers/session');
const registerModerator = require('./handlers/moderator');
const registerPlayer = require('./handlers/player');
const registerVoice = require('./handlers/voice');

const PORT = process.env.PORT || 3000;
// HTTPS (needed for the phone mic): both HTTPS_KEY and HTTPS_CERT (PEM file paths) -> https/wss; none -> plain http; anything else fails fast.
let tls = null;
if (process.env.HTTPS_KEY || process.env.HTTPS_CERT) {
  try {
    if (!process.env.HTTPS_KEY || !process.env.HTTPS_CERT) throw new Error('incomplete');
    tls = { key: fs.readFileSync(process.env.HTTPS_KEY), cert: fs.readFileSync(process.env.HTTPS_CERT) };
  } catch (e) {
    console.error('HTTPS_KEY and HTTPS_CERT must both be set to readable PEM file paths');
    process.exit(1);
  }
}
const SCHEME = tls ? 'https' : 'http';
const httpServer = tls ? https.createServer(tls, handleRequest) : http.createServer(handleRequest);
const io = new Server(httpServer);
const pushState = createPushState(io);

io.on('connection', socket => {
  const ctx = () => rooms.get(socket.data.code);
  const member = () => { const r = ctx(); return r && r.members.find(m => m.token === socket.data.token); };
  const deps = { io, rooms, ctx, member, pushState };
  registerSession(socket, deps);
  registerModerator(socket, deps);
  registerPlayer(socket, deps);
  registerVoice(socket, deps);
});

httpServer.listen(PORT, () => console.log(`Deadline Necromancer: ผู้เล่น ${SCHEME}://localhost:${PORT}/  ·  Moderator ${SCHEME}://localhost:${PORT}/mod`));
module.exports = { httpServer, io, rooms };
