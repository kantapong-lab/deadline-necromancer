# Golden-master, RNG order and test drivers (app/test/**, BE)

## Staging (this is the evidence for AC-19, AC-28, AC-34)
Golden cannot prove "unchanged" after the deck grows, so BE lands in two stages:
- Stage A, deck still 15 cards, no new `EVENTS`: the refactors that touch the inactive path: deferred `resolveNight`/`publishNight`, `tallyVotes`, the `chat` restructure, `openRound2`/`closeRound1` and view code, all new view fields omitted when inactive. Gate: `node test/golden/run.js` prints `GOLDEN OK` against the UNCHANGED `snapshot.json`, and `node test/events.js`, `http-parity.js` (before FE changes) and `mod-actions.js` stay green. Any diff means a behaviour change on a non-card day: fix the code, never re-record.
- Stage B: append the five `EVENTS`, the card hooks, the bot and driver changes, the five tests; then re-record. Order of re-records: `golden/run.js --record` (raise `GOLDEN_SEEDS` first), `mod-actions.js --record`, then, after the FE and docs branches are merged, `http-parity.js --record` (hashes cover `data.js`, `index.html`, `mod.html`, `gallery.html`, `card-info.js`, `common.js`, `/docs/deadline_necromancer_design.md`).

## Math.random call order (golden hash chain)
Unchanged: constructor roles, soul-recruiter target, `resolveNight`, hijack `rnd`, Exit Scam `rnd(lights)`, Production Crisis `rnd`. No RNG in views, `publishNight`, `tallyVotes`, `closeRound1`, `openRound2`, `chat`.
Changed or new, in call order:
1. Constructor deck: `shuffle(Object.keys(EVENTS))` makes 19 calls instead of 14, so every later draw of every seed shifts: the whole snapshot changes (unavoidable). Key order is `... bonus, purge, hands, uat, redesign, status`; do not reorder.
2. `drawEvent` after `pop`, one of: `hands` = one `shuffle(alive)` (alive-1 calls), after the `leak` branch; `status` = one `rnd(alive)`; `purge`, `redesign`, `uat` = none.
3. `closeVote` with `uat`: one `shuffle(alive)`, after the Exit Scam `rnd(lights)` and the ejection, before `checkEnd`.
`Date.now` order: golden fakes the clock per call, so the number and order of `Date.now` calls feed the `ts` in every view hash. `resolveNight` builds its feed entries at the same moment as today even when deferred (see `night-report.md`).

## Golden bot and coverage (`golden/bot.js`, `golden/run.js`)
- Add a `VOTE_INTERIM` branch to the phase loop: two or three `chat` calls, `toNight-bad` (must error), then `openRound2`. The `VOTE` branch then re-votes and closes. Without it a #19 game stalls until `guard` and exits silently with a truncated game.
- `required()` adds `interim` (phase seen), `extraTeam` (`G.event.extra` non-empty), `uatLine` (feed has `UAT Too Late`), `onCall` (an intel entry starts with `📟 สรุปเมื่อคืน`) next to the automatic `event:<key>` keys. `observe()` sets them from state.
- `run.js`: default `GOLDEN_SEEDS` rises from 20 to at least 40 (`npm test` does not set it); raise again until `COVERAGE GATE` passes; `run.js` refuses to record on a failed gate. `snapshot.json` stores the final seeds.

## Other drivers that loop on phase
- `simulate.js`: add `else if (ph === 'VOTE_INTERIM')` with one player chat then `md('openRound2')`; keep the role-leak check running.
- `balance.js`: after `G.closeVote()`, `if (G.phase === 'VOTE_INTERIM') { G.openRound2(); G.closeVote(); }` (bots carry round-1 votes; no RNG). Run `npm run balance -- 2000` on `main` before and on the branch after; report 6-12 light/dark rates; say the bots do not model #16/#18/#20 info effects and that #17/#19 change vote math; no rebalance claim.
- `mod-actions.js`: its scripted `closeNight` (line 133) draws the day-2 card from the seeded deck, so the recorded state changes with the 20-card deck (re-record). The script ends there and never votes again, so a #19 draw cannot stall it.
- `events.js`: add `purge`, `hands`, `uat`, `redesign`, `status` to `cases` (the harness at the end already fails on an `EVENTS` key without a case). Cover the edges named in `ac-map.md`.
