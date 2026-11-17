# Project: deadline-necromancer
Node + Socket.IO multiplayer game (app/), docs/ rules + card images.
## Lessons
- 2026-11-15: gate guard needs `Task:` alone on the first prompt line; onboard architect is blocked while other checkpoints exist; 44 ACs need ac.md as a table with inline links; text-only design needs a published spec page plus AC->artboard rows [[tasks/event-cards-16-20]]
- 2026-11-15: land engine changes in two stages (refactor on the old golden snapshot, then cards) [[tasks/event-cards-16-20]]
- 2026-11-16: re-record app/test/http-parity.json after every merge that changes a served file; worktrees need NODE_PATH to the main app/node_modules; when artifact publish is denied, serve the mockup from the poc server for gate 3c [[tasks/change-chat-quick-replies]]
## Open issues
- change-chat-quick-replies: review suggestions S-4/S-5 open; not tested on real touch/iOS; simulate flaked once [[tasks/change-chat-quick-replies]]
- change-lobby-ui: lobbySeen not pruned (http-parity re-recorded on change-chat-quick-replies branch) [[tasks/change-lobby-ui]]
- event cards 16-20: no thumbnails, UI not run in a real browser, mod VOTE guidance note and non-mod openRound2 test skipped [[tasks/event-cards-16-20]]
- Out-of-scope bugs (see .team/refactor-structure/refactor-plan.md section 1): server.js startsWith guard, unguarded decodeURIComponent, biased seat shuffle, rooms never deleted, docs design.md stale paths after refactor.
## Tasks
- change-chat-quick-replies: done (branch accepted, not merged or pushed): send button, Enter-clear fix, 23 quick replies [[tasks/change-chat-quick-replies]]
- change-lobby-ui: done (branch accepted, not merged or pushed) [[tasks/change-lobby-ui]]
- event-cards-16-20: done (branch accepted, not merged or pushed) [[tasks/event-cards-16-20]]
- change-refactor-structure: done (merged to main locally, not pushed)
