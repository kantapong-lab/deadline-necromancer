# Project: deadline-necromancer
Node + Socket.IO multiplayer game (app/), docs/ rules + card images.
## Lessons
- 2026-11-15: gate guard needs `Task:` alone on the first prompt line; onboard architect is blocked while other checkpoints exist; 44 ACs need ac.md as a table with inline links; text-only design needs a published spec page plus AC->artboard rows [[tasks/event-cards-16-20]]
- 2026-11-15: land engine changes in two stages (refactor on the old golden snapshot, then cards) [[tasks/event-cards-16-20]]
- 2026-11-16: re-record app/test/http-parity.json after every merge that changes a served file; worktrees need NODE_PATH to the main app/node_modules; when artifact publish is denied, serve the mockup from the poc server for gate 3c [[tasks/change-chat-quick-replies]]
- 2026-11-18: changing a role's target count (`t`) shifts the golden Math.random sequence via bot draws; write the V-1 guard as an A/B of the engine block on identical data. On macOS the `poc` launch config (`python`) fails and publish/preview were denied, so gate 3c ran on a file:// preview [[tasks/change-data-oracle-correlation]]
- 2026-11-19: Playwright video has no audio (record received audio in-page + ffmpeg); headless 12-stream playout needs AudioContext sinkId none and darwin --use-angle=metal; day 1 toVote lands in VOTE_RESULT; show an early sample clip for audiovisual deliverables [[tasks/change-e2e-voice-clip]]
## Open issues
- change-e2e-voice-clip: voice e2e flaky under heavy host load (13 recording pages), review SG-3/4/6/7 open, not run off macOS [[tasks/change-e2e-voice-clip]]
- change-data-oracle-correlation: 3D Data Correlation fx not run in a real browser; test nits S-2/S-3; qa-cards.js 3 failures already on main (stale harness); Senior Dev "none" dark tell is a separate balance task [[tasks/change-data-oracle-correlation]]
- change-chat-quick-replies: review suggestions S-4/S-5 open; not tested on real touch/iOS; simulate flaked once [[tasks/change-chat-quick-replies]]
- change-lobby-ui: lobbySeen not pruned (http-parity re-recorded on change-chat-quick-replies branch) [[tasks/change-lobby-ui]]
- event cards 16-20: no thumbnails, UI not run in a real browser, mod VOTE guidance note and non-mod openRound2 test skipped [[tasks/event-cards-16-20]]
- change-vote-result-phase-ui: reduced motion, narrow screens, long result text and a full e2e run not checked [[tasks/change-vote-result-phase-ui]]
- change-card-grid-2x2x3: N<12, widths below 900px, team legend and e2e after the card enlargement not checked; nothing committed [[tasks/change-card-grid-2x2x3]]
- Out-of-scope bugs (see .team/refactor-structure/refactor-plan.md section 1): server.js startsWith guard, unguarded decodeURIComponent, biased seat shuffle, rooms never deleted, docs design.md stale paths after refactor.
## Tasks
- change-e2e-voice-clip: done (merged to main 238e1fb, not pushed): Playwright voice e2e with clip, Thai speech + pilot tone per seat, 46/46 [[tasks/change-e2e-voice-clip]]
- change-data-oracle-correlation: done (branch accepted, not merged or pushed): Data Oracle → Data Correlation, Rune UX / Mystery Intern card text [[tasks/change-data-oracle-correlation]]
- voice-over: done (branch accepted, not merged or pushed): WebRTC mesh voice, Mod3D hears, server-gated mute for Silence/Burnout/voted-out; manual browser steps M1-M4 still owed [[tasks/voice-over]]
- change-chat-quick-replies: done (branch accepted, not merged or pushed): send button, Enter-clear fix, 23 quick replies [[tasks/change-chat-quick-replies]]
- change-lobby-ui: done (branch accepted, not merged or pushed) [[tasks/change-lobby-ui]]
- event-cards-16-20: done (branch accepted, not merged or pushed) [[tasks/event-cards-16-20]]
- change-refactor-structure: done (merged to main locally, not pushed)
- change-vote-result-phase-ui: done (committed 5100bad on main, not pushed; documents written afterwards) [[tasks/change-vote-result-phase-ui]]
- change-card-grid-2x2x3: in progress (implemented in the working tree of main, not committed; documents written afterwards) [[tasks/change-card-grid-2x2x3]]
- voice-over open issues: M1-M4 manual browser run not done; S-8 ICE gap on simultaneous two-way talk [[tasks/voice-over]]
