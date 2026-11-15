# researcher: event-cards-16-20
Date: 2026-11-15. Level L0 (codebase only, no external sources).

Done: read checkpoint, baseline, engine events/vote/phases/chat/game/night-resolve/views/mod-view, data.js EVENTS, server handlers, public client hooks, tests.

Main findings:
- #20 needs deferred publish: night report is published in resolveNight before drawEvent.
- #19 needs interim phase; bots/balance/simulate call closeVote once.
- Deck 20 = 4 draws/game; golden coverage needs GOLDEN_SEEDS raise.
- #17 zero label in index.html reads "PIP Curse".

Decisions (recommended): VOTE_INTERIM phase; deferred publish; #18 before checkEnd.
Assumptions: #16 code points; #18 group-of-3 truth, alive after ejection.

Files: .team/event-cards-16-20/brief.md, brief/hooks.md, brief/risks-docs.md.
Open: confirm untracked state of ideas doc/jpgs (git log shows 129f3b7 has them).
Cost: tool calls ~20.
