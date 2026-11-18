# Checkpoint: change-e2e-voice-clip
Updated: step 10 · round 3
## Goal
lite — e2e voice-over test recorded as a video clip (spec agreed in grilling session; do not re-ask decisions). Prove the WebRTC mesh voice (ADR 0003) really works with 12 players and produce a clip with real audio, building on app/tools/e2e-pw.js. Decisions: (1) new app/tools/e2e-pw-voice.js, shared setup helper with e2e-pw.js (behaviour unchanged), not in npm test; (2) per-seat OscillatorNode tone 220+40*seat Hz via getUserMedia override; (3) MORNING day 1: turns P01..P12 ~1.5s → 3s all 12 → NDA-Silence P05 replay silent + no leak → unsilence heard → toVote all cut off; no VOTE_INTERIM; (4) RMS + FFT ±1 bin on mod3d and P01, speaking markers, no page errors, exit 1 on fail but still write clip; (5) recordVideo all 13 pages, MediaRecorder of received audio on mod3d + P01, ffmpeg grid 4x3 + mod3d with mod3d audio → voice-e2e.mp4, no subtitles; (6) ffmpeg required, fail fast with brew hint; (7) app/e2e-out/voice/ (mp4, raw/, report.json), e2e-out/ gitignored; README note.

## Run profile
lane: change (internal) · skipped 1, 2, 2b, 3b, 3c, 3d

## Status
step 1 setup done · base: main · baseline: red (user: continue, code is the only truth) · announcement: no · route: change (lite) · owner: BE · ffmpeg installed
r1: contract, be 46/46, review-1 Approve, QA pass (B-1 minor)
r2 (user: human voice, option a): Thai say Kanya + pilot tone, B-1/S-2/S-3 fixed; review-2 Approve; QA r2 Fail B-2 (AC-5 cut wait flake 1/3)
r3: B-2/SG-1/SG-2 fixed; dev 2/6 under load 40-90 (B-3 = host load); orchestrator rerun 3/3; review-3 Approve; QA r3 Pass 2/2
pause:human-gate · resume when user approves the branch

## Decisions in force
Grilling decisions in Goal are final (user, 2026-11-18). Round 2 voice = speech + pilot (user, 2026-11-19). Product code (voice.js, mod3d, server) not changed; test hooks injected from the script.

## Loop counters
QA loop: 1 reject (r2, B-2), closed r3

## Open blockers
None.

## History
- step 6 r1: Approve, 3 suggestions [6-r1]
- step 7 r1: Pass, B-1 minor [7-r1]
- step 7 r2: Fail, B-2 [7-r2]
- step 7 r3: Pass 2/2 [7-r3]

[6-r1]: review-1.md
[7-r1]: qa-report.md
[7-r2]: qa-report.md
[7-r3]: qa-report.md
