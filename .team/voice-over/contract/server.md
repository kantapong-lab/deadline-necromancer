# Server logic (BE)

Files: `app/src/engine/chat.js` (`canSpeak`), `app/src/server/handlers/voice.js` (new), `app/src/server/rooms.js` (hook), `app/src/server/index.js` (HTTPS, register). Event shapes: [endpoints/voice.md](endpoints/voice.md). Numbers: [schemas.md](schemas.md).

## voice.js exports
`module.exports = registerVoice(socket, deps)` (same signature as the other `register*`), with `.syncVoice` (`(io, room) => void`), `.parseIceServers` (`(envString) => array`, pure, used by T9), and the constants `.SIG_MAX` (600), `.SIG_WINDOW_MS` (1000), `.ON_MAX` (20) (read by T8). `room.voice` is created at the first `voice:on` with `game: r.game` so the first sync does not wipe links. `index.js`: `registerVoice(socket, deps)` after `registerPlayer`. **Listener order:** `voice.js` adds its own `socket.on('disconnect')`, registered after `registerSession`'s, so session's disconnect (member socket removed, `pushState`) runs first; voice cleanup must not depend on order (it keys on `socket.id` and tolerates the member already missing the socket).

## rooms.js hook
`createPushState`'s returned `pushState(room)` calls `syncVoice(io, room)` as its LAST statement. `syncVoice` is wrapped in try/catch (`console.error`, never rethrow): a throw in `pushState` would kill every handler (`session.js:12` note). No-op when `room.voice` is undefined or nothing is registered. Runs on every push including disconnect, `mod:do` (start / reset / pause / phase changes), `p:*`.

## syncVoice(io, room), the re-evaluation (AC-6..10, 14, 15)
1. `g = room.game` (may be null). If `g !== room.voice.game`: store it, delete every link (new game or reset: pids are reshuffled / null).
2. For each member `m` with `m.voice`: `pid = m.pid`; `can = !!g && pid != null && g.canSpeak(pid)`; `pub = !!g && pid != null && g.canSpeak(pid, {publicOnly:true})`.
   - `can !== m.voice.can`: emit `voice:permit {permit:can}` to every `sid` of `m.sockets` (private). Update cache.
   - cached `pub` true and (`pub` now false or `pid !== cached pid`): delete links `<cachedPid>>*`, queue `voice:drop {pid: cachedPid}`.
   - `can` false: delete links `<pid>>*` silently (covers a silence-only state; emits nothing).
   - store `m.voice.pid = pid; .pub = pub`.
3. Send each queued drop to every registered player socket except that pid's, and to the registered 3D socket.
4. Recompute the peers list; if its JSON differs from `peersKey`, store it and emit `voice:peers` (per-recipient copy without the recipient's own pid) to every registered player socket.
Silenced is set only in `closeNight` (`phases.js:56`) in the same call that enters MORNING, so a silenced pid is `can=false` from its first evaluation, never flips true->false while `pub` is true, and gets no event at all. Pause/resume, phase change, burnout/vote-out death all flow through this one function; no engine hooks.

## voice:on
Player socket: needs `ctx()`, `member()`, `r.game`, `m.pid != null`. New registration (different socket than `m.voice.sock`): `gen = ++room.voice.gen`, delete links touching this pid, set `m.voice = {sock, gen, pid, can: live, pub: live}` (no permit event: ack carries it), emit `voice:peers` to the other registered sockets. 3D socket: needs `socket.data.mod` and `r.fullSockets.has(socket.id)`; sets `room.voice.mod = {sock, gen:++gen}`, deletes links `*>mod`, emits `voice:peers`. `on:false`, or a disconnect of the registered socket: `m.voice = null` (or `room.voice.mod = null`), delete links touching it, queue `voice:drop {pid}` for a player, emit `voice:peers`. Unregistering/disconnecting a non-registered socket (second tab) changes nothing (AC-14: voice keys on pid; the pid's voice socket is the latest one that registered).

## Relay (v:sig) (AC-5, 16)
1. Bucket check, then validate ([schemas.md](schemas.md)); any failure returns silently.
2. Sender: `socket.data.mod` -> `'mod'` only if `r.fullSockets.has(socket.id)` and `r.voice.mod.sock === socket.id`; else `m = member()` with `m.pid != null` and `m.voice.sock === socket.id` -> `m.pid`; otherwise ignore. A non-registered tab, the plain `/mod` page, an unknown socket: ignored.
3. Target: `'mod'` -> `r.voice.mod.sock` (must still be in `r.fullSockets`); pid -> the member with that pid whose `m.voice.sock` is in `m.sockets`. Players may target pids or `'mod'`; `'mod'` may target pids only; no self-target. Only inside `socket.data.code`'s room (the lookups are on `ctx()`), so cross-room is impossible.
4. Gate by `kind` per the link rules in schemas.md; `canSpeak` evaluated live (not from cache), so refusal is immediate even before the next push.
5. `io.to(targetSock).emit('v:sig', {from, kind, sdp|cand})`. No ack, no error text (a refusal never reveals silenced to the sender's peers; the sender already has its private permit).

## Disconnect (AC-14)
Voice socket disconnect: unregister as above. A player with several sockets keeps voice as long as the registered one lives; if it drops, voice closes for that pid until some socket calls `voice:on` again (client re-handshake after reconnect, endpoints/voice.md).

## HTTPS (AC-12), `index.js`
Read env at load. Both `HTTPS_KEY` and `HTTPS_CERT` -> `fs.readFileSync` both, `https.createServer({key, cert}, handleRequest)`; exactly one set or read error -> `console.error('HTTPS_KEY and HTTPS_CERT must both be set to readable PEM file paths')` + `process.exit(1)`. Else `http.createServer(handleRequest)`. Same `io = new Server(server)`; no CORS change. Log scheme from the chosen mode. `module.exports` keeps `{ httpServer, io, rooms }`.

## Cert script and docs (AC-21, P2)
`app/tools/gen-cert.js [lanIp]`: lanIp default = first non-internal IPv4 from `os.networkInterfaces()`; runs `openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj /CN=<ip> -addext subjectAltName=IP:<ip>,DNS:localhost` via `child_process.execFileSync` (args array, no shell); writes `app/.certs/voice.key` and `app/.certs/voice.crt` (`.certs/` added to root `.gitignore`); prints ready-to-paste `HTTPS_KEY=... HTTPS_CERT=... npm start` for bash and PowerShell, plus the "tap through the browser warning" hint. `openssl` missing -> message with install hint, exit 1 (`-addext` needs OpenSSL >= 1.1.1 [verify]). `app/README.md` gains a Voice section: HTTPS setup, tunnel alternative (cloudflared / ngrok: real cert, needs internet), `VOICE_ICE_SERVERS`, mesh cap 12, no TURN, and the residual risk (a hostile modified client can keep sending to a modified receiver; mute = gate + receiver drop + teardown; hearing silence from an alive player is an accepted tell).
