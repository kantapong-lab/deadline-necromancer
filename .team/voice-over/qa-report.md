# QA report: voice-over (L3, round 1)
Branch qa/voice-over. Evidence: `npm test` in app/ exit 0 (full suite incl. `test/voice.js` T1-T12 all ok); new `app/tools/e2e-voice-check.js` (commit on qa/voice-over) ok; `node test/voice.js` run alone ok.

No real browser or microphone was available. Browser-only ACs are marked `manual` and are NOT verified.

## Results
| AC | Result | Evidence |
|---|---|---|
| AC-1 | manual | server relay half = T4 pass; mic capture/constraints need a browser (steps M1) |
| AC-2 | manual | T4 covers `'mod'` relay only; panning/follow desk needs browser (M2) |
| AC-3 | manual | relay player->player = T4 pass; audible playback needs 2 browsers (M1) |
| AC-4 | pass | T1 truth table |
| AC-5 | pass | T2 |
| AC-6 | pass | T3 |
| AC-7 | pass | T3 |
| AC-8 | pass | T1, T5 (server side: permit false, links deleted); client teardown on permit false is by code review only |
| AC-9 | pass | T1, T5 (paused) |
| AC-10 | pass | T5, T5b (drop <= 1 s, gate live, listener answer still relays); receiver-side audio drop is manual (M3) |
| AC-11 | pass | T6 (in-process, real server, socket.io-client; events to others identical silenced vs not, no leak words, permit private to owner) |
| AC-12 | pass | T10 + e2e-voice-check (plain http logs http URL; https URL logged and served with generated cert; half config exits 1) |
| AC-13 | manual | needs browser on http / mic denied / no device (M4); server unaffected |
| AC-14 | pass | T7 |
| AC-15 | pass | T4, T7 (server handshake); Mod3D client `rehandshake()` manual (M2) |
| AC-16 | pass | T8, T12 |
| AC-17 | manual | button in `public/voice.js` barHTML (`#vmBtn`) seen by code review only (M1) |
| AC-18 | manual | overlay gate in mod3d.html by code review only (M2) |
| AC-19 | manual | speaking indicator by code review only (M1, M2) |
| AC-20 | pass | T9 (default `[]`, parser cases) |
| AC-21 | pass | `tools/gen-cert.js` run: cert has IP SAN, https server starts with it; README documents HTTPS, tunnel, mesh cap 12, accepted mesh-mute risk |
| AC-22 | pass | T11 (12 members, links > 0 then 0 after NIGHT) |

HTTP serving check (e2e-voice-check): `/voice.js` and `/mod3d/voice.js` return 200 as javascript with expected content; `/` references `/voice.js`; `/mod3d.html` imports `./mod3d/voice.js`.

## Bugs
none

## Notes for Orchestrator (not bugs)
- S-8 (public/voice.js onIce ~line 180): confirmed by reading. While `onAnswer` awaits `setRemoteDescription`, `o.pc.remoteDescription` is still null, so an ICE candidate for the outbound link goes to the inbound entry's queue (when an inbound entry exists and has no remote yet) and is later dropped by `candFits`. Only affects a pid pair with both directions live (glare). Not reproduced (needs real WebRTC); the link may still connect through other candidates or later trickle. Kept as suggestion; owner FE. Worth a browser check in M1 with two simultaneously speaking players.
- V-1: no live browser run done by QA (headless env, no mic). See manual steps.
- Host env quirk: `tools/gen-cert.js` failed here only because the shell has `OPENSSL_CONF` pointing to a missing PostgreSQL file; with `OPENSSL_CONF=` cleared it passes. Not a code defect.

## Manual steps
- M1 (AC-1, 3, 17, 19, S-8): serve with `HTTPS_KEY`/`HTTPS_CERT` (after `node tools/gen-cert.js <lanIp>`). Open `https://<ip>:3000/` on two phones/browsers, join one room with 6 players, start, reach MORNING. Tap voice, allow mic: button shows on state; each hears the other; speaking indicator shows only on the active speaker; tap "ปิดเสียงตัวเอง" mutes own mic and toggles label. Have both talk at once for 30 s: audio must flow both ways (S-8).
- M2 (AC-2, 15, 18): open `/mod3d.html` on the TV browser: "click to enable sound" overlay appears, click unlocks. Speaker's voice comes from their desk; move the camera/desk and the pan follows; speaking indicator on the desk. Reload the TV page mid-MORNING: speakers are re-heard without them doing anything.
- M3 (AC-8, 9, 10): while speaking, advance to NIGHT, then pause/resume in MORNING, silence a player via NDA: audio stops within 1 s each time, comes back only for permitted players; a silenced player's button gives no sound to others and others see no extra UI.
- M4 (AC-13): open `http://<lanIp>:3000/` on a phone (insecure): button disabled/hidden with "ต้องใช้ HTTPS" hint, game still playable, no console error loop. Also deny mic permission, and test a device with no mic: matching Thai hint.

## Gaps
AC-1, 2, 3, 13, 17, 18, 19 unverified at runtime (manual). Client teardown on `voice:permit {false}` and receiver drop timing untested in a browser. No Mod3D audio output test.
