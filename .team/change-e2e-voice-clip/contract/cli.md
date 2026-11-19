# CLI surface: `node tools/e2e-pw-voice.js` (cwd `app/`)

Not in `npm test` (needs Playwright + ffmpeg). No flags, no stdin. `--help` not provided (same as `e2e-pw.js`); the header comment lists the env.

## Env
| Name | Default | Use |
|---|---|---|
| `PLAYWRIGHT_DIR` | unset | node_modules dir holding `playwright-core` (it is not in `app/node_modules`) |
| `CHROME` | Playwright's cached chromium | Chromium binary path |
| `E2E_PORT` | `3341` | in-process server port (`e2e-pw.js` 3340, `e2e-voice-browser.js` 3320) |
| `E2E_HEADED` | unset | `1` = visible browsers (all 12 tones then play out of the speakers) |
| `FFMPEG` | `ffmpeg` on PATH | ffmpeg binary; when set, PATH is not searched |

## Exit codes
| Code | Meaning |
|---|---|
| 0 | every check PASS, clip written; or `SKIP playwright not found ...` (same message and 0 as `e2e-pw.js`) |
| 1 | any FAIL (including page errors and mesh/mux failures), unusable ffmpeg, or uncaught script error (`SCRIPT-ERR <stack>`) |

## stdout / stderr
stdout only: progress lines (`room <code> · out <dir>`, `slot 03 P03 300Hz start`, ...), then one `PASS|FAIL <name> :: <detail>` per check (timeline.md), final `E2E VOICE OK|FAILED: <passed>/<total> checks · clip <path>`. stderr: only the `SCRIPT-ERR` stack. Machine-readable result: `report.json` (schemas.md).

## Startup order
1. Resolve and verify ffmpeg (clip.md); fail fast with the `brew install ffmpeg` message.
2. `initEnv('3341')`, `loadPw()`; missing -> `SKIP` line, exit 0.
3. Wipe/create `app/e2e-out/voice/raw`.
4. `startRoom`, `launchBrowser(pw, VOICE_ARGS)` (stack.md), join 12 phones, `openMod3d`, check `12 players joined through the join form`, `startGame`.
5. Timeline steps 2-8 (timeline.md).

## Behaviour rules
- A failed check never stops the run: remaining steps still execute and the clip is still written (AC-6). Only an uncaught error or step-1/2 conditions end early; the `finally` block still muxes what exists.
- The run never mutates product files; it changes game state only through the mod socket (`act`) and the engine object (`G.players[pid].silenced`, then `pushState(room)`), the same lever `e2e-voice-browser.js` uses.
- Expected runtime: roughly 2-4 minutes (mesh setup dominates), clip length about 45-70 s.
