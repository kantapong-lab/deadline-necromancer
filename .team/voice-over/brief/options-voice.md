## Options compared (Q1, Q6)
| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Mesh P2P | No media server, no deps, low latency. 12 players = 11 uplinks each (Opus ~32 kbps => ~350 kbps up), fine on LAN/phones. Mod3D is 1 extra recvonly peer per player | N*(N-1)/2 = 66 connections at 12; mute not enforceable at media layer | **Pick** |
| SFU (mediasoup/LiveKit) | Server can truly drop a muted track | Heavy dep, native build/Docker, overkill, violates zero-dep | Reject |
| Relay Opus chunks over Socket.IO (MediaRecorder / WebCodecs) | **Server truly enforces mute** (drop packets), no ICE/HTTPS-cert-for-TURN issues, reuses existing socket | MediaRecorder gives 100ms+ chunk latency + glitches, no jitter buffer/AEC integration, server CPU/bandwidth N*(N-1) fan-out, still needs getUserMedia secure context | Fallback only if hard server-enforced mute is mandatory |
| Mesh + server gate | see below | residual: peer may keep an already-open channel | **Pick with mitigation** |

**Enforcement reality:** in mesh, the server never touches media. "Muted player's audio must not reach others" is enforced by (a) server refusing to relay signalling (offer/answer/ICE) so no connection can be established, and (b) on mute transition server emits `voice:mute` / `voice:permit` to all peers so they **tear down or silence that peer** (receivers locally set `receiver.track.enabled=false` / disconnect the gain node). Receivers are trusted-ish clients; a modified sender could still send to a modified receiver, which is acceptable for a party game on LAN. Honest residual risk; document it. Cheap hardening: close the connection and refuse re-offer until unmuted (permit gate), so an honest client can't hear a muted player even if the sender misbehaves.

## Signalling design (fits existing code)
- Add `socket.on('v:sig', ...)` in a new `app/src/server/handlers/voice.js`, registered next to `registerPlayer` (`app/src/server/index.js:21-23`). Wrapper pattern: `playerAct` at `app/src/server/handlers/player.js:5-11` (checks `ctx()`, `member()`, `m.pid`, `r.game.paused`), but note `playerAct` calls `pushState` + ack on every call; signalling should NOT push state per ICE candidate, so write a lighter wrapper that reuses the same guards without `pushState`.
- Relay target addressing: server maps `pid -> member.sockets` (`app/src/server/handlers/session.js:49,51`; `m.sockets` is a Set, a player can have several sockets) and Mod3D sockets via `r.fullSockets` (`session.js:28`; the 3D screen joins with `full:true`). Never let the client pick a raw socket id; send `{to: pid | 'mod'}` and let the server resolve and stamp `from: pid` (anti-spoof).
- Gate: server calls one pure function `canSpeak(g, pid)` (see below) before relaying any offer/ICE **from** pid; answers from listeners are allowed (a muted listener may still hear: it is receiving only). Mod3D never needs `canSpeak`.
- Glare avoidance: lower pid creates offer (deterministic), or Mod3D always the answerer (players offer to mod and to each other with the lower-pid rule).
- Rejoin: `player:join` with token re-adds a socket (`session.js:36,51`); on reconnect the client must re-run the voice handshake. Add `voice:peers` request after `state`.

## Mute rule (Q5): single source of truth
New engine fn beside chat, `app/src/engine/chat.js`, mirroring its checks (`chat.js:8-9` `p.alive` + phase `MORNING|VOTE_INTERIM`):
```
canSpeak(pid) = p.alive && (phase==='MORNING'||phase==='VOTE_INTERIM') && !p.silenced && !paused
```
- `p.silenced` is set at day start from `silencedNext` (`app/src/engine/phases.js:56`) and reset for dead players (`phases.js:57`); chat explicitly lets silenced players send emoji (`chat.js:11`) but **voice has no emoji equivalent, so silenced = fully muted** (matches requirements).
- Burnout victims: `alive=false, cause='burnout'` (`app/src/engine/night-resolve.js:251`, emits `burnout` fx). Vote-out also `alive=false` -> `!p.alive` covers both.
- `mod-view.js:47`/`views.js:9` show `!p.alive && cause!=='burnout'` is public info and burnout is secret-ish; a mute broadcast must not reveal a burnout cause (dead is already visible via `alive` flag, so mute alone leaks nothing new: dead = muted, same as everyone else dead).
- **Information leak to guard:** `p.silenced` is secret from others (`views.js:15` shows it only to god or the player themself; comment "ห้ามเปิดเผยคนอื่น"). A broadcast `voice:mute {pid}` for a silenced alive player would reveal an NDA-Silence victim to everyone (and so hint a Dark-faction action). Mitigation: do NOT broadcast per-pid reason; just refuse to relay and let silence be inferred as "no audio", or send per-viewer permit only to that player. Pre-existing UI already tells silenced player privately (`phases.js:59`). Flag for PM/UX: other players hearing silence from an alive player in MORNING is itself a mild tell; accept or add "mic muted" noise parity.
- Event hook: re-evaluate permit on every `pushState` (`app/src/server/rooms.js:17`), i.e. emit `voice:permit` only when a pid's `canSpeak` flips (cache last value per member). Covers phase change, silence (phases.js:56), burnout (night-resolve.js:251), vote-out, pause/resume (`player.js:8`), and moderator actions via `mod:do` (`app/src/server/handlers/moderator.js:6`). No separate engine hooks needed.
- Also the **disconnect** path: `session.js:54-59` deletes socket from member; close voice for that pid.

## Mod3D spatial audio (Q2)
- Mod3D is Three r160 via import map (`app/public/mod3d.html:128-129`), orthographic camera (`mod3d.html:248`), socket at `:235`, `state` listener at `:790`.
- Three.js `PositionalAudio` is a thin wrapper of `PannerNode` and takes a `AudioBuffer` or `HTMLMediaElement` by default; for a live `MediaStream` use `audioListener.context.createMediaStreamSource(stream)` and `positionalAudio.setNodeSource(src)`. **Known browser quirk (Chromium): a remote WebRTC stream must also be attached to a muted `<audio>` element (`srcObject`) before Web Audio will output it** [verify in current Chrome].
- Seats are not fixed: positions come from `rowAssign(false).pos[i]` (`mod3d.html:383`), and during reveal cards fly between slots (`mod3d.html:713-719`, `frame.A.pos[d.i]`). Attach each `PositionalAudio` to the per-player desk/card `THREE.Group` (`d.g`) so the panner follows the group; Three updates panner position from `matrixWorld` each frame automatically.
- Camera is orthographic top-down (`CAM_BASE (0,17.5,15)`, `mod3d.html:289`); orthographic has no distance cue. Use panner `distanceModel:'linear'`, `refDistance` ~10, `rolloffFactor` low, mostly rely on **left/right pan** (HRTF or equalpower); set `AudioListener` on camera. Seats at x about +-20 across 3 rows (`ROWZ` `mod3d.html:288`).
- AudioContext autoplay: requires a user gesture; Mod3D is a TV/projector page, add a "click to enable sound" overlay.
- Mod3D keeps its own mute: listens for the same permit event and sets gain 0 for muted pids (defence in depth, essential since Mod3D is a receiver).

## Secure context / getUserMedia (Q3)
- `getUserMedia` needs secure context: `https://` or `localhost`/`127.0.0.1`. `http://192.168.x.x:3000` is **not** secure, `navigator.mediaDevices` is `undefined` there. Server currently plain HTTP: `app/src/server/index.js:4,13` (`http.createServer`); startup log advertises `http://localhost:3000` only (`index.js:26`). Playing on phones over LAN is the primary use case, so this blocks the feature unless fixed.
- Options:
  | Option | Phone works? | Effort | Note |
  |---|---|---|---|
  | `https` + self-signed cert | Yes after user taps through warning (iOS Safari/Android Chrome allow it; getUserMedia works once accepted; mic prompt persists poorly on iOS) | Low: `https.createServer({key,cert},handleRequest)`, env `HTTPS_KEY/CERT` | **Pick**; Socket.IO auto-uses same origin so `io()` (`mod3d.html:235`) needs no change (becomes wss) |
  | mkcert local CA | Needs CA installed on each phone | Medium, bad UX | Dev only |
  | Tunnel (ngrok/cloudflared) | Yes, real cert | Needs internet, URL per session, extra tool | Good fallback for remote play |
  | Chrome flag `unsafely-treat-insecure-origin-as-secure` | Android Chrome only, manual | Hack | No |
  | localhost only | Host only | Zero | Not for phones |
- Cert generation: `openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj /CN=<lan-ip> -addext subjectAltName=IP:<lan-ip>`; ship a small script. Keep plain HTTP mode when no cert env set (existing tests/flow unchanged, voice UI hidden with message "ต้องใช้ HTTPS").
- Feature-detect: `if(!navigator.mediaDevices?.getUserMedia)` -> hide voice button and show hint. iOS Safari: must call getUserMedia from a user tap; AudioContext also needs tap; the player can only listen after interacting.
- Mod3D CDN: Three loads from jsdelivr (`mod3d.html:128-129`), so the Mod3D screen already needs internet; if served via HTTPS the same page must not mix content (CDN is https, fine).

## STUN/TURN (Q4)
- Same LAN: browsers gather **host candidates**; direct connectivity works without STUN/TURN. Caveat: Chrome/Safari obfuscate host IPs with **mDNS `.local` names**; works on most home LANs, **fails when AP client isolation or mDNS blocked** (common on public/guest Wi-Fi). Once a mic permission is granted Chrome exposes real IPs, which helps (another reason the mic handshake must happen before offering).
- `iceServers:[{urls:'stun:stun.l.google.com:19302'}]` optional; harmless, needs internet; for offline LAN pass `iceServers:[]`. Make it an env/config value served to clients.
- Symmetric NAT / cross-network play needs TURN (coturn). Out of scope; document that mesh fails in that case and a TURN URL config hook (`VOICE_ICE_SERVERS` JSON) is the extension point.

## Mesh scale (Q1)
- 12 players + 1 Mod3D: each player holds 11 peer + 1 mod = 12 PCs, uploads 12 Opus streams (Mod3D needs separate stream per peer; send same track via `addTrack` to each). Only ONE speaker is typically active; send `track.enabled=false` for silence still sends DTX comfort noise, small. Opus mono 24-32 kbps -> ~400 kbps upload peak on a phone: OK on Wi-Fi, heavy on mobile CPU at 12 simultaneous encodes? Browsers encode once per sender (one encoder per track per PC: 12 encoders), noticeable on cheap phones. Mitigation: **only create outbound connections while `canSpeak` is true** (this is also the enforcement!): player offers to peers only in MORNING / VOTE_INTERIM and when permitted; tear down at NIGHT. Receivers keep recvonly transceivers. This reduces idle load and makes phase mutes natural.
- Reasonable cap: it works to 12; > ~15 needs SFU.

