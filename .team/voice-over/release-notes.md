# Release notes: voice-over (in-game WebRTC voice)

Branch `feature/voice-over` (all code merged to it). Sources: `qa-report.md`, `contract.md` and `contract/`, `ac.md`, `app/README.md` (Voice section), and the branch diff against `main`.

Status: automated checks pass (QA: `npm test` exit 0; `test/voice.js` T1-T12 ok; `tools/e2e-voice-check.js` ok). Browser checks are NOT run yet: manual steps M1-M4 (below) are open and must be done before this is called verified.

## What users get
- **Voice chat in the game.** Players talk by microphone during MORNING and VOTE_INTERIM. Audio runs peer to peer (WebRTC mesh). The server only relays the connection setup (signalling) and decides who may speak.
- **Who can speak.** A player can speak only when all four hold: alive, phase is MORNING or VOTE_INTERIM, not NDA-Silenced, game not paused. Night-Burnout and voted-out players are muted from the moment they are dead. Every other phase mutes everyone, and their connections are torn down.
- **Mod3D (TV screen) hears speakers.** `/mod3d.html` plays each speaker's voice panned to their desk, and the pan follows the desk when it moves. A "click to enable sound" overlay unlocks audio before anything plays.
- **Mute button.** Each player has a button for their own mic (label toggles). The server gate is the real control; the button is a courtesy.
- **Speaking indicator.** Shown in the player UI and on Mod3D, only for currently permitted speakers.
- **Silenced players are not exposed.** Only the player gets a permit event saying whether they can speak. Other players and Mod3D get the same payloads whether a player is silenced or not (AC-11, checked by T6).
- **Plain HTTP still works.** Without a microphone or on plain HTTP, the voice button is hidden or disabled with a Thai hint (`ต้องใช้ HTTPS`, permission or no-mic hints). The game stays playable (AC-13, manual).
- **Reconnect.** Voice is keyed on the player's pid. After a reconnect the handshake reruns. A disconnect closes that player's voice. Mod3D re-handshakes with all permitted speakers after it reconnects (AC-14/15; Mod3D part manual).

## Limits
- **Mesh cap: 12 players plus the Mod3D screen.** Beyond about 15 the mesh needs an SFU (not built).
- **Mute is enforced by gate plus receiver drop.** The server stops relaying a muted speaker's signalling and tears down their outbound links. Receivers drop that peer's audio within 1 s (T5, T5b; receiver-side timing is manual M3).
- **Accepted residual risk.** A modified client can still send audio to other modified clients. An NDA-Silenced player who is alive will sound silent, which others can notice (accepted, per ac.md assumptions).
- **Self-signed HTTPS.** Phones show a certificate warning that must be accepted. The cert is bound to one LAN IP; if the host IP changes, regenerate it. Tunnel (cloudflared, ngrok) is the alternative and gives a real certificate.
- **No TURN.** Only `VOICE_ICE_SERVERS` (optional, default none). On restrictive Wi-Fi (client isolation, blocked mDNS) peers may fail to connect.
- **Rate limits (server).** `v:sig` 600 messages per socket per 1 s; excess is silently dropped. `voice:on` 20 per socket per 1 s; excess returns ack error `ช้าลงหน่อย`.
- **Not verified at runtime.** AC-1, 2, 3, 13, 17, 18, 19 are verified only by manual steps M1-M4. Client teardown on `voice:permit {permit:false}` and receiver drop timing are untested in a browser. Mod3D audio output is untested.
- **Simultaneous two-way talk (S-8).** When two players talk to each other at the same moment, one ICE candidate may be queued on the wrong side and dropped (`public/voice.js` `onIce`). The link may still connect through other candidates. Check in M1 with both speaking for 30 s.
- **Mod3D needs internet** to load Three.js from the CDN (existing import map, unchanged).
- **Echo.** No echo handling beyond `getUserMedia` constraints (echoCancellation, noiseSuppression, AGC). Players near the TV should use the mute button (ac.md assumption).

## Changes (what the diff touched)
- Server: `src/server/handlers/voice.js` (new; `voice:on`, `v:sig`, `syncVoice`, disconnect handling), `src/server/index.js` (optional HTTPS listener, fail-fast on bad HTTPS env), `src/server/rooms.js` (calls `syncVoice` last in `pushState`).
- Engine: `src/engine/chat.js` adds `canSpeak(pid, opts)`. No other rule changes.
- Client: `public/voice.js`, `public/mod3d/voice.js` (new), `public/index.html`, `public/mod3d.html`, `public/style.css`.
- Tools: `tools/gen-cert.js` (new), `tools/e2e-voice-check.js` (new).
- Tests: `test/voice.js` (new), appended to `npm test` in `package.json`; `test/http-parity.json` re-recorded for `index.html`; `test/fixtures/voice-test.{key,crt}` (test fixtures for `voice.js`).
- Docs: `app/README.md` (Voice section), `docs/adr/0003-voice-mesh-webrtc.md`.
- `.gitignore`: `app/.certs/`.

## Socket events (no REST endpoints)
| Event | Direction | Payload | Notes |
|---|---|---|---|
| `voice:on` | client to server, with ack | `{on: true}` or `{on: false}` | Ack on `on:true`: `{ok:true, iceServers:[...], permit:true, gen:1, peers:[{to:2,gen:1}]}`. Errors: `ไม่ได้อยู่ในห้อง` (not in room), `ยังไม่ได้เริ่มเกม` (game not started), `ไม่ใช่หน้าจอ 3D` (not the 3D screen), `ช้าลงหน่อย` (rate limit), `ผิดพลาด` (internal). Mod3D sends the same event; its ack has no `permit`/`peers`. |
| `v:sig` | client to server, relayed | in: `{to: pid or 'mod', kind:'offer'\|'answer', sdp}` or `{to, kind:'ice', cand}` | Server stamps `from`. Relayed as `{from, kind, sdp}` or `{from, kind:'ice', cand}`. No ack. Invalid, oversized or out-of-room messages are ignored. SDP max 10000 chars; candidate string max 512; `sdpMid` max 64; `sdpMLineIndex` 0-64. Offers only from a permitted speaker. |
| `voice:permit` | server to owner only | `{permit: true\|false}` | Sent only to the player whose permit changed. |
| `voice:peers` | server to each registered socket | `{peers:[{to, gen}]}` | Own pid omitted per recipient. `to:'mod'` appears only when Mod3D is registered. |
| `voice:drop` | server to others | `{pid}` | Sent when a speaker stops being permitted, or disconnects. Not sent to the dropped pid itself. |

ICE servers come from `VOICE_ICE_SERVERS` (see below), returned in the `voice:on` ack.

## Deploy hand-off

1. **Branch and commit.** Branch `feature/voice-over`. Commit all changes on it (including `.team/voice-over/`) with trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
2. **Migrations.** None. There is no database and voice state is in memory (`rooms` Map). Nothing to run or roll back.
3. **Dependencies.** None added. `app/package.json` changed only the `test` script (adds `node test/voice.js`). Run `npm install` (or `npm ci`) as usual.
4. **New environment variables.**
   - `HTTPS_KEY` and `HTTPS_CERT`: file paths to PEM key and certificate. Set both or neither. If only one is set, or a file is unreadable, the server prints `HTTPS_KEY and HTTPS_CERT must both be set to readable PEM file paths` and exits 1. Neither set = plain HTTP (unchanged behaviour).
   - `VOICE_ICE_SERVERS`: optional JSON array of RTCIceServer, e.g. `[{"urls":"stun:stun.l.google.com:19302"}]`. Default is none (LAN host candidates only). Invalid JSON or a non-array logs a warning and uses none. Max 8 entries; entries without a valid `urls` are skipped. No TURN is included.
5. **Certificate (only for HTTPS).** From the repo root run `node app/tools/gen-cert.js <lanIp>`. Needs `openssl` >= 1.1.1 on PATH. It writes `app/.certs/voice.key` and `app/.certs/voice.crt` (gitignored). If it fails with an openssl error, check `OPENSSL_CONF`: QA's host had it pointing at a missing file; clearing it (`OPENSSL_CONF=` in bash, or `Remove-Item Env:OPENSSL_CONF` in PowerShell) made the script pass. Run the script again if the LAN IP changes.
6. **Order.**
   1. Commit as in step 1.
   2. `cd app && npm install`.
   3. `npm test` (must exit 0; includes `test/voice.js`).
   4. Optional HTTPS: run step 5, then set both env vars with the absolute paths the script prints.
   5. `npm start`. Check the startup log: `http://...` without HTTPS env, `https://...` with it.
   6. Only then run the manual steps.
7. **Rollback.** Unset `HTTPS_KEY` and `HTTPS_CERT` to return to plain HTTP. To remove voice entirely, revert the commit from step 1. No data changes to undo.

### Check after deploy (manual, NOT yet run)
These are open. Nothing below has been run on a real browser or microphone.
- **M1 (AC-1, 3, 17, 19, S-8).** Serve with HTTPS. Open `https://<ip>:3000/` on two phones or browsers. Join one room with 6 players, start, reach MORNING. Tap voice and allow the mic: the button shows on the right phases. Each hears the other. The speaking indicator shows only on the active speaker. The mute button mutes your own mic and toggles its label. Have both talk at once for 30 s: audio must flow both ways (S-8).
- **M2 (AC-2, 15, 18).** Open `/mod3d.html` on the TV browser. The "click to enable sound" overlay appears and clicking it unlocks audio. A speaker's voice comes from their desk; moving the desk moves the pan; the speaking indicator shows on the desk. Reload the TV page in MORNING: speakers are heard again without them doing anything.
- **M3 (AC-8, 9, 10).** While speaking, advance to NIGHT, then pause and resume in MORNING, and silence a player through NDA. Audio stops within 1 s each time and returns only for permitted players. A silenced player's button gives no sound to others, and others see no extra UI.
- **M4 (AC-13).** Open `http://<lanIp>:3000/` on a phone. The voice button is disabled or hidden with the `ต้องใช้ HTTPS` hint, the game stays playable, and the console shows no error loop. Deny mic permission and check the permission hint. Test a device with no mic and check the no-mic hint.

If M1 fails on S-8 (one-way audio when both talk at once), record it as a known issue; the fix is in `public/voice.js` `onIce` (owner FE).

## Corrections checked
- `app/README.md` Voice section matches the code: `SIG_MAX` is not mentioned there, so no edit was needed. No README change in this round.
- `contract.md` says the `v:sig` rate limit is 150 per 1000 ms. The code (`handlers/voice.js`, `SIG_MAX = 600`) and this document use 600. Contract is stale on this number.
- `.team/voice-over/deploy.md` gives an example cert path `certs/key.pem`. The helper actually writes `app/.certs/voice.key` and `voice.crt`. Use the helper's paths.
