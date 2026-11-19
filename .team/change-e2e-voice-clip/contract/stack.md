# Stack: change-e2e-voice-clip

Platform: cli
Runtime: Node (existing `app/` CommonJS tools, same as `app/tools/e2e-pw.js`); browser = Chromium via `playwright-core` (loaded through `PLAYWRIGHT_DIR`, never added to `app/package.json`); `ffmpeg` binary found on PATH or by `FFMPEG` env. No new npm dependency, no ADR, no diagram.

## Reuse / build / buy
| Capability | Choice | Reason |
|---|---|---|
| In-process server, mod socket, 12 phones, mod3d page, game start | reuse (extract from `e2e-pw.js` into `e2e-pw-common.js`) | AC-1: one copy, `e2e-pw.js` behaviour unchanged |
| Playwright loading, `check()` PASS/FAIL format, page-error filter | reuse (same helper) | keeps both runners identical in style |
| Fake microphone | build (page-injected `getUserMedia` returning an OscillatorNode stream) | Chromium `--use-fake-device` gives one shared beep, not a per-seat frequency |
| Per-peer tone/RMS/FFT measurement, speaking-marker sampling, received-audio recorder | build (page-injected hook, own AudioContext) | product code may not change (ac.md Out of scope); a separate context cannot disturb the product graph |
| Video of 13 pages | reuse Playwright `recordVideo` | records no audio, hence the in-page recorder below |
| Grid + soundtrack mux | buy-free: system `ffmpeg` (libx264 + aac) | the only tool that tiles and muxes; required, fail fast if absent (AC-7) |
| Audio analysis library, wav/FFT npm package | not used | `AnalyserNode` gives RMS and spectrum in-page for free |

## Options for the hard-to-reverse choice (how received audio reaches the report)
1. In-page analysers on every remote track, sender found by MediaStream id (chosen): ground truth per sender, zero product change; locks in "tools own a page hook".
2. Record only the page output (video/system audio) and analyse offline with ffmpeg: no per-sender split, cannot prove routing; rejected.
3. Patch `voice.js` / `mod3d/voice.js` to expose peers: forbidden by ac.md, rejected.

## Browser launch args (headless unless `E2E_HEADED=1`)
`--use-fake-ui-for-media-stream`, `--autoplay-policy=no-user-gesture-required`, `--disable-features=WebRtcHideLocalIpsWithMdns` (host candidates stay real IPs so 288 local pcs connect without mDNS), `--disable-background-timer-throttling`, `--disable-renderer-backgrounding`, `--disable-backgrounding-occluded-windows` (headed run keeps the 100 ms sampler alive). `executablePath: CHROME || undefined`. Localhost is a secure context so mic APIs need no HTTPS.

## Load / capacity note
12 players x (11 peers + mod) = 144 outbound + 144 inbound RTCPeerConnections in one Chromium process, 13 videos recorded, mod3d on software GL. Slow but within ADR 0003 limits (mesh cap ~12). A mesh that does not come up within `MESH_WAIT_MS` is a FAIL, not a skip; the clip is still written.
