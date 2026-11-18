# Brief: voice-over (WebRTC voice for Socket.IO game)
Level reached: **L1** (codebase read + established WebRTC knowledge; no live web verification, flag items marked [verify]).

## Recommendation
1. **Mesh P2P WebRTC, signalling relayed through the existing Socket.IO server, zero new npm deps.** Native `RTCPeerConnection`, no library.
2. **Server-enforced mute = server-side gate on signalling + a "voice permit" the server recomputes on every state push.** Plus client `track.enabled=false` / `replaceTrack(null)` as courtesy only (a hostile client can ignore it; see Must-not-miss #1).
3. **Mod3D = listener only** (recvonly, never sends). Per-player `MediaStreamAudioSourceNode -> PannerNode(HRTF)` fed to the Mod3D AudioContext; listener at camera, panner at seat position.
4. **HTTPS: Node `https` with a self-signed cert (or mkcert) on LAN**, or run the host as `localhost`. Required; plain `http://<ip>:3000` cannot call getUserMedia.
5. **STUN/TURN: none on pure LAN** (host candidates suffice). Optional public STUN `stun:stun.l.google.com:19302` for non-LAN; TURN out of scope per requirements.

## Options, signalling, mute rule, Mod3D audio, HTTPS, STUN, mesh scale
Full detail: [options-voice](brief/options-voice.md)

## Must-not-miss
1. **Mute cannot be absolute in mesh**; document residual risk (hostile client) and enforce by gate + receiver-side drop + teardown; or choose chunk relay if the PM insists.
2. **Do not leak NDA-Silence** via broadcast mute events (`views.js:15`).
3. **HTTPS is a hard prerequisite on phones**; plain HTTP LAN shows no mic. Needs a cert story and detection fallback, else the feature appears broken.
4. Seat position is dynamic (`mod3d.html:383,713-719`): attach audio to the moving desk group, not fixed coordinates.
5. Reconnect: a player may have multiple sockets (`session.js:49,51`) or reconnect via token (`session.js:36`); voice peers must key on `pid`, not socket id. Moderator reconnect (`mod:join`, `session.js:22-30`) must re-handshake Mod3D.
6. Pause: `r.game.paused` (`player.js:8`) must mute voice too (chat is blocked by the same check).
7. Signalling rate limit / payload size cap, and per-room scoping via `socket.data.code` (`index.js:18`): relays only within the room, to existing members. A null/garbage payload must not throw (`session.js:12` comment: a throw in a handler kills the server).
8. Mod `fullSockets` identify the 3D screen (`session.js:28`); relay to Mod only if the socket is in `fullSockets`, not any moderator.
9. Echo/feedback: use `getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})`; Mod3D plays loudly near player phones in same room causing feedback/double audio (players physically together hear each other and the TV). Product decision: probably voice is for remote play; flag to PM.
10. Chat visual parity: speaking indicator in UI/Mod3D (use `AnalyserNode`) helps, but must also respect mute.
11. No baseline tests cover the socket layer; add unit tests for `canSpeak` (pure) and a handler test for refusing signalling (baseline red, treat code as truth).

## Codebase findings (path:line)
- Chat rule to mirror: `app/src/engine/chat.js:8-11`.
- Handlers + guard pattern: `app/src/server/handlers/player.js:5-18`; register in `app/src/server/index.js:17-24`.
- Member sockets / Mod full screen: `app/src/server/handlers/session.js:28,49,51,54-59`.
- State push hook for mute transitions: `app/src/server/rooms.js:16-31`.
- Silence lifecycle: `app/src/engine/phases.js:56-59`; burnout death `night-resolve.js:251`; silence secrecy `app/src/engine/views.js:15`.
- Mod3D: import map `app/public/mod3d.html:128-129`, socket `:235`, camera `:248,289`, seat positions `:288,383,713-719`, state listener `:790`.
- Plain HTTP server: `app/src/server/index.js:4,13,26`. No existing HTTPS/CSP/Permissions-Policy header found in `app` (grep: none), so no `microphone` policy blocks.
- No WebRTC code exists yet.

## Open questions for PM
1. Co-located players (same room as the TV)? Then feedback/duplication; voice may be remote-only.
2. Accept self-signed HTTPS warning on phones, or require tunnel?
3. Accept mesh residual-risk on mute, or require server-relayed audio?
4. Silenced-alive player: OK that others hear silence (tell)?
