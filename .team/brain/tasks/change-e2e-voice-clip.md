---
project: deadline-necromancer
task: change-e2e-voice-clip
date: 2026-11-19
status: done
---
Playwright e2e for voice-over recorded as a watchable clip: `app/tools/e2e-pw-voice.js` (12 players + mod3d), shared setup in `app/tools/e2e-pw-common.js` (e2e-pw.js refactored onto it), page hooks in `app/tools/e2e-voice-hooks.js`. Each seat's fake mic = Thai speech from macOS `say -v Kanya` (looped) + quiet pilot tone 4000+150*seat Hz; seat identity from the pilot bin per remote stream (msid mapping). Scenario MORNING day 1: turns P01..P12 → all 12 → NDA-Silence P05 silent + no leak → unsilence → toVote cuts all. Output app/e2e-out/voice/ (voice-e2e.mp4 grid + mod3d audio, raw/, report.json), gitignored. ffmpeg required. Decisions came from a grilling session with the user.
Lane: change (internal), base main. Baseline red: user chose to continue with code as the only truth.
Branch feature/change-e2e-voice-clip accepted at the Human gate 2026-11-19 ("Approve"); merged to main 238e1fb, not pushed. No product code changed (app/src, app/public untouched).
Step 11 docs skipped: README run note written by backend-dev; no migration, config or user-visible change.
Links: [[agents/architect/change-e2e-voice-clip]] [[agents/backend-dev/change-e2e-voice-clip]] [[agents/code-reviewer/change-e2e-voice-clip]] [[agents/qa-tester/change-e2e-voice-clip]]

## Lessons
- Playwright recordVideo has no audio: capture received audio in-page (MediaRecorder on a mix of remote streams) and mux with ffmpeg.
- Headless Chromium with 12 remote streams plays out nothing unless the measuring AudioContext uses `sinkId:{type:'none'}`; mod3d on software GL starves timers, so darwin runs need `--use-angle=metal --ignore-gpu-blocklist`.
- Day 1 has no vote: `toVote` lands in VOTE_RESULT, not VOTE.
- 13 recording Chromium pages are load-sensitive: under host load 40-90 the suite passed 2/6; on a quieter host 5/5. Polling waits must re-read before failing (B-2).
- User asked for a human voice after watching the tone clip: show a sample clip early when the deliverable is audiovisual.
- Spawn tally: code-reviewer · sonnet: 3/3 approve (no Bash/Write: orchestrator wrote hand-offs). qa-tester: 1 sent back (r2 flake), r3 haiku rerun-only passed.

## Open issues
- Suite flaky under heavy host load (13 pages recording); no auto-retry.
- Review suggestions open: SG-3 heard uses max rms, SG-4 speech above 3.8 kHz may shift pilot peak (false-fail only), SG-6 cutMs not gated, SG-7 CUT_WAIT_MS not in report params.
- Non-darwin: no Metal flag, `say` absent → sine fallback; not run there.
- e2e-pw.js PASS count varies with the random game (oracle checks).

## Usage
- architect · sonnet · 133143
- backend-dev · sonnet · 190735 + 75645 + 36466 (3 rounds) = 302846
- code-reviewer · sonnet · 66822 + 45811 + 33240 = 145873
- qa-tester · sonnet/haiku · 42188 + 40345 + 28648 = 111181
- Agents total: 693043
- Orchestrator: at least not measured (no /context reading available in this session)
