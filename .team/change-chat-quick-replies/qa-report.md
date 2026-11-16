# QA report: change-chat-quick-replies (round 3)

Verdict: **Pass**. Round 3 re-ran `npm test` on the reviewed branch. Chain exit 0. B-2 closed by re-recorded http-parity (commit 3889601). No open bugs.
Level: L3. Env: cwd `app`, `NODE_PATH=E:/projects/deadline-necromancer/app/node_modules`. Worktree `.worktrees/feature-change-chat-quick-replies`, branch `feature/change-chat-quick-replies`, HEAD 3889601.
Scope of round 3: `npm test` only. Browser e2e (`test/qa/qa-chatbar-browser.js`, 28/28 in round 2) not re-run; app code unchanged since round 2 (only `app/test/http-parity.json` changed in 3889601). No test files edited, no app files committed.

## AC id -> test name

| AC | Test | Round 3 result |
|---|---|---|
| AC-1..AC-14 (UI) | `app/test/qa/qa-chatbar-browser.js` | 28/28 in round 2 (not re-run, app code unchanged) |
| AC-7..AC-12 (engine) | `app/test/quick-replies.js` | pass, "quick-replies: all passed" |
| Purge messages / feed format (regression, no AC row) | `app/test/events.js` | pass |
| Served assets for changed files | `app/test/http-parity.js` | pass, "HTTP PARITY OK (21 urls)" |
| Golden regression | `app/test/golden/run.js` | pass, 315 games, 58095 steps, coverage 83/83 |
| Other chain tests | mod-actions, simulate, fx, no-repeat-cards, security, new-roles, monday | pass (chain exit 0) |

## Results

`npm test` (cwd `app`, `NODE_PATH` set): **exit 0**. Output: `C:/Users/User/AppData/Local/Temp/claude/79cd8055af606c71/d1697c22-9084-45bf-87b3-e6224cb7c56d/scratchpad/r3-npmtest.out`.
- golden: OK (315 games, 58095 steps, coverage 83/83)
- http-parity: OK (21 urls)
- mod-actions, simulate, events, fx, no-repeat-cards, security, new-roles, monday: exit 0
- quick-replies: all passed

Cleanup: no processes started by QA remain.

## Closed bugs

### B-1 CLOSED (round 2)
Lost `p:chat` ack left `chatBusy` stuck. Fixed by ed808a4 (5s ack timeout, `chatBusy` reset on connect/disconnect). Verified in round 2 by `S-1 probe` PASS in `qa-chatbar-browser.js` (28/28).

### B-2 CLOSED (round 3)
`test/http-parity.js` failed on `/`, `/?room=ABCD`, `/index.html` after ed808a4 changed `app/public/index.html` (stale manifest). Closed by re-recording the parity manifest on the known-good baseline in 3889601. Round 3 `npm test` http-parity step: OK (21 urls).

## Bugs
none

## Notes for the Orchestrator
- Feature worktree has an uncommitted modification to `.team/change-chat-quick-replies/spawns.tsv` from another agent. Not touched or committed by QA.
- Not verified: real touch device, iOS Safari, landscape (unchanged from round 1).

## Round history
- Round 1: Fail, 34/35 (7/7 engine, 27/28 browser). Only failure: S-1 probe = B-1.
- Round 2: Fail, 35/36. B-1 closed; B-2 open (http-parity stale).
- Round 3: Pass. `npm test` exit 0; B-2 closed.
