# Hook points per card (L0, path:line in this worktree)

Shared hooks (all 5 cards)
- Card registry: `app/src/shared/data.js:30-46` EVENTS (insert after `bonus`, line 45). Fields: `n`, `img`, `t`, `d`, optional `now`/`choice`. Image base `EVIMG` `data.js:62`.
- Deck: `app/src/engine/game.js:45` `this.deck = shuffle(Object.keys(EVENTS))` (20 keys after change). Draw only on days 2-5: `events.js:54`, called once per morning from `phases.js:60`.
- Coverage/test enforcement: `app/test/golden/bot.js:142` (every EVENTS key needs `event:<k>`), `app/test/events.js:157-166` (every EVENTS key needs a case).
- Gallery: `app/public/gallery.html:63-64` auto-lists EVENTS; title text `'Event Card (15 ใบ)'` hard-coded at `gallery.html:63`.
- Card text: `app/public/card-info.js:124-126` (per-key `one/what/when/tip`; leak at :124, hotdesk at :126).
- Thumbs: `data.js:67` `EVTHUMB = '/thumbs/events/'`; fallback to full image `common.js:54` onerror. [verify] whether thumbs 16-20 exist.
- Night order (`phases.js:26-63` closeNight): resolveNight `:36` → day++ `:40` → zero/dbl shift `:42` → morning reset `:46` → hijack `:51-59` → drawEvent `:60` → checkEnd `:61`.

## #16 Meeting Purge (`purge`, img `16_meeting_purge.jpg`)
- Rule gate: `chat.js:9` (MORNING only). Length check must run on trimmed, untruncated text: `chat.js:10` currently does `.slice(0, 200)`, so the 30-char reject goes before/without slice.
- Exempt: `chat.js:11` exact match `EMOJIS.includes(text)`, EMOJIS at `constants.js:4`.
- Quota state: new `this.chatUsed = {}`, init in `game.js:48-50`, reset in `events.js:52-61` (drawEvent) when `evIs('purge')`. Consume only after `chat.js:12` push succeeds.
- Dark chat untouched: `chat.js:15-21`.
- Views: `views.js:38-51` (me: add `chatLeft`). Card is active via `common()` `views.js:21-27`.
- Client: `index.html:70` sendChat clears input before `act` (text lost on server reject, pre-check length); `index.html:114-116` chatBar placeholder / remaining count.
- Server: `server/handlers/player.js:12` p:chat, no change.

## #17 More Hands on Deck (`hands`, img `17_more_hands_on_deck.jpg`)
- Pick: in `events.js:52-61` drawEvent, after `:55`. k = max(1, floor(alive/4)) via `random.js` shuffle/rnd (order matters for golden).
- Weight-0 mechanism: set `p.zero = true` (not zeroNext). Applied in tally at `vote.js:29` (`v.zero ? 0`). Skip weight also uses w (`vote.js:30`).
- Reset: `phases.js:42` `p.zero = p.zeroNext` on next closeNight (zeroNext stays false). drawEvent is only called from `phases.js:60`, so no double-set.
- Announce names: `events.js:57` pattern (sys + log) plus report.
- UI: `views.js:40` (me.zero), `mod-view.js:44` (secret tag). Chips in `index.html:228` and `index.html:246` say "PIP Curse" for zero: wrong label for this card, needs a separate flag.
- Interaction: PIP Curse sets zeroNext at `night-resolve.js:111`, applied at `phases.js:42`: no conflict.

## #18 UAT Too Late (`uat`, img `18_uat_too_late.jpg`)
- Hook: `vote.js:74-77`. Insert after ejection/voteResult (`:62-71`, `:74`) and before `G.checkEnd()` `:77` so a game-ending vote still announces. Phase set at `:75`.
- Pattern: `events.js:62-69` replyAllLeak (pool = `G.alive()` after `t.alive=false` at `vote.js:62`).
- Truth: `P(id).faction === 'dark'`, same as qa_hunter `night-resolve.js:158`. Do not route through honeyOn/alibiOn (`night-resolve.js:32-33`).
- Public surface: add a line to `voteResult.lines` (`vote.js:52`, shown on VOTE_RESULT) plus `G.sys` and `G.report`.
- Tests: `events.js` new case; `vote.js` edge with <3 alive.

## #19 Client Redesign (`redesign`, img `19_client_redesign.jpg`)  [structural]
- Phase guard for votes: `castVote` `vote.js:8-16` (VOTE only). Round 2 reuses VOTE, so castVote is unchanged.
- Round-2 start must keep votes: `phases.js:8-17` toVote resets `this.votes = {}` at `:13`. A new open-round-2 transition must not reset.
- Round-1 close: new function (suggested `closeRound1`) using the tally code at `vote.js:19-31` only. Must NOT touch: skipStreak `:57,:61`, traps `:40-51`, `G.lastVotes` `:34`, bonusVotes `:32-33`, mana `:69`, voteResult `:74`, phase `:75`, checkEnd `:77`.
- Final close: current `vote.js:17-78` logic, computed from round-2 votes (incl. carried round-1 votes).
- Interim phase: new `VOTE_INTERIM` (suggested). common.js:5 PHASES, views.js:23 phase, `chat.js:9` must allow it. Player render `index.html:126-146` needs a branch. `views.js:60` voteCandidates for VOTE only.
- Mod actions: `moderator.js:27-28` closeVote guard `g.phase !== 'VOTE'`; add cases in the switch `moderator.js:9-35`. Timer `moderator.js:35` (timer.phase).
- Mod UI: `mod.html:66-72` ACTIONS map (add interim and round-2 buttons); progress `mod.html:98` / `mod-view.js:16` pending; guidance `mod-view.js:20-33`; interim tally shown to mod only (no voter names).
- Bots/balance that call closeVote once: `balance.js:39`, `simulate.js:40`, `golden/bot.js:67`, `mod-actions.js:131`. Each stalls at interim unless updated.
- Test helper: `events.js:99-102` marathon test calls G.closeVote directly.
- Poach/soul_recruiter reads `G.lastVotes` at `night-resolve.js:189`; keep final-only.

## #20 Status Page Down (`status`, img `20_status_page_down.jpg`)  [structural]
- Night report built in `night-resolve.js`: Production Crisis lines `:71`, `:92`; curse blocked `:103`; Mana line `:126`; trap lines `:198`; Burnout names `:203-204` (stay public); `G.report = rep` `:212`; per-line publish `G.sys` `:214`; timeline `:217`; per-player intel `:209-211` (blockIntel check at :210).
- Timing problem: resolveNight runs in closeNight `phases.js:36`, before drawEvent `:60`. Publication at `:212-214` happens before the morning card is drawn, so drawEvent cannot gate it. Hook needed: stash rep in resolveNight, publish in closeNight after drawEvent (`phases.js:60-61`).
- On-call pick: in drawEvent (`events.js:52-61`) using alive list (after this morning's deaths, so dead players are excluded). Deliver via `intel[pid]` (`views.js:47` shows it).
- Public line: `G.sys` no name, pattern `events.js:57`.
- Moderator full view: `mod-view.js:37-52` modView, add full report field (`common()` report `views.js:25` is public).
- Reply-All: `night-resolve.js:194-197` picks from `notes`. On-call status lines go to intel only; if routed through notes they can leak (acceptable per checkpoint).
- Client intel panel already exists: `index.html:249`.
- Mana bar stays: `views.js:23` mana in common().
