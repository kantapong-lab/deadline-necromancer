# AC: event-cards-16-20
Stories: as moderator/player I want 5 new Daily Rule cards (#16-#20) so the 4 draws per game vary. P0 = rule works + tests + golden; P1 = docs/gallery/balance; P2 = polish. [assumed] = not confirmed by owner. Full Given/When/Then in each detail file; tests = cases in `app/test/events.js` unless stated.
| AC | Card, priority, gist | Detail |
|---|---|---|
| AC-1 | #16 Meeting Purge (P0): message <=30 code points posted, remaining -1 | [detail](ac/AC-1.md) |
| AC-2 | #16 (P0): 31+ code points rejected not truncated, quota unchanged | [detail](ac/AC-2.md) |
| AC-3 | #16 (P0): 4th message rejected after 3 used | [detail](ac/AC-3.md) |
| AC-4 | #16 (P0): EMOJIS entries do not count toward 30 or quota | [detail](ac/AC-4.md) |
| AC-5 | #16 (P0): darkSay at night unlimited, unaffected | [detail](ac/AC-5.md) |
| AC-6 | #16 (P0): NDA Silence emoji path unchanged | [detail](ac/AC-6.md) |
| AC-7 | #16 (P0): room view shows remaining count in Thai; resets next game | [detail](ac/AC-7.md) |
| AC-8 | #16 (P0) [assumed]: Thai combining marks counted as code points | [detail](ac/AC-8.md) |
| AC-9 | #17 More Hands on Deck (P0): k=max(1,floor(N/4)) alive players get p.zero | [detail](ac/AC-9.md) |
| AC-10 | #17 (P0): public text lists extra-team names | [detail](ac/AC-10.md) |
| AC-11 | #17 (P0): zero-flagged vote weight 0, can still vote and be targeted | [detail](ac/AC-11.md) |
| AC-12 | #17 (P0): p.zero reset by existing shift; zeroNext never set | [detail](ac/AC-12.md) |
| AC-13 | #17 (P0): alive=3 gives k=1 | [detail](ac/AC-13.md) |
| AC-14 | #18 UAT Too Late (P0): 3 distinct alive players named with dark/no-dark result | [detail](ac/AC-14.md) |
| AC-15 | #18 (P0): result true iff >=1 dark; ignores Honeypot, Alibi, Overpromise | [detail](ac/AC-15.md) |
| AC-16 | #18 (P0): pool = alive after ejection | [detail](ac/AC-16.md) |
| AC-17 | #18 (P0): announced before checkEnd, appears in feed | [detail](ac/AC-17.md) |
| AC-18 | #18 (P0): <3 alive uses all, no error | [detail](ac/AC-18.md) |
| AC-19 | #18 (P0): not active means no announcement, no extra Math.random | [detail](ac/AC-19.md) |
| AC-20 | #19 Client Redesign (P0): round 1 close gives VOTE_INTERIM, nobody ejected | [detail](ac/AC-20.md) |
| AC-21 | #19 (P0): interim shows per-player votes + Skip only, no voter names | [detail](ac/AC-21.md) |
| AC-22 | #19 (P0): round 1 has no skipStreak/trap/lastVotes/bonusVotes/mana/voteResult effect | [detail](ac/AC-22.md) |
| AC-23 | #19 (P0): public chat accepted in VOTE_INTERIM | [detail](ac/AC-23.md) |
| AC-24 | #19 (P0): moderator opens round 2; non-moderator cannot | [detail](ac/AC-24.md) |
| AC-25 | #19 (P0): round-1 vote retained in round 2; re-vote replaces | [detail](ac/AC-25.md) |
| AC-26 | #19 (P0): traps, Skip penalty, Mana, voteResult use round 2 only | [detail](ac/AC-26.md) |
| AC-27 | #19 (P0): toNight guard works; VOTE_INTERIM cannot skip to NIGHT | [detail](ac/AC-27.md) |
| AC-28 | #19 (P0): non-#19 day flow unchanged | [detail](ac/AC-28.md) |
| AC-29 | #20 Status Page Down (P0): full night report withheld from public feed | [detail](ac/AC-29.md) |
| AC-30 | #20 (P0): public sees Burnout names + unnamed on-call line | [detail](ac/AC-30.md) |
| AC-31 | #20 (P0): one random alive on-call gets report via intel map; never public | [detail](ac/AC-31.md) |
| AC-32 | #20 (P0): moderator sees full report; Mana bar visible to all | [detail](ac/AC-32.md) |
| AC-33 | #20 (P0): lines classified public vs status; published after drawEvent | [detail](ac/AC-33.md) |
| AC-34 | #20 (P0): not drawn means report byte-identical to before | [detail](ac/AC-34.md) |
| AC-35 | #20 (P0): Chaos Intern Reply All may leak on-call note, no crash | [detail](ac/AC-35.md) |
| AC-36 | Cross (P0): 5 EVENTS entries n:16-20, deck=20, Thai tone | [detail](ac/AC-36.md) |
| AC-37 | Cross (P0): re-record golden, raise GOLDEN_SEEDS, gate passes | [detail](ac/AC-37.md) |
| AC-38 | Cross (P0): one named test per new card, npm test green | [detail](ac/AC-38.md) |
| AC-39 | Cross (P1): balance 2000 before/after, win rates 6-12 reported, no rebalance | [detail](ac/AC-39.md) |
| AC-40 | Cross (P1): docs updated (event_cards, player_rules, design, ideas, README) | [detail](ac/AC-40.md) |
| AC-41 | Cross (P1): no stale "15" deck-size wording | [detail](ac/AC-41.md) |
| AC-42 | Cross (P1): card-info.js + /gallery show #16-#20 with images | [detail](ac/AC-42.md) |
| AC-43 | Cross (P1): ideas doc and 5 jpgs committed, small commits, no push | [detail](ac/AC-43.md) |
| AC-44 | Cross (P2): new Thai strings match existing tone | [detail](ac/AC-44.md) |
## Traceability
| Brief must-not-miss | AC |
|---|---|
| #16: over-30 rejected, not truncated (`chat.js:10` slice must not apply first); quota consumed only on success; EMOJIS exempt; darkSay (`chat.js:15-21`) unlimited; NDA emoji path (`chat.js:11`) unchanged. | AC-2, AC-3, AC-4, AC-5, AC-6 |
| #17: weight 0 via `p.zero` (`vote.js:29`); never set zeroNext; names announced publicly; k = max(1, floor(alive/4)) | AC-9, AC-10, AC-11, AC-12 |
| #18: result always truthful; ignores Honeypot/Alibi; announced before checkEnd; fewer than 3 alive uses all | AC-14, AC-15, AC-16, AC-17, AC-18 |
| #19: no voter names in interim public data; round 1 has no side effects (skipStreak, traps, lastVotes, bonusVotes, mana); round 2 keeps round-1 votes; final result from round 2 only. | AC-21, AC-22, AC-25, AC-26 |
| #20: full report only to moderator; public sees Burnout names only; on-call never named publicly; Mana bar visible; exactly one on-call | AC-29, AC-30, AC-31, AC-32 |
| Golden: re-record `snapshot.json` and `mod-actions.json`; raise GOLDEN_SEEDS; `npm test` green; balance before/after reported (bots ignore new info effects) | AC-37, AC-39 |
| Thai player-visible strings; docs list in risks-docs.md | AC-40, AC-41, AC-42, AC-43, AC-44 |
## Out of scope
startsWith guard, decodeURIComponent, seat shuffle, rooms never deleted; published Thai rules deck artifact; bot AI for new cards; rebalancing.
