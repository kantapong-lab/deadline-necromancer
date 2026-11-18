---
project: deadline-necromancer
task: voice-over
date: 2026-11-18
status: in progress
---
Voice chat: players talk by mic (WebRTC, signalling via Socket.IO), Mod3D + other players hear, server-enforced mute for NDA Silence / Burnout / voted-out. Open only in MORNING + VOTE_INTERIM (same as chat). Route: full flow, stops at QA-passed branch on docker local.
Decisions (user, 2026-11-18): audience = Mod3D + all players; phases = same as chat; muted = Burnout + NDA Silence + voted-out; baseline red -> continue anyway.
Design spec: https://claude.ai/artifact/6Si4UJcQbKa4GDq44pkb6v
3d skipped: no trigger (zero new deps, no devops-owned files)

status: done (branch feature/voice-over accepted at the Human gate, not merged, not pushed, not deployed)
Release notes + Deploy hand-off: .team/voice-over/release-notes.md (on the branch). ADR: docs/adr/0003-voice-mesh-webrtc.md. Plan: docs/plan/voice-over.md.
## Lessons
- Reviewer rejects ANY added comment that is not a function description directly above a function: tell devs at step 4 to add none (cost 2 fix rounds + 1 delta review).
- check-artifacts wants `AC-n` literally in contract maps, no `[P0]` brackets in ac.md, brief.md <= 60 lines: tell PM/architect/researcher in the prompt.
- gate-summary 3c needs a `## AC id -> artboard` table in design.md; non-UI AC can say `n/a no UI`.
- Re-record app/test/http-parity.json after merging any change to a served file (index.html, style.css, mod3d.html).
- QA in this repo has no browser or mic: WebRTC/mic ACs stay manual (M1-M4 in qa-report.md). Real browser check still owed.
- spawns.tsv tok check treats same role+step spawns as one cumulative agent: fresh fix-round spawns had to be logged tok:n/a.
## Open issues
- Manual steps M1-M4 not run (AC 1,2,3,13,17,18,19 unverified in a real browser; Mod3D audio untested).
- S-8 FE: ICE candidate for outbound link can be dropped while onAnswer awaits setRemoteDescription (simultaneous two-way talk). S-9/S-10/S-11 minor cleanups.
- S-7: alive registered peer sending no offer in MORNING is identifiable as silenced via webrtc-internals (follows from AC-5); accepted risk unconfirmed by PM.
- docs/strategy.md (3 lines) was written by the PM although it is a shared file.
## Usage
- researcher sonnet 35.7k; product-manager sonnet 29.5k; designer sonnet 30.5k; architect sonnet 123.3k; devops sonnet 40.3k
- frontend-dev sonnet 91.9k + 40.9k; backend-dev sonnet 84.1k + 41.3k + haiku 18.1k
- code-reviewer opus 115.3k + opus 80.1k + sonnet 14.0k; qa-tester sonnet 38.2k; docs-writer haiku 62.3k
- Orchestrator: not read from /context (at least some tens of k); subagent total about 845k
## Browser check (2026-11-18, after the gate)
Headless Chrome with a fake mic (puppeteer), 2 player pages + Mod3D page + 4 socket bots, server from feature/voice-over at a9d5e24: 10/11 pass. Verified live: mic capture (AC-1), players hear each other with real RTP audio (AC-3), Mod3D receives both speakers (AC-2/15), sound gate click (AC-18), self-mute toggle (AC-17), a speaking marker on a desk (AC-19), leaving MORNING closes all outbound connections and shows the generic game-muted button (AC-8), insecure LAN origin has no mediaDevices (AC-13 path). The one FAIL was only /favicon.ico 404 (pre-existing).
Still not verified: audible panning/positioning in Mod3D, real phones, the Thai hint text on the insecure page, silenced/burnout/voted-out mute in a browser (server-side tested only), S-8 simultaneous two-way talk looked fine in this run (both players received audio) but is not proven.
