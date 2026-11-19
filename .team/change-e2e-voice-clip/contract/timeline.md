# Slot timeline, thresholds and check rules (AC-2..AC-5)

Seat `s` = page index 0..11 (P01 = 0). Tone `f(s) = 220 + 40*s` Hz (P01 220 ... P12 660; P05 = seat 4 = 380 Hz). `pid(s)` = engine player id from `startGame().seat(s)`. All times are `Date.now()` epoch ms (same machine clock in the script and every page).

## Constants (top of `e2e-pw-voice.js`, passed to the hook, written to `report.json params`)
| Name | Value | Meaning |
|---|---|---|
| `SR` / `FFT` | 48000 / 8192 | bin width 5.86 Hz; adjacent tones are 6.8 bins apart; window = 170 ms |
| `TICK_MS` | 100 | sampler period |
| `TONE_GAIN` | 0.5 | sine RMS ~0.354 before Opus |
| `SLOT_MS` / `SETTLE_MS` | 1500 / 700 | slot length; analysis window = `[t0+SETTLE, t0+SLOT]` (previous tone tail and jitter buffer are gone) |
| `ALL_MS` / `ALL_SETTLE_MS` | 3000 / 1000 | AC-3 window `[t0+1000, t0+3000]` |
| `T_ON` | 0.10 | RMS at or above = "heard" |
| `T_OFF` | 0.01 | RMS strictly below = "silent" (max over the window) |
| `FLOOR_DB` | -60 | mix magnitude at the tone's bins must stay below (a heard tone sits near -10) |
| `BIN_TOL` | 1 | peak bin within +-1 of `round(f*FFT/SR)` |
| `MIN_SAMPLES` | 4 | fewer samples in a window = FAIL "no data" |
| `MESH_WAIT_MS` / `SILENCE_WAIT_MS` / `RECONNECT_WAIT_MS` / `CUT_WAIT_MS` | 60000 / 5000 / 15000 / 10000 | polling limits (poll every 300 ms) |
| `PREROLL_MS` / `TAIL_MS` | 1000 / 1000 | extra clip time before slot 1 and after the AC-5 window |
Thresholds are the contract's starting values; if a smoke run shows false fails, the implementer tunes the constants (not the rules) and records it in `report.json params`.

## Sequence (every step logs one progress line; checks are evaluated after the run from the samples)
1. Startup (cli.md order). Join 12 phones + mod3d (hooks installed), `startGame` -> MORNING day 1 (`G.phase === 'MORNING'`, else FAIL `AC-2 game is in MORNING`).
2. All 12 pages `Voice.toggle()` (via `page.evaluate`, same public call the button makes). Poll until mod3d `connected().in === 12` and every player `in === 11 && out === 12` (<= `MESH_WAIT_MS`) -> check `AC-2 voice mesh up`. Then 1 s settle. `tClipStart = now - PREROLL_MS`.
3. AC-2 turns: for `k = 0..11`: one `Promise.all` turns seat `k-1` off and seat `k` on, `t0 = Date.now()` taken just before, sleep to `t0 + SLOT_MS`. Window `W = [t0+SETTLE, t0+SLOT]`. After seat 11 all tones off, sleep 500 ms.
4. AC-3: all 12 on, `t0`, sleep `ALL_MS`, all off, sleep 700 ms.
5. AC-4 silence: snapshot `innerText` of the 11 other pages. `G.players[pid(4)].silenced = true; pushState(room)`. Poll P05 `#vcBtn[data-vs]` = `gm` (<= `SILENCE_WAIT_MS`), sleep 1500 ms (others must not react). Replay slot: P05 tone on `SLOT_MS`, off. Re-read the 11 pages' text and `#vcBtn[data-vs]`.
6. AC-4 unsilence: `silenced = false; pushState(room)`. Poll P05 `connected().out === 12` (<= `RECONNECT_WAIT_MS`), sleep 500 ms, P05 tone on `SLOT_MS`, off.
7. AC-5: all 12 tones on, `r = act('toVote')`. Poll all 13 pages `connected().all === 0` (<= `CUT_WAIT_MS`); then window `W = [tz+300, tz+1500]` with `tz` = poll-success time (tones still on); all off. `tClipEnd = now + TAIL_MS`.
8. Drain: `stopRecorder()` and `__dn.samples` / `info()` from mod3d and P01; `streamIds` from all 12 players. Evaluate, close contexts, save videos, mux (clip.md), write `report.json`, shut down.

## Evaluation rules (receiver R in {mod3d, P01})
Samples of R inside the window; `per[sid]` mapped to seat; per seat: `rms` = median over the window, `peakHz` = median bin * binHz, `maxRms` = max.
- `heard(s)`: `rms >= T_ON` and `|medianBin - round(f(s)*FFT/SR)| <= BIN_TOL`.
- `quiet(s)`: seat absent in all samples, or `maxRms < T_OFF`.
- Slot ok(R) = `heard(talker)` and `quiet(every other seat)`; P01 never has seat 0 as a source: in slot 1 P01 only needs `quiet(all)` (own slot skipped).
- Marker ok(R) (slot k): any sample in the full `[t0, t0+SLOT]` has `pid(k)` in `mk` (mod3d every slot; P01 slots 2..12).

## Check lines (names; `PASS|FAIL <name> :: <detail with rms/Hz>`)
| AC | Check name | Rule |
|---|---|---|
| AC-2 | `voice mesh up` | step 2 poll reached |
| AC-2 | `every inbound stream maps to a seat` | no unmapped `sid` on mod3d or P01 |
| AC-2 | `slot NN P<NN> <f>Hz mod3d: tone, others quiet, marker` (x12) | slot ok + marker ok |
| AC-2 | `slot NN P<NN> <f>Hz P01: tone, others quiet, marker` (x12) | slot 1: quiet only; others slot ok + marker ok |
| AC-3 | `all 12 talking: 12/12 peers above threshold on mod3d` | every seat `heard` on W |
| AC-3 | `all 12 talking: P01 hears the other 11` | seats 1..11 `heard` (extra evidence, same window) |
| AC-4 | `NDA-Silence applied: P05 game-muted, others still on/spk` | P05 `vs === gm`; the other 11 `vs` in {on, spk} |
| AC-4 | `silenced P05 slot: no P05 tone on mod3d` / `... on P01` | `quiet(4)` and max `mixTone[4]` < `FLOOR_DB` |
| AC-4 | `silenced P05 slot: no speaking marker for P05` | `pid(4)` never in `mk` of either page in the slot |
| AC-4 | `other players' UI shows no mute/silence text` | per page, matches of the `leaks` regex from `e2e-voice-browser.js` (NDA, Silence, silenc, ปิดปาก, mute, Burnout; case-insensitive) after the replay are a subset of the matches before |
| AC-4 | `unsilenced: P05 reconnected` | step 6 poll reached |
| AC-4 | `unsilenced P05 slot: heard on mod3d` / `... on P01` | `heard(4)` and `quiet(others)` |
| AC-5 | `toVote accepted, MORNING left (day 1: VOTE_RESULT)` | `r.ok` and `G.phase !== 'MORNING'` (D-3: the engine skips the vote on day 1 and goes to VOTE_RESULT) |
| AC-5 | `toVote: no connected peers on any of 13 pages` | poll reached |
| AC-5 | `toVote: no inbound audio on mod3d and P01` | `>= MIN_SAMPLES` samples in W and max `mixRms` over W < `T_OFF` on both (empty window fails, B-1) |
| AC-6 | `13 page videos and 2 audio recordings saved` | files exist and are non-empty |
| AC-6 | `clip voice-e2e.mp4 written (video + audio)` | clip.md |
| AC-6 | `no JS errors on any page, hooks healthy` | `errs` empty and every `__dn.errors` empty |
| AC-7 | startup `ffmpeg` line | cli.md |

Timeline entries (schemas.md) are written for steps 3-7 whether or not the check passes.

## Round 2: speech + pilot (user change)

- Mic per seat = Thai speech (`say -v Kanya -r <rate>`, one line per seat, looped while on) + pilot sine at `PILOT_BASE + PILOT_STEP*seat` Hz (4000 + 150*seat, about -30 dB under the speech). No `say` / not darwin: WARN, the old sine 220+40*seat Hz replaces the speech.
- Slots: `SLOT_MS` 2600, `SETTLE_MS` 800, `GAP_MS` 400 of silence before each slot (drains the previous talker's tail), `ALL_MS` 3500. Clip about 65 s.
- Seat identity = peak inside the pilot band only (bin must be within `BIN_TOL` of the seat's pilot bin). Heard = pilot >= `P_ON` dB and speech rms >= `T_SPEECH`; quiet = pilot < `P_OFF` dB and rms < `T_OFF`. Measured pilot Hz / dB and speech rms are in `report.json` timeline.
