# Checkpoint: change-e2e-voice-clip
Updated: step 10 · round 1
## Goal
lite — e2e voice-over test recorded as a video clip (spec agreed in grilling session; do not re-ask decisions). Prove the WebRTC mesh voice (ADR 0003) really works with 12 players and produce a clip with real audio, building on app/tools/e2e-pw.js. Decisions: (1) new app/tools/e2e-pw-voice.js, shared setup helper with e2e-pw.js (behaviour unchanged), not in npm test; (2) per-seat OscillatorNode tone 220+40*seat Hz via getUserMedia override; (3) MORNING day 1: turns P01..P12 ~1.5s → 3s all 12 → NDA-Silence P05 replay silent + no leak → unsilence heard → toVote all cut off; no VOTE_INTERIM; (4) RMS + FFT ±1 bin on mod3d and P01, speaking markers, no page errors, exit 1 on fail but still write clip; (5) recordVideo all 13 pages, MediaRecorder of received audio on mod3d + P01, ffmpeg grid 4x3 + mod3d with mod3d audio → voice-e2e.mp4, no subtitles; (6) ffmpeg required, fail fast with brew hint; (7) app/e2e-out/voice/ (mp4, raw/, report.json), e2e-out/ gitignored; README note.

## Run profile
lane: change (internal) · skipped 1, 2, 2b, 3b, 3c, 3d

## Status
step 1 setup done · base: main · baseline: red (user: continue, code is the only truth) · announcement: no · route: change (lite) · owner: BE · ffmpeg installed
step 3 contract done · step 4 be merged (46/46) · step 6 review-1 Approve (S-1..S-3) · step 7 QA L3 pass 46/46 x2, e2e-pw 20/20, B-1 minor (=S-1)
pause:human-gate · resume when user approves the branch or asks for the B-1 fix round

## Decisions in force
Grilling decisions in Goal are final (user, 2026-11-18). Product code (voice.js, mod3d, server) not changed; test hooks injected from the script.

## Loop counters
None.

## Open blockers
None.

## History
- step 6 r1: Approve, 3 suggestions [review-1.md]
- step 7 r1: Pass, B-1 minor [qa-report.md]
