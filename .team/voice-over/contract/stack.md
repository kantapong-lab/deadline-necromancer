# Stack: voice-over

Platform: web (browser clients: players on phones/desktop, Mod3D TV page). Browsers: current Chrome / Edge / Firefox, Safari >= 15 [assumed; WebRTC audio + getUserMedia + Web Audio PannerNode].
Runtime: Node.js >= 18 [assumed: repo has no pin, no `engines`, no `deploy.md`; ADR 0001]. Language: JavaScript, CommonJS server, plain-script / ES-module browser code, no build step.
Dependencies: **zero new npm deps** (AC: native `RTCPeerConnection`, Node `https`, `child_process`). Existing `socket.io ^4.7.5`, dev `socket.io-client ^4.8.4` unchanged; `app/package.json` only gains the new test in `npm test`.

## Stack facts source (no `docs/stacks/socket.io.md`; `check-stack-notes` says missing)
Ladder step 2 (local sources): every Socket.IO idiom used here already exists in the repo and is copied, nothing new:
`socket.on(ev, (data, cb) => ...)` with `data || {}` guard and `ack(cb, ...)` (session.js:13-30), `io.to(sid).emit(...)` (rooms.js:23), per-socket handler registration with shared `deps` (index.js:17-24). No `io.sockets.sockets` lookups: liveness is checked against `member.sockets` / `room.fullSockets` Sets. Not blocked.

## Options (hard-to-reverse choice: media path)
ADR 0003 (PM, Kind: product) already decided it, one obvious option: **mesh P2P WebRTC, signalling over Socket.IO, server gate + receiver drop**. Rejected there: SFU (heavy dep), Opus relay over Socket.IO (latency, fan-out load; kept as fallback if hard server-side mute becomes mandatory). No new technical ADR: nothing here contradicts 0003.

## Build / buy / reuse
| Capability | Choice | Reason |
|---|---|---|
| Signalling transport | reuse Socket.IO | already in every client, room scoping via `socket.data.code` |
| Media | build on native WebRTC | zero deps; Opus built in |
| Mute rule | build, engine fn `canSpeak` in `app/src/engine/chat.js` | single source, mirrors chat rule |
| STUN / TURN | none by default (`VOICE_ICE_SERVERS` env hook) | LAN host candidates suffice [assumed]; TURN out of scope; no provider chosen, no user question needed |
| TLS | reuse Node `https` + self-signed cert via `openssl` script; tunnel documented | mic needs a secure context on phones |

## Env vars (all optional; none set = today's behaviour)
- `HTTPS_KEY`, `HTTPS_CERT`: **file paths** to PEM files. Both set -> `https.createServer({key,cert}, handleRequest)`, Socket.IO then serves wss on the same origin. Exactly one set, or a file unreadable -> startup error to stderr naming the variable, exit code 1 (fail fast, never a silent downgrade to HTTP). Neither set -> `http.createServer` exactly as today.
- `VOICE_ICE_SERVERS`: JSON array of `RTCIceServer` (`{urls: string|string[], username?: string, credential?: string}`), parsed once at startup. Not valid JSON / not an array -> `console.warn` once, use `[]`. Entries without a string/array `urls` are dropped; max 8 entries; only the three listed fields are kept. Default `[]` (no STUN) [assumed]. Sent to clients inside the `voice:on` ack only (never in `state`).
- Startup log line prints the scheme in use: `Deadline Necromancer: ผู้เล่น https://localhost:PORT/  ·  Moderator https://localhost:PORT/mod` (http when no cert).

## Module dependency direction (no cycles)
`index.js -> handlers/voice.js`; `rooms.js -> handlers/voice.js` (for `syncVoice`); `handlers/voice.js -> engine` only (it must not `require('../rooms')`; it defines its own 3-line `ack`). Otherwise `rooms.js` would load a half-initialised `handlers/voice.js` and `ack` would be undefined.

## No-change guarantees
- `viewFor`, `modView`, `common`, `pubPlayers` and every `state` payload are **unchanged** (golden snapshot `app/test/golden/snapshot.json` stays valid; no re-record). `canSpeak` makes no RNG call.
- `app/src/server/http.js` unchanged: `/voice.js` and `/mod3d/voice.js` are served by the existing `serveFile(PUBLIC, ...)` fallthrough; no frozen URL changes status/type.
- **`app/test/http-parity.json` pins the sha256 of `/`, `/?room=ABCD`, `/index.html` (same file) and `/common.js`.** FE must edit `index.html` (voice button + `<script src="/voice.js">`), so those three hashes change by design: BE re-records with `node test/http-parity.js --record` once FE's `index.html` is merged and checks the diff touches only those entries. FE must not edit `common.js`, `mod.html`, `gallery.html`, `card-info.js` (keeps the diff minimal). `mod3d.html` is not pinned.
- Mesh cap: 12 players (`MAX_PLAYERS` = 12) + Mod3D; > ~15 needs an SFU (documented in README).
