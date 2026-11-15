# Contract: event-cards-16-20 (index)

Five Daily Rule cards (#16-#20, deck 15 to 20) on the existing Node + Socket.IO game. Aligned with `docs/adr/0002-event-cards-16-20-structure.md`. FE owns `app/public/**`, BE owns `app/src/**` and `app/test/**`, docs by docs-writer.

## Stack
Platform: web. Stack: Node (CommonJS) + Socket.IO ^4.7.5, plain HTML/JS client, in-memory rooms; no stack change; runtime pin: none, unchanged. No new dependency, datastore or provider; all build or reuse. Options for the phase machine and report gate: [stack].

## Socket events and view fields
No new event names; new `mod:do` action `openRound2`, new phase `VOTE_INTERIM`, per-player chat quota `me.chatLeft`, `interim`, `event.extra`, moderator `statusReport`. Card Thai text proposals and FE rules: [events].

## Engine design per card
#16 chat limit, #17 extra team, #18 UAT announce, #19 `VOTE_INTERIM` transitions and round-1 close, #20 on-call pick: [engine].

## Night report (#20)
Stash in `resolveNight`, classify public vs status at build, publish after `drawEvent` in `closeNight`, deliver to one on-call via `intel`: [report].

## Golden-master, RNG order, test drivers
Two-stage landing (stage A proves non-card days unchanged), Math.random call order, bot and driver changes, re-record order, balance run: [golden].

## File ownership
FE `app/public/**`, `app/tools/**`; BE `app/src/**`, `app/test/**`, `app/package.json`; docs-writer and Orchestrator listed as prose: [owners].

## AC id to contract logic
Every AC-1 to AC-44 mapped with its test or evidence: [acmap].

## Diagrams
Trigger fired: game phase lifecycle gains `VOTE_INTERIM` (state, three or more states with transition rules). `diagrams_spec` in the hand-off: `docs/architecture/states/game-phase.html`. No flow or ERD (no datastore; the report ordering is in [report]).

[stack]: contract/stack.md
[events]: contract/events.md
[engine]: contract/engine.md
[report]: contract/night-report.md
[golden]: contract/golden.md
[owners]: contract/ownership.md
[acmap]: contract/ac-map.md
