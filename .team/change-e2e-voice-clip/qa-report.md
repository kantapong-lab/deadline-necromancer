# QA report: change-e2e-voice-clip (round 2 appended below; round 1 text kept)

Verdict: Pass. 8/8 AC pass, 1 bug (minor, non-blocking). Branch qa/change-e2e-voice-clip @ 7b164dc, headless Chromium (playwright cache), macOS.
No test files added: the deliverable is the script itself; it was run unmodified. Worktree clean.

## Runs
| run | command | result | exit |
|---|---|---|---|
| 1 | `node tools/e2e-pw-voice.js` | E2E VOICE OK: 46/46 checks, clip 36.2 s | 0 |
| 2 | same (room differs, same PASS list) | E2E VOICE OK: 46/46 checks, clip 37.4 s | 0 |
| 3 | `node tools/e2e-pw.js` | E2E OK: 20/20 checks, 5 days | 0 |
| 4 | old e2e-pw.js (4e9e540, pre-refactor) | E2E OK: 20/20 checks, 5 days | 0 |
| 5 | `FFMPEG=/nonexistent` | `FAIL ffmpeg not found or unusable (/nonexistent): install it with "brew install ffmpeg" ...`, no browser started, existing output untouched | 1 |
| 6 | `env -i PATH=/nonexistent` (no ffmpeg on PATH) | same FAIL message, `brew install ffmpeg` | 1 |

Flakiness: 2/2 identical PASS lists (46), no retries.

## AC id -> test name
| AC | result | evidence |
|---|---|---|
| AC-1 | Pass | e2e-pw.js 20/20 exit 0 new and old. PASS lists identical except the random oracle day number (day 2 vs 3), a function of the random game. Common helper in `tools/e2e-pw-common.js` |
| AC-2 | Pass | report.json timeline slots 1..12: talker seat n, peak 222.7/257.8/298.8/339.8/380.9/421.9/462.9/498/539.1/580.1/621.1/662.1 Hz vs expected 220+40n (within +-1 bin), rms ~0.354, others max 0, marker true every slot |
| AC-3 | Pass | all-12 window PASS line in both runs |
| AC-4 | Pass | silenced P05: rms 0, -inf dB at 380 Hz on mod3d and P01, no marker, no mute/silence UI text; unsilenced: heard 380.9 Hz rms 0.353 on mod3d and 0.3528 on P01, reconnected out 12 |
| AC-5 | Pass | toVote (day 1 VOTE_RESULT, review D-3): connected=0 on all 13 pages, mixRms 0 on mod3d and P01. See bug B-1 |
| AC-6 | Pass | `app/e2e-out/voice/`: voice-e2e.mp4 h264 1920x1080 + aac, 37.4 s; volumedetect mean -9.5 dB (not silent; max 0.0 dB, tones near full scale); raw/ has p01..p12.webm, mod3d.webm, mod3d-audio.webm, p01-audio.webm (+ samples json); report.json has checks 46 (0 failing), timeline 16 entries, pageErrors, clip. Frames at 5 s and 30 s: mod3d large left (12 seat cards, phase tabs, scroll), 4x3 phone grid right; speaking glow visible on the talking seat (P03, P02 in frame at 5 s, transition boundary) |
| AC-7 | Pass | runs 5 and 6, exit 1, fail-fast before browser |
| AC-8 | Pass | `git check-ignore e2e-out` matches; app/README.md line 61 documents PLAYWRIGHT_DIR, CHROME, E2E_PORT, E2E_HEADED, FFMPEG, brew install ffmpeg |

## Bugs
| id | severity | summary |
|---|---|---|
| B-1 | minor (non-blocking) | Review S-1 confirmed. `app/tools/e2e-pw-voice.js:342-344`: the AC-5 inbound-audio check computes `mm`/`pm` as `Math.max(0, ...inWin(mixBlocks).map(rms))` and tests `< T_OFF` with no MIN_SAMPLES guard (heardOf/quietOf at lines 67/72 do have it). If the mixBlocks window is empty (recorder/analyser died) the max is 0 and the check passes vacuously. Mitigated: the separate `connected()=0` on 13 pages check still proves the cut-off, and runs showed rms 0 only after 4+ samples in other checks. Fix: require `inWin(...).length >= MIN_SAMPLES` (or use `quiet.ok && mm < T_OFF`). Not reproduced as a false pass; code-read only |

Suggestions (not bugs): S-2 contract/timeline.md:54 still says phase VOTE; S-3 README note recent Chrome and darwin Metal flag.

## Notes
- Output left at `/Users/hyde_harmonyx/development/deadline-necromancer/.worktrees/qa-change-e2e-voice-clip/app/e2e-out/voice/` (gitignored).
- macOS has no `timeout`; runs were bounded with perl alarm.

## Round 2 (Thai speech per seat + pilot 4000+150*seat Hz)
Verdict: Fail (flaky). 1 of 3 runs failed AC-5 `no connected peers on any of 13 pages`; B-2 major. Branch qa/change-e2e-voice-clip @ bc2b284, headless Chromium, macOS. No test files added; worktree clean.

### Runs
| run | command | result | exit | clip |
|---|---|---|---|---|
| 1 | `node tools/e2e-pw-voice.js` | E2E VOICE OK: 46/46 checks | 0 | 67.0 s |
| 2 | same | E2E VOICE FAILED: 45/46 checks. FAIL `AC-5 toVote: no connected peers on any of 13 pages :: [0,0,0,0,0,0,0,0,0,0,0,0,0]` | 1 | 89.8 s |
| 3 | same | E2E VOICE OK: 46/46 checks | 0 | 64.4 s |
| 4 | `node tools/e2e-pw.js` (AC-1) | E2E OK: 22/22 checks, 5 days | 0 | - |

Flake count: 1/3 (run 2). AC-4 single-snapshot flake from SG-2 did NOT occur in 3 runs. Run 1 also first hit `Cannot find module socket.io-client` (worktree has no node_modules; env issue, fixed with NODE_PATH, not counted).

### Per-AC (round 2)
| AC | result | evidence |
|---|---|---|
| AC-1 | Pass | e2e-pw.js 22/22 exit 0 (was 20/20 in round 1; two more checks since, no failure) |
| AC-2 | Pass 3/3 | runs 1,3 all 12 turn slots PASS, pilot peak within +-1 bin of 4000+150n (e.g. P01 4002 Hz, P05 4599.6 Hz), speech rms ~0.22, others max 0, marker true every slot. Run 2 slots also PASS (only AC-5 failed) |
| AC-3 | Pass 3/3 | all-12: 12/12 peers on mod3d (rms 0.19-0.25), P01 hears 11/11 |
| AC-4 | Pass 3/3 | silenced P05: rms 0, pilot -142..-200 dB, no marker, no mute text; unsilenced heard speech 0.23 pilot -57 dB @4599.6 Hz, reconnected out 12 |
| AC-5 | Fail 1/3 | runs 1,3 pass. Run 2: the connected-peers check failed while its own detail line re-read shows all 0 (see B-2). inbound-audio check passed in run 2 (mixRms 0, samples 12/12 >= 4) |
| AC-6 | Pass | clip h264 1920x1080 + aac, report.json 16 timeline entries, raw/ complete; speech check below |

Speech audibility (run 3 clip `voice-e2e.mp4`, ffmpeg bandpass 300-3000 Hz, volumedetect mean per slot window):
turn slots 1..12: -21.6 -22.0 -21.4 -23.0 -21.2 -21.0 -23.6 -21.6 -21.9 -22.7 -20.9 -23.0 dB; all-12 window -12.5 dB; silenced-P05 slot -91.0 dB; unsilenced slot -21.7 dB; toVote window -91.0 dB. Every talking slot is ~68-70 dB above the silenced slot, so speech is audible per slot and silence is true silence.
Frame at 9.0 s (slot 3): mod3d large left shows P03 card with speaking glow and `))` marker, log text "no one speaking yet" (stale Thai note panel, cosmetic); 4x3 phone grid right.

### Bugs (round 2)
| id | severity | summary |
|---|---|---|
| B-1 | closed | MIN_SAMPLES guard now in AC-5 inbound check (`quiet.ok` requires samples >= 4; run 2 and 3 log `samples 12/12 (>= 4)`). Residual: line 382 has an assignment swallowed by a trailing `//` comment (review SG-1), harmless |
| B-2 | major (flaky test, 1/3) | `app/tools/e2e-pw-voice.js:241-245`: AC-5 poll `until(all conn()==0, CUT_WAIT_MS=10000)` timed out in run 2, then the failure detail (a fresh read) showed `[0 x13]`, so the cut-off happened just after the 10 s deadline. Run 2 was the slow one (clip 89.8 s vs 64-67 s), machine load. False fail, not a product bug. Fix: raise CUT_WAIT_MS to ~20-30 s (RECONNECT_WAIT_MS is 15 s) and, on timeout, re-read before deciding. Not a mesh bug: peers did reach 0 |

Suggestions: SG-1..SG-5 from review-2 stand (SG-5 clip 60.7 s; observed 64-90 s). SG-2 not reproduced.

Output left at `/Users/hyde_harmonyx/development/deadline-necromancer/.worktrees/qa-change-e2e-voice-clip/app/e2e-out/voice/` (run 3 output, gitignored).

## Orchestrator rerun after round 3 (2026-11-19)
B-3 (dev: 2/6 under load avg 40-90) re-measured on a quieter host: 3/3 runs 46/46 exit 0 (106/101/112 s, load 18-44); AC-5 cut-off 123/244/1298 ms (limit 30000). B-3 = host load, not code.
