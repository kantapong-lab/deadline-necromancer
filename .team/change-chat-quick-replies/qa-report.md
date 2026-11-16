# QA report: change-chat-quick-replies (round 3)

Verdict: **Pass**. Round 3 re-ran `npm test` on the reviewed branch. Chain exit 0. B-2 closed by re-recorded http-parity (commit 3889601). No open bugs.
Level: L3. Env: cwd `app`, `NODE_PATH=E:/projects/deadline-necromancer/app/node_modules`. Worktree `.worktrees/feature-change-chat-quick-replies`, branch `feature/change-chat-quick-replies`, HEAD 3889601.
Scope of round 3: `npm test` only. Browser e2e (`test/qa/qa-chatbar-browser.js`, 28/28 in round 2) not re-run; app code unchanged since round 2 (only `app/test/http-parity.json` changed in 3889601). No test files edited, no app files committed.

## AC id -> test name

| AC | Test | Round 3 result |
|---|---|---|
| AC-1 | `AC-1 Enter sends: feed shows text, #chatIn empty, chatDraft empty`; `AC-1 state push mid-send does not restore the old value` (bot `p:chat` races the Enter so a `state` push arrives before the ack; then more pushes); `AC-1 text typed while the send is in flight is kept` | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-2 | `AC-2 Purge 31 chars + Enter: text kept, #chatErr shows over-30, no quota used, then 30 sends`; `AC-2 quota 0 (client knows)...`; `AC-2 server rejects (client stale: quota gone server-side): text kept, error in #chatErr`; `AC-2 server rejects typed text under Silence (client stale)...` | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-3 | `AC-3 click ส่ง = Enter: same feed + empty input; same over-30 error + text kept` (real mouse click; `#chatSend` is `type=submit` in the `#chatIn` form) | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-4 | `AC-4 Silence: #chatIn and #chatSend disabled`; `AC-4 quota 0: ...disabled`; `AC-4 empty input: click ส่ง posts nothing, no crash; whitespace only also nothing` | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-5 | `AC-5 MORNING alive: 23 pills in table order, exact text` (deep-equal to `QUICK_REPLIES`, closed by default, aria-expanded); `AC-5 VOTE_INTERIM alive: bar + pills shown`; `AC-5 dead player in MORNING: no bar, no pills`; `UNCHANGED chat hidden in VOTE_RESULT and NIGHT`; `UNCHANGED chat hidden in VOTE` | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-6 | `AC-6 draft "abc", tap pill: phrase once in feed, #chatIn and draft still "abc"`; `AC-6 feed entry text equals the phrase exactly (server-side), who = browser seat`; `AC-6 rapid double tap posts once (chatBusy guard)`; `AC-6 pill tap without any draft ...every pill (all 23) posts its exact phrase` | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-7 | engine: `purge: phrase counts 1`, `no purge: unlimited, uncounted`; UI: `AC-7 UI: Purge pill tap uses 1 quota, chip 3->2; typed text unlimited without Purge` | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-8 | engine: `purge quota 0: phrase rejected, emoji ok`; UI: `AC-8 quota 0: all pills disabled + note, emoji still post, forced quick() shows quota error` | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-9 | engine: `silence: phrase rejected, emoji ok` (all 23 phrases); UI: `AC-9 Silence: all pills disabled + note, emoji post, no quota used; forced quick() rejected` | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-10 | unit: `list: 23 unique phrases, all valid` (each `<= PURGE_LEN`); UI: `AC-10 Purge + injected 31-cp phrase: only it is disabled (no note), 23 originals enabled` (also: no Purge -> enabled) | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-11 | `altered phrase takes the typed path` (no Purge accepted; Purge 31 cp rejected, no quota; padded phrase trimmed; silenced + altered rejected) | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-12 | `skip phrase is chat only` (MORNING and VOTE_INTERIM: votes, mana, skipStreak, voteResult unchanged) | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-13 | `AC-13 375px: no horizontal scroll, input+ส่ง same row, emoji below, panel vertical scroll, input does not move, scroll kept after tap` (CDP `Emulation.setDeviceMetricsOverride` 375x812 mobile; real mouse tap in a scrolled panel; pills and send >= 44px tall) | pass (r2 browser 28/28 or engine; r3 npm test green) |
| AC-14 | code review: `grep` for `ซัสสส ชัดเจน` in `app/` hits only `src/shared/data.js` (the one `QUICK_REPLIES` literal) and `test/quick-replies.js` (imports it); `public/index.html` loads `/data.js` and `qrList()` reads the global, no local copy. `list:` test imports the same const. Server does not validate against the list at all (contract D-2/D-3: typed path), so there is no second copy to drift. | pass (r2 browser 28/28 or engine; r3 npm test green) |
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
