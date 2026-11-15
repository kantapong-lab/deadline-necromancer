# Risks and docs to update

## Risks (ranked)
1. #20 publication order (structural): night report published in resolveNight (`night-resolve.js:212-214`) before drawEvent (`phases.js:60`). Needs deferred publish. Wrong order = report leaks publicly.
2. #19 interim phase touches ~12 places (see hooks.md). Bots and balance call closeVote once (`balance.js:39`, `simulate.js:40`, `golden/bot.js:67`); they stall at interim when card 19 is drawn.
3. Deck odds: 4 draws/game from 20 cards, so each new card appears in ~20% of games. Golden coverage (`golden/bot.js:142`) needs every key. With GOLDEN_SEEDS=20 (`golden/run.js:15`) a given card is missed ~0.8^20 = 1.2%; ~6% that at least one of 5 is missed. Raise seeds (e.g. 40, ~0.01% per card) and confirm the gate passes before `--record` (run.js refuses to record on gate fail).
4. Re-records needed: `test/golden/snapshot.json`, `test/mod-actions.json` (state shape gains `chatLeft`, new phase), and `test/http-parity.json` (sha256 of `/`, `/mod`, `/gallery`, `/data.js` at lines 6, 18, 24, 30). Any edit to data.js, index.html, mod.html, gallery.html changes hashes. [verify] how http-parity is recorded.
5. #16 "30 characters" unit is undefined: UTF-16 `.length` (current style) vs code points vs graphemes. Thai vowels/tone marks are separate code points. Assumed: code points `[...text].length`. PM to confirm.
6. #16 client: `sendChat` (`index.html:70`) clears input before server answer, so an over-30 message is lost. Pre-check length client side.
7. #17 label: `index.html:246` labels zero as "PIP Curse". Misleading for extra team; add flag.
8. #18 scope [assumed]: "truthful result" = dark/non-dark result for the 3 picked players. Pool = alive after ejection. Insert before checkEnd.
9. Balance: bots do not model info effects (#16, #18, #20). #17 and #19 change vote math. Run `npm run balance -- 2000` before/after per player count (baseline 6=49%, 7=46%, 8=50%, 9=46%, 10=50%, 11=49%, 12=56% light).
10. Thumbs for 16-20 may be missing (`data.js:67`); `common.js:54` falls back to full image. [verify]
11. Not a risk: #16 and #19 cannot coexist on one day (one card per morning), so no chat/quota conflict between interim chat and purge.
12. Commit state: `git log` shows `129f3b7 docs: card art #16-#20 and daily rule ideas`, but checkpoint says the ideas doc and jpgs are untracked. [verify] with `git status` in the worktree before committing.

## Docs to update (checkpoint list, with lines)
- `docs/deadline_necromancer_event_cards.md`: :1 title "ทั้ง 15 ใบ", :21-28 type list (Daily Rule count), :30 table heading, :43-48 table rows (add #16-#20), :64 "รูปการ์ดทั้ง 15 ใบ", :65 status line.
- `docs/deadline_necromancer_player_rules.md`: :27 Event Card line, :71 "ทั้ง 15 ใบ"; two-round vote and morning chat limit wording [verify location].
- `docs/deadline_necromancer_design.md`: :101 morning, :107 night, :143 Event Card rule, :152 data file note, :199 state table (add VOTE_INTERIM and round-2 transitions; NIGHT→MORNING publication for #20), :215 socket/actions table (new mod actions), test table [verify], :301 balance numbers (after run).
- `docs/deadline_necromancer_daily_rule_ideas.md`: :3 ("มีแค่ 2 ใบ"), :5 ("การ์ด 15 ใบเดิม"), :106 (15→20, Daily share 2/15 → 7/20); mark 5 ideas implemented with final rules; fix Status Page Down section to the on-call mechanic [verify section line].
- `app/public/card-info.js:124-126` add 16-20 entries.
- `app/public/gallery.html:63` title "(15 ใบ)" → "(20 ใบ)".
- README: none exists (`baseline.md:49`), skip.
- Not editable: docs/architecture/* (shared guard), docs/architecture/baseline.md.
