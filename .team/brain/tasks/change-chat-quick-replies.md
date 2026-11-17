---
project: deadline-necromancer
task: change-chat-quick-replies
date: 2026-11-16
status: done
---
Player morning chat (app/public/index.html chatBar/sendChat): Enter now clears the input (render() no longer restores #chatIn from the DOM), a ส่ง send button, and a collapsible "💬 ข้อความด่วน (23)" panel of social-needling quick replies (list in app/src/shared/data.js QUICK_REPLIES, user-approved at gate 2b). Rules: a quick reply is a plain p:chat {text} (no engine change, user choice at 3c), so it counts 1 message under Meeting Purge, is disabled under NDA Silence / quota 0, and all 23 are <= 29 chars. B-1 fix: 5s p:chat ack timeout + chatBusy reset on connect/disconnect.
Lane: change (ui+logic), base feat/status-page-down-hide-mana. Branch feature/change-chat-quick-replies accepted at the Human gate 2026-11-16, last commit after docs f06c453 (plus closing commit); not merged, not pushed.
Links: [[agents/researcher/change-chat-quick-replies]] [[agents/product-manager/change-chat-quick-replies]] [[agents/designer/change-chat-quick-replies]] [[agents/architect/change-chat-quick-replies]] [[agents/qa-tester/change-chat-quick-replies]] [[agents/docs-writer/change-chat-quick-replies]]
Mockup: local only, .team/change-chat-quick-replies/canvas/chatbar-mockup.html (artifact publish denied by permissions; gate recorded with the local poc-server URL).
## Lessons
- Thai phrase lengths: count with Array.from (combining marks count); my own "<=21" estimate was wrong (max 29). Always compute.
- Users iterated the phrase list twice at gate 2b ("ปั่นๆ แนว Among Us"); drafting candidate lists in the gate question converged faster than another PM round.
- Gate 3c needs an http(s) canvas URL; when artifact publish is denied, serve the mockup from the existing `poc` static server.
- http-parity.json must be re-recorded after every merge that changes a served file (twice here: after FE+BE merge and after the B-1 fix).
- checkpoint.mjs spawn treats tok as cumulative per role, so a fresh second spawn with fewer tokens is rejected; log it as n/a and keep the real count in ## Usage.
- Worktrees have no node_modules: run tests with NODE_PATH=E:/projects/deadline-necromancer/app/node_modules.
- docs-writer cannot git commit (hook); the Orchestrator commits its files.
- Removing a worktree whose app/node_modules is a junction to the main checkout emptied the main app/node_modules (restored with npm ci). Never junction node_modules into a worktree (use NODE_PATH), or delete the junction before removing the worktree.
- Tally: qa-tester · haiku · re-run only: 2/2 completed (r2 surfaced the stale parity fixture, r3 pass).
## Open issues
- Review suggestions not done (S-2 and S-6 done in follow-up commit): S-4 reset panel each morning; S-5 stale in-flight timeout can flash an error after reconnect; late ack after timeout can lead to a duplicate post on retry.
- Not verified: real touch device, iOS Safari, landscape.
- simulate test flaked once in FE round 1 (passed on rerun); not investigated.
- Main checkout has uncommitted edits to docs/deadline_necromancer_player_rules.md; this branch also edits that file (merge may conflict).
## Usage
- researcher · sonnet · 31.8k
- product-manager · sonnet · 23.4k + 22.5k (r2)
- designer · sonnet · 43.1k
- architect · sonnet · 95.7k
- backend-dev · sonnet · 34.0k
- frontend-dev · sonnet · 75.7k + 23.8k (r2)
- code-reviewer · sonnet · 61.8k + 26.7k (r2)
- qa-tester · sonnet · 106.7k (r1); haiku · 43.6k (r2) + 23.3k (r3)
- docs-writer · sonnet · 36.3k
- Orchestrator · not read (/context not available in this session)
- Total agents: about 672.4k tokens
