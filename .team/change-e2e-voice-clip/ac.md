# AC: change-e2e-voice-clip
Scope: internal    Kind: internal-api    Owner: BE

## Goal
e2e test for voice-over recorded as a watchable clip: prove the WebRTC mesh voice (ADR 0003; app/public/voice.js, app/public/mod3d/voice.js, app/src/server/handlers/voice.js) really works with 12 players, building on app/tools/e2e-pw.js (12 players + mod3d, Playwright). Decisions from the grilling session (user, 2026-11-18) are final.

## AC
| id | observable result | how it is checked |
|---|---|---|
| AC-1 | Setup shared with e2e-pw.js (in-process server, 12 phones joining via the form, mod3d page) lives in one helper; e2e-pw.js behaviour unchanged | `node tools/e2e-pw.js` before and after: same PASS list and exit 0 |
| AC-2 | New `app/tools/e2e-pw-voice.js`: each seat's getUserMedia is an OscillatorNode at 220+40*seat Hz, toggled per slot; turn-taking P01..P12 ~1.5 s each in MORNING day 1; per slot the RMS and dominant FFT bin (±1) on mod3d and P01 match the talking seat, others below threshold (P01 skips own slot); `data-speaking`/`data-spk` marker matches the talking seat at least once per slot | script PASS lines + report.json timeline |
| AC-3 | 3 s window with all 12 talking: all 12 peers on mod3d above threshold | script PASS line |
| AC-4 | NDA-Silence on P05 (`silenced=true` + push), P05 slot replayed: no P05 tone at mod3d/P01 (RMS below threshold, no peak at its bin); other players' UI shows no mute/silence text; after unsilence P05 heard again | script PASS lines |
| AC-5 | `mod:do toVote`: every peer cut off (no inbound audio, no connected peers) | script PASS line |
| AC-6 | Output in `app/e2e-out/voice/`: `voice-e2e.mp4` (12 phones 4x3 grid + mod3d large, mod3d received audio as soundtrack, audible per-seat tones), `raw/` (13 page .webm + mod3d-audio.webm + p01-audio.webm), `report.json` (checks + timeline slot→seat→freq/RMS). Clip written even when checks fail; exit 1 on any fail; no page errors | run headless locally, ffprobe shows video+audio streams, exit 0 |
| AC-7 | ffmpeg required (PATH or `FFMPEG` env): missing → fail fast at startup with a `brew install ffmpeg` message | run with `FFMPEG=/nonexistent PATH` without ffmpeg |
| AC-8 | `e2e-out/` in .gitignore; app/README.md notes how to run (PLAYWRIGHT_DIR, CHROME, E2E_PORT, E2E_HEADED, FFMPEG) | read |

## Out of scope
VOTE_INTERIM; burned-in subtitles; adding to `npm test`; product code changes in voice.js/mod3d/server (test hooks only via page-side injection from the script).
