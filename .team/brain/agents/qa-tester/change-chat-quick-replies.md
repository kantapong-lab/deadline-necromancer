# qa-tester: change-chat-quick-replies

## 2026-11-16 round 1 (L3, touched paths)
- Done: ran `quick-replies.js` (7/7), `events.js`, `http-parity.js` (21 urls) on branch qa/change-chat-quick-replies; wrote and ran a CDP browser e2e (no puppeteer in repo, Chrome 157 headless + Node global WebSocket): 27/28 pass.
- AC-1..14 all covered; AC-14 by grep review. All ACs pass; verdict Fail only because B-1 is open (hand-off rule: every bug is a blocker); P2, Orchestrator may downgrade.
- B-1 (review S-1, P2): lost `p:chat` ack leaves `chatBusy` true after reconnect; Enter and pills dead until reload; emoji still work. Owner FE. Fix: reset on connect/disconnect or ack timeout.
- Decisions: S-1 test left failing on purpose (asserts correct behaviour), kept out of the `npm test` chain. Did not run bare `npm test` (no `Full regression: approved`).
- Day 1 is Monday (no vote): `toVote` lands on VOTE_RESULT, so VOTE phase is reached on day 2 via closeNight.
- Files: app/test/qa/qa-chatbar-browser.js (commit 80bc073 in qa worktree), .team/change-chat-quick-replies/qa-report.md (feature worktree).
- Not verified: real touch device, iOS Safari, landscape; negative control of AC-1 on old client.
- Cost: about 25 tool calls, no token figure available.
- Open: B-1 fix; optionally wire the browser e2e into CI.

## Round 2 (2026-11-16)
- B-1 closed: ed808a4 (5s ack timeout + chatBusy reset on connect/disconnect) verified by browser S-1 probe, 28/28 browser e2e.
- Full `npm test` stops at http-parity: 3 DIFF (`/`, `/?room=ABCD`, `/index.html`) because ed808a4 changed index.html after the 3b4c95a re-record. Stale fixture, not a product regression. Fix: re-record on baseline with Orchestrator approval (B-2).
- All other chain steps exit 0 when run individually (quick-replies 7/7, events, golden, mod-actions, simulate, fx, no-repeat-cards, security, new-roles, monday).
- Cost: about 12 tool calls.
