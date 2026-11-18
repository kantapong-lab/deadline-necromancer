# QA report: change-data-oracle-correlation (round 1)
Verdict: Pass. Bugs: none. Level L3. Branch qa/change-data-oracle-correlation (commit adds `app/test/qa/qa-data-correlation.js`).

## Runs
- `node test/qa/qa-data-correlation.js` (real server + socket.io clients, 3 runs): 10/10 pass each run.
- `npm test` on the branch: exit 0 (golden, http-parity, mod-actions, simulate, events, fx, data-correlation T1-T12, no-repeat-cards, security, new-roles, monday, quick-replies, voice).
- Not a regression: `node test/qa/qa-cards.js` (event cards #16/#19/#20) has 3 failures from a stale harness (`closeVote` called when day-1 `toVote` already lands in VOTE_RESULT). Same step I fixed in my own test. Not touched by this feature; not in `npm test`. Suggest low-priority fix in a later task.

## AC coverage
| AC | Check | Result |
|---|---|---|
| AC-1 | socket: view spec `{Data Correlation, t:2, pool:others}`; 0/1/3/dup/self rejected, 2 ok on night 1; same pair next night gets REPEAT_MSG, fresh pair ok; candidates exclude self; card text exact via HTTP `/data.js`; no `KPI Forecast` in data.js, card-info.js, index.html, mod3d.html, director.js | pass |
| AC-2 | socket morning log in `me.intel` equals true same/different line, no team name, no old work/bug/KPI text; engine matrix light/dark/indie 6 pairs | pass |
| AC-3 | Alibi dark vs light = same, vs dark = different, triggered; light Alibi inert | pass |
| AC-4 | Honeypot flips, both-trapped flips once with exactly one trap triggered; `honeypot.d` has Data Oracle | pass |
| AC-5 | fixNotes entry with true result when altered; none when unchanged | pass |
| AC-6 | blackout: only outage line, no fx | pass |
| AC-7 | socket: full 3D mod socket gets `{targets:[a,b], result:{same}, caster}` no real/bugs; plain mod (secrets off) gets none; secrets-on mod gets it; engine redactFx drops it; `director.js` data_oracle consumer reads `targets`/`result.same` (code read, no browser) | pass |
| AC-8 | `rune_ux.d` mentions Scope Creep and Hot Desking; Rune UX lists oracle caster | pass |
| AC-9 | `mystery_intern.d` has no `ถัดไปทางขวา`, mentions random | pass |
| Unchanged | full npm test incl. golden (83/83 gate) and fx; Bug Bounties line intact; <2 targets after swap: silent, no throw | pass |

## Not covered
- 3D animation visual (no browser run; manual check left to Human gate).
- Known accepted deviation from review-1: V-1 random-call count differs on 3/315 seeds (silent <2-target branch).
- Review S-1..S-4 (stale comment, test nits, docs still say KPI Forecast) remain; docs lane, non-blocking.

## Bugs
None.
