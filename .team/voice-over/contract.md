# Contract: voice-over (in-game WebRTC voice)

Source: [ac.md](ac.md) (AC-1..22), [brief.md](brief.md), ADR [0003](../../docs/adr/0003-voice-mesh-webrtc.md). Baseline red; code is truth.

Stack: Platform: web · Runtime: Node.js >= 18 [assumed: no pin in repo, no deploy.md] · Node `http`/`https` + Socket.IO ^4.7.5 (existing) · native browser WebRTC + Web Audio · zero new npm deps · no build step.

## Stack
Mesh P2P WebRTC, signalling over the existing Socket.IO, server-gated; env `HTTPS_KEY`/`HTTPS_CERT` (file paths), `VOICE_ICE_SERVERS` (JSON, default none); build vs reuse table, require direction, no-change guarantees (views, golden, http-parity). [stack]

## Socket events (no REST)
`voice:on` (ack), `v:sig` (relay, no ack), `voice:permit` (private to the pid), `voice:peers`, `voice:drop`; numbered handshake sequence; speaker is always the offerer. [endpoints/voice]

## Schemas and numbers
`canSpeak(pid, opts)` in `engine/chat.js`, member/room voice state, payload whitelists and caps, rate limit 150 `v:sig` per 1000 ms per socket, link rules, AC-11 invariant. No DB, no migrations. [schemas]

## Server logic
`syncVoice` called last in `pushState`, voice:on registry, relay gate, disconnect, HTTPS startup, cert script, README. [server]

## Client modules
Player `app/public/voice.js` (+ `index.html`) and Mod3D `app/public/mod3d/voice.js` (+ `mod3d.html`): capture, feature detect and Thai hints, listener, mute button, speaking indicator, click-to-enable-sound, reconnect. [client]

## File ownership
FE: `app/public/**`. BE: `app/src/**`, `app/test/**`, `app/tools/**`, `app/package.json`, `app/README.md`, `.gitignore`. One owner per row. [ownership]

## Tests
BE writes `app/test/voice.js` (T1-T11) and appends it to `npm test`; browser behaviour is manual / QA. [tests]

## AC id -> logic
Every AC 1-22 mapped to a section, owner and test. [ac-map]

## Decisions in force
Public-only receiver events (no silenced leak); `canSpeak` has one rule, `publicOnly` option skips only the silenced term; `rooms.js -> handlers/voice.js` one-way require; HTTPS misconfig fails fast; `http-parity.json` re-recorded for `index.html`. ADR: none new (0003 covers it). Diagrams: none needed (no new component or datastore; ordering is the numbered sequence in [endpoints/voice]).

[stack]: contract/stack.md
[endpoints/voice]: contract/endpoints/voice.md
[schemas]: contract/schemas.md
[server]: contract/server.md
[client]: contract/client.md
[ownership]: contract/ownership.md
[tests]: contract/tests.md
[ac-map]: contract/ac-map.md
