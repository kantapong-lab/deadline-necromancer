# AC: event-cards-16-20
Stories: as moderator/player I want 5 new Daily Rule cards (#16-#20) so the 4 draws per game vary. P0 = rule works + tests + golden; P1 = docs/gallery/balance; P2 = polish. [assumed] = not confirmed by owner.
Rows: Given / When / Then, one line each. Test = case in `app/test/events.js` unless stated.

## #16 Meeting Purge (P0)
- AC-1 G #16 active, player has 3 left / W sends a message of <=30 code points / T it is posted, remaining count -1 [AC-1]
- AC-2 G #16 active / W message of 31+ code points / T rejected, not truncated (`chat.js:10` slice not applied first), quota unchanged [AC-2]
- AC-3 G player used 3 messages / W sends a 4th / T rejected, none posted [AC-3]
- AC-4 G #16 active / W message includes EMOJIS entries / T emoji do not count toward 30 and do not use quota (emoji-only send exempt) [AC-4]
- AC-5 G #16 active, dark player at night / W darkSay / T unlimited, unaffected [AC-5]
- AC-6 G #16 active + NDA Silence / W affected player chats / T NDA emoji path (`chat.js:11`) behaves as before [AC-6]
- AC-7 G #16 active / W room view built / T each player's view shows remaining count; UI displays it in Thai; quota resets next game, not shown when #16 inactive [AC-7]
- AC-8 [assumed] G a 30-char Thai string with combining marks / W counted / T length = code points (`Array.from`), not UTF-16 units [AC-8]

## #17 More Hands on Deck (P0)
- AC-9 G #17 drawn, N alive / W drawEvent / T exactly k=max(1,floor(N/4)) distinct alive players have `p.zero=true` [AC-9]
- AC-10 G #17 drawn / W event announced / T public text lists the extra-team NAMES [AC-10]
- AC-11 G a zero-flagged player votes and is voted for / W closeVote / T their vote weight is 0 (`vote.js:29`), they can still vote and be targeted [AC-11]
- AC-12 G #17 day ends / W closeNight / T `p.zero` reset by the existing shift (`phases.js:42`); `zeroNext` never set by #17 [AC-12]
- AC-13 G alive=3 / W #17 drawn / T k=1 [AC-13]

## #18 UAT Too Late (P0)
- AC-14 G #18 active, >=3 alive after closeVote / W vote closes / T exactly 3 distinct alive players named publicly with "มีฝ่ายมืดอย่างน้อย 1 คน" or "ไม่มีฝ่ายมืด" [AC-14]
- AC-15 G the 3 picks / W result computed / T true iff >=1 is dark; ignores Honeypot, Alibi, Overpromise [AC-15]
- AC-16 G a player was just ejected / W pool built / T pool = alive after ejection, ejectee excluded [AC-16]
- AC-17 G the vote ends the game (`checkEnd`) / W closeVote / T announcement is made before checkEnd (`vote.js:77`) and appears in feed [AC-17]
- AC-18 G <3 alive / W closeVote / T all alive used, no error [AC-18]
- AC-19 G #18 not active / W closeVote / T no announcement and no extra Math.random call [AC-19]

## #19 Client Redesign (P0)
- AC-20 G #19 active, vote opens / W moderator closes round 1 / T phase = new `VOTE_INTERIM`; nobody ejected [AC-20]
- AC-21 G VOTE_INTERIM / W any public view or mod broadcast read / T shows votes per player + Skip count only, NO voter names [AC-21]
- AC-22 G round 1 closed / W state inspected / T no skipStreak, trap, lastVotes, bonusVotes, mana or voteResult side effect [AC-22]
- AC-23 G VOTE_INTERIM / W players chat publicly / T chat accepted [AC-23]
- AC-24 G VOTE_INTERIM / W moderator presses open-round-2 button (with normal timing controls) / T phase = VOTE, round 2 starts; non-moderator cannot trigger [AC-24]
- AC-25 G round 2 open / W player does not re-vote / T round-1 vote retained; a re-vote replaces it [AC-25]
- AC-26 G round 2 closes / W closeVote / T Blame Shifting/Exit Scam traps, Skip penalty/streak, Mana +2 on dark ejection and voteResult lines use round 2 only [AC-26]
- AC-27 G toNight guard (`phases.js:19`) / W moderator advances / T works for #19 flow; VOTE_INTERIM cannot skip to NIGHT [AC-27]
- AC-28 G non-#19 day / W normal vote / T flow and phases unchanged [AC-28]

## #20 Status Page Down (P0)
- AC-29 G #20 drawn / W closeNight / T full report (curse blocked, bug -1, Mana line, trap messages) is withheld from public feed [AC-29]
- AC-30 G #20 drawn / W morning / T public sees only Burnout names plus "มีวิศวกรเวร 1 คนได้รับสรุปเมื่อคืน (ไม่บอกชื่อ)" [AC-30]
- AC-31 G #20 drawn, any room size / W on-call picked / T exactly one random alive player gets the full report via `intel[pid]`; identity never in public data [AC-31]
- AC-32 G #20 drawn / W moderator view / T shows full report; Mana bar visible to all [AC-32]
- AC-33 G report lines / W resolveNight / T classified public (Burnout) vs status (rest), report published after drawEvent in closeNight (stash in resolveNight) [AC-33]
- AC-34 G #20 not drawn / W night closes / T report published as before, byte-identical [AC-34]
- AC-35 G Chaos Intern Reply All / W fires / T may leak on-call note; accepted, no crash [AC-35]

## Cross-cutting
- AC-36 (P0) G 5 EVENTS entries n:16-20 with img, t, d in `data.js` / W deck built / T deck=20, each card drawable once per game, Thai text in existing tone [AC-36]
- AC-37 (P0) G changes done / W re-record `golden/snapshot.json` and `mod-actions.json`, raise GOLDEN_SEEDS until every coverage key (incl. new events) hit / T golden gate passes [AC-37]
- AC-38 (P0) G tests / W `npm test` / T one named test per new card in `events.js`, all green [AC-38]
- AC-39 (P1) G `npm run balance -- 2000` / W run before and after / T per-player-count (6-12) light/dark win rates reported, baseline 49/46/50/46/50/49/56; report states bots do not model the new info effects; no rebalance claimed [AC-39]
- AC-40 (P1) G docs / W updated / T `deadline_necromancer_event_cards.md` (20 cards, type counts, Daily Rule=7, notes), `player_rules.md` (15->20), `design.md` (deck size, phase table with VOTE_INTERIM, data notes, test table), `daily_rule_ideas.md` (5 marked implemented with final rules; Status Page Down = on-call engineer), README if it says 15 [AC-40]
- AC-41 (P1) G repo grep / W search "15", "15 ใบ", "ทั้ง 15" / T no stale deck-size wording left [AC-41]
- AC-42 (P1) G `card-info.js` + `/gallery` / W opened / T #16-#20 shown with images served from docs/event_cards [AC-42]
- AC-43 (P1) G untracked files / W committed / T ideas doc and the 5 jpgs in docs/event_cards committed, small commits, feature branch, no push [AC-43]
- AC-44 (P2) G new Thai strings / W reviewed / T tone matches existing cards [AC-44]

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
