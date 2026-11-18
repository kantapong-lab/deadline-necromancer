# AC id -> contract logic

| AC | Where designed | Logic / evidence |
|---|---|---|
| AC-1 | [helper.md](helper.md) | `e2e-pw-common.js` exports (`initEnv`, `startRoom`, `joinPlayers`, `openMod3d`, `startGame`, `makeChecker`, `makeWatch`, `loadPw`, `clickIf`); `e2e-pw.js` keeps only game loop, oracle checks, sheets. Verified by running `node tools/e2e-pw.js` before/after: same check names, exit 0 |
| AC-2 | [hooks.md](hooks.md), [timeline.md](timeline.md) | fake mic `220+40*seat` Hz via injected `getUserMedia`; `tone(on)` per slot; 12 x `SLOT_MS` turns in MORNING day 1; per-sender RMS + FFT peak (+-1 bin) on mod3d and P01 from remote-track analysers mapped by MediaStream id; `data-spk` / `data-speaking` sampled as `mk`; check lines `AC-2 slot NN ...`; `report.json timeline` entries `phase: turn` |
| AC-3 | [timeline.md](timeline.md) step 4 | all 12 tones on for `ALL_MS`, window `[t0+1000, t0+3000]`, 12/12 `heard` on mod3d (+ P01 11/11); entry `phase: all` |
| AC-4 | [timeline.md](timeline.md) steps 5-6 | `G.players[pid(4)].silenced = true` + `pushState(room)`; replay P05 slot: `quiet(4)` on mod3d and P01, `mixTone[4] < FLOOR_DB`, no marker; others' `innerText` leak diff and `#vcBtn[data-vs]`; unsilence -> reconnect poll -> `heard(4)` again; entries `silenced` / `unsilenced` |
| AC-5 | [timeline.md](timeline.md) step 7 | tones on, `act('toVote')`, poll `connected().all === 0` on all 13 pages, then `mixRms < T_OFF` on mod3d and P01; entry `toVote` |
| AC-6 | [clip.md](clip.md), [schemas.md](schemas.md) | output tree under `app/e2e-out/voice/`; `recordVideo` x13 + in-page `MediaRecorder` on mod3d and P01; ffmpeg 4x3 grid + mod3d large + mod3d soundtrack -> `voice-e2e.mp4`; `report.json`; `finally` block writes the clip when checks fail; exit 1 on any FAIL; page-error check. Verify: headless run, `ffmpeg -i voice-e2e.mp4` shows Video + Audio, exit 0 |
| AC-7 | [clip.md](clip.md) discovery, [cli.md](cli.md) step 1 | `FFMPEG` or PATH, `-version` + `-encoders` probe, fail fast with `brew install ffmpeg`, exit 1 before server/browser. Verify: `FFMPEG=/nonexistent node tools/e2e-pw-voice.js` |
| AC-8 | below | `.gitignore` and `app/README.md` |

## AC-8 detail
- Root `.gitignore`: add line `app/e2e-out/` (same style as the existing `app/node_modules/`, `app/.certs/` lines).
- `app/README.md`: one bullet (Thai, next to the existing "ทดสอบ e2e ในเบราว์เซอร์จริง" bullet): command `PLAYWRIGHT_DIR=<node_modules dir with playwright-core> node tools/e2e-pw-voice.js`; env table `PLAYWRIGHT_DIR`, `CHROME`, `E2E_PORT`, `E2E_HEADED`, `FFMPEG`; requires ffmpeg (`brew install ffmpeg`); not in `npm test`; output `app/e2e-out/voice/` (`voice-e2e.mp4`, `raw/`, `report.json`); exit 1 on any FAIL, clip still written; mention that `tools/e2e-pw.js` shares the setup helper.
