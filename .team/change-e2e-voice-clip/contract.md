# Contract: change-e2e-voice-clip

Scope: internal · Kind: internal-api · Owner: BE · Author: architect, round 1

Goal: a Playwright e2e that proves the WebRTC mesh voice (ADR 0003) with 12 players and records a watchable clip with real audio. Test tooling only: product code (`app/src`, `app/public`) is not changed; every hook is injected into the pages by the script.

## Stack
Platform: cli · Runtime: Node CommonJS (existing `app/tools`), `playwright-core` via `PLAYWRIGHT_DIR`, system `ffmpeg`; no new dependency, no ADR. Reuse the e2e-pw.js setup, build the page hooks. See [stack].

## Shared helper (AC-1)
`app/tools/e2e-pw-common.js` holds server/room/phone/mod3d/game-start setup and the `check` format; `e2e-pw.js` keeps its game loop. See [helper].

## CLI surface
`node tools/e2e-pw-voice.js`: env `PLAYWRIGHT_DIR CHROME E2E_PORT E2E_HEADED FFMPEG`, exit 0 / 1, startup order. See [cli].

## Page hooks
`app/tools/e2e-voice-hooks.js`: injected fake mic (OscillatorNode), RTCPeerConnection wrapper, per-sender analysers (RMS + FFT), speaking-marker sampler, received-audio MediaRecorder; track-to-seat by MediaStream id. No product hook gap, no blocker. See [hooks].

## Slot timeline, thresholds, checks (AC-2..AC-5)
Turns P01..P12 x 1500 ms, all-12 3 s, NDA-Silence P05 replay + unsilence, toVote cut-off; constants, evaluation rules, every PASS line name. See [timeline].

## Recordings and clip (AC-6, AC-7)
13 `recordVideo` pages, in-page audio blobs out via base64, alignment, ffmpeg 4x3 grid + mod3d large + mod3d soundtrack, ffmpeg fail-fast. See [clip].

## Schemas
`report.json` (checks + timeline slot -> seat -> freq/RMS) and the in-page sample. No database. See [schemas].

## File ownership
All files BE; product code untouched. See [ownership].

## AC id -> logic
AC-1..AC-8 each mapped to a section and a verification. See [ac-map].

Diagrams: none needed (dev-tool script; the numbered sequence in [timeline] states the order, no new component, datastore or integration in the product).

[stack]: contract/stack.md
[helper]: contract/helper.md
[cli]: contract/cli.md
[hooks]: contract/hooks.md
[timeline]: contract/timeline.md
[clip]: contract/clip.md
[schemas]: contract/schemas.md
[ownership]: contract/ownership.md
[ac-map]: contract/ac-map.md
