# Plan: event-cards-16-20
Goal: 5 new Daily Rule cards (deck 15 -> 20), more variety per game. Success metric: [assumed] `npm test` green, golden re-recorded, docs consistent, balance reported honestly.
Order: simple cards first, structural cards (#19, #20) after, then golden/docs.

## Phase 1: Data + simple cards (#16, #17, #18)
value high / cost low / risk low
- P0 EVENTS n:16-20 in data.js [AC-36]
- P0 #16 chat limit + view + client counter [AC-1..8]
- P0 #17 extra team in drawEvent [AC-9..13]
- P0 #18 announcement in closeVote before checkEnd [AC-14..19]
- P0 tests per card in events.js [AC-38 part]
Exit: tests for #16-#18 pass.

## Phase 2: Structural cards (#19, #20)
value high / cost high / risk medium (phase machine, night-report ordering)
- P0 #19 VOTE_INTERIM phase, round 2 reuse VOTE, mod button, views, no voter names [AC-20..28] (ADR 0002)
- P0 #20 report stash, classification, publish after drawEvent, intel to one player [AC-29..35] (ADR 0002)
- P0 tests for #19, #20 [AC-38]
Depends on: Phase 1 (data.js entries).
Exit: tests pass; non-event days unchanged [AC-28, AC-34].

## Phase 3: Golden-master
value high / cost low / risk medium (random order)
- P0 re-record snapshot.json and mod-actions.json, raise GOLDEN_SEEDS, add coverage keys [AC-37]
- P0 full `npm test` green [AC-38]
Depends on: Phases 1-2.

## Phase 4: Balance, docs, gallery
value medium / cost low / risk low; none blocks P0 work
- P1 balance before/after, honest caveat [AC-39]
- P1 docs update (event_cards, player_rules, design, daily_rule_ideas, README) [AC-40, AC-41]
- P1 card-info.js + gallery [AC-42]
- P1 commit ideas doc + 5 jpgs [AC-43]
- P2 Thai tone review [AC-44]
Deferred: bot AI modelling new info effects (reason: out of scope, balance bots ignore them).

## Decisions
- ADR 0002 #19 uses new VOTE_INTERIM phase (rejected: VOTE_RESULT flag, blocks toNight guard).
- ADR 0002 #20 stash report in resolveNight, publish in closeNight (rejected: retracting feed lines, fragile).
- #17 uses p.zero; #18 before checkEnd.
- [assumed] #16 counts code points.
