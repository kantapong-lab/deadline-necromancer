# QA report: change-chat-quick-replies (round 1)

Verdict: **Fail** on the hand-off rule (every bug is a blocker `B-n`): all AC-1..AC-14 pass, but 1 bug is open, **B-1** (review S-1, reproduced), severity **P2**, owner FE. Orchestrator decision: fix now (small, FE) or downgrade to backlog and ship; no AC breaks under its stated conditions.
Level: L3, touched paths only. Branch `qa/change-chat-quick-replies` @ 3b4c95a (+ QA test commits 80bc073, 4827778). Worktree `.worktrees/qa-change-chat-quick-replies`.
Env: `NODE_PATH=E:/projects/deadline-necromancer/app/node_modules` (worktree has no node_modules); Node 24.21, Chrome 157 headless driven over raw CDP (no puppeteer in the repo; harness uses Node's global WebSocket).

## Coverage first
Test files the diff added/changed: `app/test/quick-replies.js` (BE, registered last in `npm test` chain, confirmed in the worktree `app/package.json`), `app/test/http-parity.json` (re-recorded). FE added no test file (design D-8: no UI harness). UI ACs had no covering test, so the gap is closed with one new browser e2e file: `app/test/qa/qa-chatbar-browser.js` (new, QA). Engine ACs are covered by BE tests and are cited, not rewritten.

## AC id -> test name

| AC | Test name | existing / new | Path | Result |
|---|---|---|---|---|
| AC-1 | `AC-1 Enter sends: feed shows text, #chatIn empty, chatDraft empty`; `AC-1 state push mid-send does not restore the old value` (bot `p:chat` races the Enter so a `state` push arrives before the ack; then more pushes); `AC-1 text typed while the send is in flight is kept` | new (gap: no UI test existed; real typing via `Input.insertText` + Enter keyDown so `oninput` runs) | app/test/qa/qa-chatbar-browser.js | pass |
| AC-2 | `AC-2 Purge 31 chars + Enter: text kept, #chatErr shows over-30, no quota used, then 30 sends`; `AC-2 quota 0 (client knows)...`; `AC-2 server rejects (client stale: quota gone server-side): text kept, error in #chatErr`; `AC-2 server rejects typed text under Silence (client stale)...` | new (covers both the client-side early reject and the `r.ok === false` ack path) | same | pass |
| AC-3 | `AC-3 click ส่ง = Enter: same feed + empty input; same over-30 error + text kept` (real mouse click; `#chatSend` is `type=submit` in the `#chatIn` form) | new | same | pass |
| AC-4 | `AC-4 Silence: #chatIn and #chatSend disabled`; `AC-4 quota 0: ...disabled`; `AC-4 empty input: click ส่ง posts nothing, no crash; whitespace only also nothing` | new | same | pass |
| AC-5 | `AC-5 MORNING alive: 23 pills in table order, exact text` (deep-equal to `QUICK_REPLIES`, closed by default, aria-expanded); `AC-5 VOTE_INTERIM alive: bar + pills shown`; `AC-5 dead player in MORNING: no bar, no pills`; `UNCHANGED chat hidden in VOTE_RESULT and NIGHT`; `UNCHANGED chat hidden in VOTE` | new | same | pass |
| AC-6 | `AC-6 draft "abc", tap pill: phrase once in feed, #chatIn and draft still "abc"`; `AC-6 feed entry text equals the phrase exactly (server-side), who = browser seat`; `AC-6 rapid double tap posts once (chatBusy guard)`; `AC-6 pill tap without any draft ...every pill (all 23) posts its exact phrase` | new | same | pass |
| AC-7 | engine: `purge: phrase counts 1`, `no purge: unlimited, uncounted`; UI: `AC-7 UI: Purge pill tap uses 1 quota, chip 3->2; typed text unlimited without Purge` | existing (BE) + new (chip/hint UI) | app/test/quick-replies.js; app/test/qa/qa-chatbar-browser.js | pass |
| AC-8 | engine: `purge quota 0: phrase rejected, emoji ok`; UI: `AC-8 quota 0: all pills disabled + note, emoji still post, forced quick() shows quota error` | existing + new | both | pass |
| AC-9 | engine: `silence: phrase rejected, emoji ok` (all 23 phrases); UI: `AC-9 Silence: all pills disabled + note, emoji post, no quota used; forced quick() rejected` | existing + new | both | pass |
| AC-10 | unit: `list: 23 unique phrases, all valid` (each `<= PURGE_LEN`); UI: `AC-10 Purge + injected 31-cp phrase: only it is disabled (no note), 23 originals enabled` (also: no Purge -> enabled) | existing + new | both | pass |
| AC-11 | `altered phrase takes the typed path` (no Purge accepted; Purge 31 cp rejected, no quota; padded phrase trimmed; silenced + altered rejected) | existing (BE) | app/test/quick-replies.js | pass |
| AC-12 | `skip phrase is chat only` (MORNING and VOTE_INTERIM: votes, mana, skipStreak, voteResult unchanged) | existing (BE) | app/test/quick-replies.js | pass |
| AC-13 | `AC-13 375px: no horizontal scroll, input+ส่ง same row, emoji below, panel vertical scroll, input does not move, scroll kept after tap` (CDP `Emulation.setDeviceMetricsOverride` 375x812 mobile; real mouse tap in a scrolled panel; pills and send >= 44px tall) | new (automated emulation; real-device touch not run) | app/test/qa/qa-chatbar-browser.js | pass |
| AC-14 | code review: `grep` for `ซัสสส ชัดเจน` in `app/` hits only `src/shared/data.js` (the one `QUICK_REPLIES` literal) and `test/quick-replies.js` (imports it); `public/index.html` loads `/data.js` and `qrList()` reads the global, no local copy. `list:` test imports the same const. Server does not validate against the list at all (contract D-2/D-3: typed path), so there is no second copy to drift. | review | app/src/shared/data.js, app/public/index.html:12,88 | pass |

## Unchanged

| Row | Test | Result |
|---|---|---|
| Emoji buttons (5), allowed under Silence, exempt from Purge quota, do not touch draft/input | `UNCHANGED emoji: click posts only the emoji; draft + input kept; works under Purge exempt from quota`; emoji posts inside AC-8 (quota 0) and AC-9 (Silence) tests | pass |
| Dark night chat `#darkIn` | `UNCHANGED dark night chat #darkIn still sends for a dark seat in NIGHT` (real Enter, line lands in `G.darkChat`, no morning bar at night) | pass |
| Chat only in MORNING / VOTE_INTERIM for alive players | AC-5 tests above (VOTE, VOTE_RESULT, NIGHT hidden via real phase flow; dead hidden; VOTE_INTERIM shown) | pass |
| Purge messages/chip text, 200-char slice, feed format, vote/Mana/Skip rules | `node test/events.js` (existing, Purge cases) and `node test/quick-replies.js` (`skip phrase is chat only`) | pass |
| Served assets for the changed files | `node test/http-parity.js` (re-recorded manifest) | pass |

## Results

| Command (cwd `.worktrees/qa-change-chat-quick-replies/app`, `NODE_PATH` set) | Exit | Result | Output |
|---|---|---|---|
| `node test/quick-replies.js` | 0 | 7/7 ok, "quick-replies: all passed" | C:/Users/User/AppData/Local/Temp/claude/79cd8055af606c71/d1697c22-9084-45bf-87b3-e6224cb7c56d/scratchpad/quick-replies.out |
| `node test/events.js` | 0 | 22 ok lines, "all 20 event cards tested" | C:/Users/User/AppData/Local/Temp/claude/79cd8055af606c71/d1697c22-9084-45bf-87b3-e6224cb7c56d/scratchpad/events.out |
| `node test/http-parity.js` | 0 | "HTTP PARITY OK (21 urls)" | C:/Users/User/AppData/Local/Temp/claude/79cd8055af606c71/d1697c22-9084-45bf-87b3-e6224cb7c56d/scratchpad/http-parity.out |
| `node test/qa/qa-chatbar-browser.js` (new), final run, repeated 3x with identical result | 1 | 27/28 passed; the 1 fail is the S-1 probe (B-1) | C:/Users/User/AppData/Local/Temp/claude/79cd8055af606c71/d1697c22-9084-45bf-87b3-e6224cb7c56d/scratchpad/browser.out (runs 1-3: browser1.out .. browser3.out, same dir) |

AC-13 measured at 375px (from the browser output): min pill height 44px, `#chatSend` 44px, `#chatIn` 44px, toggle 45px; the test now asserts the design's 44px touch target (it was 40 before; no design mismatch).
Flake note: in an earlier run the AC-1 test asserted the input right after the feed showed the text and saw the old value; the state push (feed) lands a tick before the p:chat ack, and the input clears on the ack. This was a test timing issue, not a product bug (the final input state is correct); the test now waits for `chatBusy === false`. Three consecutive full runs after the fix gave the same 27/28.

Totals come from the saved outputs above (browser: 27 PASS lines of 28 tests). Chrome and the in-process server were stopped (no listener on 3178/9333, no chrome with `--remote-debugging-port=9333`).

Not run (scope): bare `npm test` (whole-suite regression not approved). No `simulate.js` flake seen because it was not run.

## Bugs

### B-1 (P2, owner FE; blocker by the hand-off rule, Orchestrator may downgrade) review S-1 confirmed: lost `p:chat` ack leaves `chatBusy` stuck, typed send and every quick reply dead until reload
- AC: none states this; regresses AC-1/AC-3/AC-6 behaviour only in a transport-drop edge case. Old `sendChat` had no guard, so a lost ack hung only that one call.
- Repro (automated, test `S-1 probe` in app/test/qa/qa-chatbar-browser.js): server drops the socket on receiving `p:chat` (`socket.use` middleware calling `disconnect(true)`) while the client is mid-send. Client auto-reconnects and re-joins; then `chatBusy === true` and `#chatIn` still holds the typed text. Enter posts nothing, tapping a pill posts nothing (both return early on `chatBusy`), feed length unchanged. Emoji still work (`act()` path, no guard). Only a page reload clears it.
- Expected: after reconnect (or after a short timeout) the player can send again.
- Actual: chat input and quick replies silently dead.
- Likely cause: `emit()` in `public/common.js` has no timeout and no reset on `connect`/`disconnect`.
- Fix hint (reviewer's): reset `chatBusy=false` in `socket.on('connect')` / `'disconnect'`, or race the ack with ~5s timeout.
- Severity reasoning: no AC breaks under its stated conditions; needs a mid-flight network drop; recoverable by reload; but on mobile networks it is plausible. Non-blocker for ship, recommended fix before or soon after. The Orchestrator may promote it to a blocker. The test is left failing on purpose (it asserts the correct behaviour); it is not in the `npm test` chain.

Other review suggestions (S-2 focus after ส่ง, S-3 pill dropped in-flight, S-4 panel stays open across mornings) were not probed as bugs; none contradicts an AC.

## Notes for the Orchestrator
- UI ACs verified in headless Chrome 157 (desktop 1280x900 and 375x812 mobile emulation). Not verified: real touch device, iOS Safari, landscape.
- Negative control (AC-1 test failing on the pre-change client) was not run; the AC-1 race test is written to fail on the old restore-the-DOM-value behaviour (it reads `#chatIn.value` after a racing state push).
- Harness file is a QA test under `app/test/qa/`, not wired into `package.json` (outside QA write scope). Run: `NODE_PATH=<app node_modules> node test/qa/qa-chatbar-browser.js` (needs Chrome; env `CHROME`, `TEST_PORT`, `CDP_PORT`).

## Full regression
Recommendation only (not run, not approved): `cd app && npm test` (golden, http-parity, mod-actions, simulate, events, fx, no-repeat-cards, security, new-roles, monday, quick-replies; about 1 to 2 min). Reason: `index.html`, `style.css` and `data.js` changed for every player; the chat engine is untouched, so risk is low. Earlier one-off `simulate` flake noted by the Orchestrator may recur.

## Out of scope / quality notes
No Docker or deploy.md in this repo; the app was run in-process with node. QA commit trailer applied to commit 80bc073 in the qa worktree.
