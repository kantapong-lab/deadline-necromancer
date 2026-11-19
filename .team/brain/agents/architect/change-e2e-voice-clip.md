# architect: change-e2e-voice-clip

## 2026-11-18 round 1
- Wrote `.team/change-e2e-voice-clip/contract.md` (index) + `contract/{stack,helper,cli,hooks,timeline,clip,schemas,ownership,ac-map}.md` in the feature worktree. AC-1..8 mapped. `check-artifacts.mjs` OK.
- Stack: unchanged (Node CommonJS tools, playwright-core via PLAYWRIGHT_DIR, system ffmpeg). Platform: cli. No ADR, `diagrams: none needed (dev-tool script, sequence is a numbered list in timeline.md)`.
- New files: `app/tools/e2e-pw-common.js`, `e2e-voice-hooks.js`, `e2e-pw-voice.js`; edits: `e2e-pw.js`, `app/README.md`, `.gitignore` (`app/e2e-out/`). All BE.
- Decisions: seat = page index (tone 220+40*seat, pid via player name); track -> sender seat by MediaStream id (msid) with ICE-ufrag fallback; per-sender analysers + mix recorder in the hook's own AudioContext (48 kHz, FFT 8192, +-1 bin); analysis post-hoc from 100 ms in-page samples (Date.now); recorders + video offsets give clip alignment, trim done in ffmpeg filters; ffmpeg probe runs before server/browser; Chromium flag `WebRtcHideLocalIpsWithMdns` disabled so 288 local pcs connect.
- Findings: no product-side hook gap (RTCPeerConnection and getUserMedia are read at call time; `__mod3d.desks[pid].el`, `Voice.status()` exist). Game start lands in MORNING day 1; `canSpeak` only depends on phase/alive/silenced/paused.
- Open `[verify]` (could not run the app, Bash is checks-only): msid stream id equality at the receiver; thresholds T_ON 0.10 / T_OFF 0.01 / FLOOR_DB -60; video-to-audio alignment error < 0.3 s; mesh of 144 pcs connecting inside 60 s. Implementer tunes constants, not rules.
