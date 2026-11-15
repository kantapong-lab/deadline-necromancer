# Brief: event-cards-16-20 (L0, codebase only)

Summary: 5 Daily Rule cards (#16-#20). Per-card hook points with path:line in `brief/hooks.md`. Risks and docs in `brief/risks-docs.md`. Two cards are structural: #19 (two-round vote, new interim phase) and #20 (night report must be gated before publication).

## Context
- Engine = mixin on Game (`app/src/engine/game.js:85`). Phases: LOBBY, MORNING, VOTE, VOTE_RESULT, NIGHT, OVER (`app/public/common.js:5`).
- Event card = entry in `app/src/shared/data.js:30-46` (EVENTS). Drawn once per morning, days 2-5 only (`events.js:54`). Deck of 20 gives 4 draws per game.
- closeNight order (`phases.js:26-63`): resolveNight → day++ → zero/dbl shift → morning reset → hijack → drawEvent.
- Baseline drift: none in hook areas. baseline.md:68 listed night-resolve/vote/events/views as unreviewed; now read.
- Existing draws: `[verify]` thumbs for 16-20; card art 16-20 present per checkpoint.

## From the second brain
- [[Projects/deadline-necromancer/project]]: task `event-cards-16-20` in progress; open issues are out of scope (startsWith guard, decodeURIComponent, seat shuffle, rooms never deleted). No conflict with ADR (`docs/adr/0001-existing-stack.md`).

## Options
- #19 interim: (A, recommended) new phase `VOTE_INTERIM`, round 2 reuses `VOTE`; (B) reuse VOTE_RESULT with a flag (blocks toNight guard `phases.js:19` unless changed).
- #20 publication: (A, recommended) resolveNight stashes report, closeNight publishes after drawEvent; (B) drawEvent retracts feed lines (fragile).
- #18 placement: (A, recommended) before checkEnd (`vote.js:77`); (B) after, game-ending vote skips announcement.
- #17 zero: set `p.zero` in drawEvent (recommended, reset by existing shift at `phases.js:42`); alternative extra flag costs more code.

## Must-not-miss requirements
- #16: over-30 rejected, not truncated (`chat.js:10` slice must not apply first); quota consumed only on success; EMOJIS exempt; darkSay (`chat.js:15-21`) unlimited; NDA emoji path (`chat.js:11`) unchanged.
- #17: weight 0 via `p.zero` (`vote.js:29`); never set zeroNext; names announced publicly; k = max(1, floor(alive/4)).
- #18: result always truthful; ignores Honeypot/Alibi; announced before checkEnd; fewer than 3 alive uses all.
- #19: no voter names in interim public data; round 1 has no side effects (skipStreak, traps, lastVotes, bonusVotes, mana); round 2 keeps round-1 votes; final result from round 2 only.
- #20: full report only to moderator; public sees Burnout names only; on-call never named publicly; Mana bar visible; exactly one on-call.
- Golden: re-record `snapshot.json` and `mod-actions.json`; raise GOLDEN_SEEDS; `npm test` green; balance before/after reported (bots ignore new info effects).
- Thai player-visible strings; docs list in risks-docs.md.

## References
- None external (L0 codebase only).

## Open questions for PM (product, not research)
1. #18 "truthful result": confirm it means the group of the 3 picked players [assumed].
2. #18 pool: alive after ejection [assumed].
3. #16 "30 characters": code points [assumed]; confirm.

## Level reached
- L0. Stopped: every rule maps to an existing path; no library or external fact needed. No spikes. Open questions above.
