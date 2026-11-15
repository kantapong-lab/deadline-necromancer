# Stack and options (event-cards-16-20)

Platform: web. Runtime pin: none, unchanged (devops found no `.nvmrc`, `engines`, Dockerfile or CI; host Node v24 observed only).
No stack change: Node (CommonJS) + Socket.IO ^4.7.5, plain HTML/JS client, in-memory rooms. ADR 0001 stands. No new dependency, datastore or provider.

## Build vs buy
| Capability | Choice | Reason |
|---|---|---|
| 5 cards, phase, chat limit, report gate | build (reuse engine mixins) | pure game rules; no provider fits |
| Thai strings / images | reuse `EVENTS` in `app/src/shared/data.js`, art in `docs/event_cards` | already served by `/docs/*` |
| Thumbs for #16-#20 | optional, FE, `app/tools/make_thumbs.py` | `common.js:54` already falls back to the full image |

## Options considered (hard-to-reverse: phase machine, report publication)
- #19 interim. A (picked): new phase `VOTE_INTERIM`, round 2 reuses `VOTE`. Locks in one more phase name for client and mod. B: reuse `VOTE_RESULT` + flag; blocks the `toNight` guard (`phases.js:19`). C: stay in `VOTE`, no pause; no place for the public chat step the owner asked for.
- #20 gating. A (picked, = ADR 0002): `resolveNight` stashes classified lines, `closeNight` publishes after `drawEvent`. B: peek `deck[deck.length-1]` before `resolveNight` and publish at the old point; couples `closeNight` to deck internals and must special-case the game-over and day-5 returns. C: retract feed lines after `drawEvent`; fragile, rejected by the ADR.
- #19 close routing. A (picked): `closeVote()` branches inside the engine, so `mod:do closeVote` and every driver keep one call; a new `openRound2` action opens round 2. B: a new `closeRound1` action; every driver and the mod UI need a second button for the same intent.

## Why no new ADR
ADR 0002 (Kind: product, Proposed) already fixes the #19 phase, the #20 stash and #17/#18 placement. The choices here refine it (deck-state placement, publish mechanics) and change no scope or AC; the decisions are in the hand-off `decisions` and `contract/engine.md`.
