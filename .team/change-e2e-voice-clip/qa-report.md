# QA report: change-e2e-voice-clip (round 1)

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
