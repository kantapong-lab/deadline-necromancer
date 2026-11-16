# QA report: change-chat-quick-replies (round 2)

Verdict: **Fail** (hand-off rule: every bug is a blocker `B-n`). **B-1 closed** (lost-ack fix verified). **B-2 open**: `npm test` chain stops at `test/http-parity.js` because the parity expectation is stale after the B-1 fix changed `app/public/index.html`. No product AC breaks.
Level: L3, touched paths only. Branch `qa/change-chat-quick-replies` @ 108f2c9 (= `feature/change-chat-quick-replies` HEAD; includes fix ed808a4). QA worktree `.worktrees/qa-change-chat-quick-replies`, clean, no new commits this round.
Env: `NODE_PATH=E:/projects/deadline-necromancer/app/node_modules`; Node 24, Chrome headless over raw CDP (`TEST_PORT=3179`, `CDP_PORT=9334`).
Scope of round 2: re-run existing tests only, no new tests, no edits to test files.

## Round 1 -> round 2 delta
- B-1 (P2, FE, chatBusy stuck after lost `p:chat` ack): fix ed808a4 adds 5s ack timeout (`Promise.race` in `index.html`) and resets `chatBusy` on `connect`/`disconnect` (`index.html:35,37,98-121`). Browser probe `S-1 probe` now PASS (`chatBusy` false after reconnect, input kept as "lost ack").
- Fix commit changed `index.html`; http-parity expectation not re-recorded (see B-2).

## AC id -> test (round 2 status)

| AC | Test (existing or new harness) | Round 2 result |
|---|---|---|
| AC-1..AC-14 (UI) | `app/test/qa/qa-chatbar-browser.js` (QA harness from round 1, unchanged this round) | pass, 28/28 |
| AC-7..AC-12 (engine) | `app/test/quick-replies.js` (existing, BE) | pass, all passed |
| Purge messages / feed format (regression, no AC row) | `app/test/events.js` (existing) | pass, exit 0 |
| Served assets for changed files | `app/test/http-parity.js` (existing) | **FAIL** (B-2) |
| Other chain tests | golden, mod-actions, simulate, fx, no-repeat-cards, security, new-roles, monday | pass (run individually, see below) |

Coverage gap note: none new. Harness coverage of AC-1..AC-14 is as in round 1 (see round 1 history below).

## Results

Full chain `npm test` (cwd `app`, `NODE_PATH` set) exit **1**. Output: `C:/Users/User/AppData/Local/Temp/claude/79cd8055af606c71/d1697c22-9084-45bf-87b3-e6224cb7c56d/scratchpad/r2-npmtest.out`.
- `golden`: OK (315 games, 58095 steps, coverage 83/83)
- `http-parity`: **FAILED: 3** (`/`, `/?room=ABCD`, `/index.html` sha256 changed; chain stopped here, so later steps did not run in the chain)

Remaining chain steps run individually after the failure (same env, same worktree), each exit 0:

| Command | Exit | Result | Output |
|---|---|---|---|
| `node test/mod-actions.js` | 0 | MOD ACTIONS OK (71 steps) | scratchpad/r2-mod-actions.out |
| `node test/simulate.js` | 0 | winners printed, no failure | scratchpad/r2-simulate.out |
| `node test/events.js` | 0 | ok lines, no failure | scratchpad/r2-events.out |
| `node test/fx.js` | 0 | fx OK | scratchpad/r2-fx.out |
| `node test/no-repeat-cards.js` | 0 | no-repeat-cards OK | scratchpad/r2-no-repeat-cards.out |
| `node test/security.js` | 0 | security OK | scratchpad/r2-security.out |
| `node test/new-roles.js` | 0 | new-roles OK | scratchpad/r2-new-roles.out |
| `node test/monday.js` | 0 | monday: ok | scratchpad/r2-monday.out |
| `node test/quick-replies.js` | 0 | quick-replies: all passed | scratchpad/r2-quick-replies.out |
| `node test/http-parity.js` | 1 | HTTP PARITY FAILED: 3 | scratchpad/r2-npmtest.out |
| `node test/qa/qa-chatbar-browser.js` (TEST_PORT 3179, CDP_PORT 9334) | 0 | **28/28 passed** (S-1 probe PASS) | scratchpad/r2-browser.out |

Totals from real output: browser 28/28. Chain: 10 of 11 steps pass; 1 fails (http-parity). Engine counts: quick-replies "all passed" (7/7 per round 1 count; not re-counted from output this round).

Cleanup: no listeners on 3179/9334 after run; no headless Chrome left. Nothing started by QA still running.

## Bugs

### B-1 CLOSED (round 2)
Lost `p:chat` ack leaves `chatBusy` stuck. Verified fixed by ed808a4: `S-1 probe` PASS in `qa-chatbar-browser.js` (28/28). Status: closed.

### B-2 (P3, owner QA with Orchestrator approval; blocker by the hand-off rule)
`test/http-parity.js` fails on `/`, `/?room=ABCD`, `/index.html`: recorded sha256 `217ef4dc...` vs served `938b2d40...` (status, type and cache unchanged). Cause: fix ed808a4 changed `app/public/index.html` (intended, B-1 fix) after the parity manifest was re-recorded in 3b4c95a. This is a stale fixture, not a product regression.
- AC: none. Parity is a regression guard for served assets.
- Repro: `cd app && NODE_PATH=... node test/http-parity.js` -> `HTTP PARITY FAILED: 3`.
- Expected: manifest matches served assets for the reviewed branch.
- Actual: 3 DIFF lines, `npm test` chain stops at this step.
- Fix: review the `index.html` diff, then `node test/http-parity.js --record` on this known-good baseline (script's own warning: record only on a known-good baseline) and commit `app/test/http-parity.json` with the QA trailer. Not done in round 2 because the task was re-run only and re-recording is a fixture change needing Orchestrator approval.

## Notes for the Orchestrator
- Round 2 did not run new tests and did not edit any test file.
- Full suite was run because the round 2 prompt asked for `npm test`; the chain stopped at http-parity, so the rest was run individually.
- Not verified: real touch device, iOS Safari, landscape (unchanged from round 1).
- Feature worktree has uncommitted files from other agents (`spawns.tsv`, `handoff/6-code-reviewer-r2.json`, `review-2.md`); not touched by QA.

## Round 1 history (summary)
Round 1: Fail, 34/35 (7/7 engine, 27/28 browser); only failure was S-1 probe = B-1. Full report of round 1 was replaced in this round.

## Full regression
Not requested beyond the round 2 prompt. No further recommendation.

## Out of scope / quality notes
No Docker or deploy.md in this repo; app run in-process with node.

## Round 2 follow-up (Orchestrator)
- B-2 closed: `node test/http-parity.js --record` re-run on feature after ed808a4; only `/`, `/?room=ABCD`, `/index.html` changed (index.html B-1 fix). Full `npm test` exit 0 (quick-replies 7/7).
