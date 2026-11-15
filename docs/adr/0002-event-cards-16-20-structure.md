# 0002. Event cards #16-#20 structural choices

Status: Proposed
Kind: product
Date: 2026-11-15

## Context
Five Daily Rule cards are added. #19 needs a pause between two vote rounds; #20 must withhold the night report before it is published. Existing ADR 0001 (stack) is unaffected.

## Decision
- #19: new phase `VOTE_INTERIM` between rounds; round 2 reuses `VOTE`; final result from round 2 only.
- #20: resolveNight stashes the report; closeNight publishes after drawEvent; public gets Burnout names only; one on-call player gets the rest via `intel[pid]`, never named.
- #18 announced before checkEnd; #17 sets `p.zero` in drawEvent; #16 limits counted in code points [assumed].

## Consequences
- Phase table and mod UI gain one phase and one button; golden-master must be re-recorded.
- Non-card days must behave unchanged.

## Alternatives considered
- #19 reuse VOTE_RESULT with a flag: blocks the toNight guard (`phases.js:19`).
- #20 retract feed lines after drawEvent: fragile.
- #18 after checkEnd: game-ending vote would skip the announcement.
