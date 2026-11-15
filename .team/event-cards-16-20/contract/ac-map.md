# AC id to contract logic

Tests are cases in `app/test/events.js` named by card key (`purge`, `hands`, `uat`, `redesign`, `status`) unless stated. Section names refer to `engine.md` (E), `night-report.md` (N), `events.md` (V), `golden.md` (G).

| AC | Home | Test or evidence |
|---|---|---|
| AC-1 | E #16 `chat` quota, count after push; V `me.chatLeft` | `purge`: 3 left, 30 cp ok, left 2 |
| AC-2 | E #16 length check before any slice, quota untouched | `purge`: 31 cp rejected, text not in feed, left unchanged |
| AC-3 | E #16 quota reject | `purge`: 4th rejected, feed length unchanged |
| AC-4 | E #16 `EMOJIS` stripped, emoji-only exempt | `purge`: emoji-only x5 free; mixed message uses 1 |
| AC-5 | E #16 `darkSay` untouched | `purge`: dark at `NIGHT` sends long text x5 |
| AC-6 | E #16 NDA check before purge check | `purge`: silenced emoji ok, silenced text old error |
| AC-7 | V `me.chatLeft`, `chatLimit`; FE counter; new `Game` resets | `purge`: view has field, absent without card; FE manual |
| AC-8 | E #16 `Array.from` count | `purge`: 30 Thai cp with combining marks ok, 31 rejected |
| AC-9 | E #17 `pickExtraTeam`, k formula, `p.zero` | `hands`: N=12 gives 3 distinct alive zero |
| AC-10 | E #17 announce (sys and report) with names | `hands`: feed and report contain the names |
| AC-11 | E #17 weight via `vote.js:29`, `castVote` unchanged | `hands`: zero voter weight 0, can vote, can be targeted |
| AC-12 | E #17 no `zeroNext`; `phases.js:42` shift | `hands`: after `closeNight` zero false, zeroNext false |
| AC-13 | E #17 `max(1, ...)` | `hands`: 3 alive gives k=1 |
| AC-14 | E #18 `uatAnnounce` before `checkEnd` | `uat`: 3 distinct alive named, exact result strings |
| AC-15 | E #18 `some(faction === 'dark')`, no trap helpers | `uat`: Honeypot and Alibi and Overpromise set, result still true |
| AC-16 | E #18 pool after ejection | `uat`: ejectee never picked (loop over seeds) |
| AC-17 | E #18 hook placement | `uat`: game-ending vote still has the line in feed |
| AC-18 | E #18 fewer than 3 alive | `uat`: 2 alive, all named, no throw |
| AC-19 | E #18 no code when inactive; G stage A | golden unchanged in stage A; `uat`: no extra random call (counter on `Math.random`) |
| AC-20 | E #19 phase machine, `closeRound1` | `redesign`: `closeVote` gives `VOTE_INTERIM`, nobody dead |
| AC-21 | E #19 no names; V `interim`, `voteResult` null | `redesign`: JSON of player view and `modView(true)` has no voter-to-target text |
| AC-22 | E #19 `closeRound1` writes nothing else | `redesign`: deep-compare skipStreak, traps, lastVotes, bonusVotes, mana, voteResult |
| AC-23 | E #19 chat gate; V `p:chat` | `redesign`: chat in `VOTE_INTERIM` ok |
| AC-24 | E #19 `openRound2`; V `mod:do openRound2` | `redesign` engine; `mod-actions.js` step for ack and non-mod error |
| AC-25 | E #19 `G.votes` kept | `redesign`: carried vote counted, re-vote replaces |
| AC-26 | E #19 final close is round 2 only | `redesign`: Blame Shifting, skip streak, Mana +2, `voteResult.lines` from round 2 |
| AC-27 | E #19 `toNight` guard unchanged | `redesign`: `toNight` in `VOTE_INTERIM` errors; full day reaches `NIGHT` |
| AC-28 | G stage A; `voteRound` absent | golden unchanged in stage A; `events.js` marathon test still green |
| AC-29 | N gate, classification | `status`: full `closeNight` with curse blocked, bug, trap; none of it in `report`/feed |
| AC-30 | N public surface | `status`: public report equals Burnout line plus announcement |
| AC-31 | N `pickOnCall`, intel delivery | `status`: rooms of 6 and 12, one on-call, `intel` only theirs, id absent from `common()` JSON |
| AC-32 | N moderator `statusReport`; `mana` in `common()` | `status`: `modView(false).statusReport` has all lines, `mana` present |
| AC-33 | N stash, classify at build, `publishNight` after `drawEvent` | `status`: `closeNight` publishes after draw; headline public, rest status |
| AC-34 | N `gated: false`; G stage A | golden unchanged in stage A; `status`: control night with another card has byte-equal report and feed order |
| AC-35 | N Reply-All unchanged | `status`: Chaos Intern Reply All plus #20, no throw |
| AC-36 | V card data; `data.js` keys | `events.js` harness (`all 20 event cards tested`); deck length 20 |
| AC-37 | G staging and re-record | `npm test` `GOLDEN OK`, `COVERAGE GATE` clear, new coverage keys hit |
| AC-38 | G `events.js` | `npm test` green, five named cases |
| AC-39 | G `balance.js` driver | `npm run balance -- 2000` before and after, report file |
| AC-40 | docs-writer (ownership.md) | grep in `docs/`: phase table has `VOTE_INTERIM`, 20 cards, Daily Rule = 7 |
| AC-41 | docs-writer, FE `gallery.html` | repo grep for `15`, `15 ใบ`, `ทั้ง 15` finds nothing stale |
| AC-42 | V FE rules; `gallery.html`, `card-info.js` | `/gallery` lists n16-n20 with `/docs/event_cards/...jpg` (manual) |
| AC-43 | ownership.md note: already in `129f3b7` | `git log --stat` shows the ideas doc and five jpgs; no push |
| AC-44 | V card data proposals | Thai review by docs-writer and Orchestrator (manual) |
