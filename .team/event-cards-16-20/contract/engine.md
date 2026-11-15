# Engine design per card (app/src/engine, BE)

New mixin method names must be unique across `app/src/engine/*.js` (`game.js` throws on a duplicate). Names fixed here: `tallyVotes`, `closeRound1`, `openRound2`, `pickExtraTeam`, `pickOnCall`, `uatAnnounce`, `publishNight`, `chatCount`.
Card state lives on `G.event` (reset to null at the top of every `drawEvent`, so it clears itself next morning): `G.event.extra` (#17 ids), `G.event.onCall` (#20 id), `G.event.fullReport` (#20, mod only). `common()` builds `event` field by field and must never spread `G.event`.
Every new view field is omitted (`undefined`) when its card is inactive (keeps stage A golden byte-identical, AC-7 "not shown").

## #16 purge (chat.js, constants.js, game.js, events.js)
- Constants in `constants.js`: `PURGE_MSGS = 3`, `PURGE_LEN = 30`. `G.chatUsed = {}` in the constructor; `drawEvent` resets it when `id === 'purge'`.
- `chat(pid, text)` order: dead check, phase gate (`MORNING` or `VOTE_INTERIM`), `raw = String(text || '').trim()` with NO slice yet, empty check, NDA check (silenced and not an exact `EMOJIS` entry: old error), then if `evIs('purge')` the purge check, then `text = raw.slice(0, 200)` and the push. Non-purge path = today's behaviour.
- Purge check: `stripped` = `raw` with every `EMOJIS` entry removed, then trimmed. Empty `stripped` (emoji only) = exempt: no count, no quota. Otherwise `chatCount(stripped) = Array.from(stripped).length` (code points, spaces count). Over 30: reject, quota untouched. `chatUsed[pid] >= 3`: reject. After the push succeeds: `chatUsed[pid]++` (mixed text-and-emoji uses 1).
- Errors (return string): length `ข้อความยาวเกิน 30 ตัวอักษร (Meeting Purge) — ไม่ได้ส่ง ไม่เสียโควตา`; quota `โควตาแชทวันนี้หมดแล้ว (Meeting Purge: 3 ข้อความ)`.
- `darkSay` untouched. The quota resets because a new `Game` is built per start (AC-7).

## #17 hands (events.js)
- `drawEvent`, after the `leak` line: `if (id === 'hands') this.pickExtraTeam()`. `k = Math.max(1, Math.floor(alive.length / 4))`; `picked = shuffle(alive).slice(0, k)` (one shuffle); `p.zero = true` for each; never `zeroNext`. `G.event.extra = picked.map(p => p.id)`.
- Announce: `G.sys` and `G.report.push` with the names, `👥 More Hands on Deck: ทีมเสริมวันนี้ ${names} — พลังโหวตวันนี้เป็น 0`. Weight 0 flows through the existing `vote.js:29` code; `castVote` is unchanged. The existing shift in `closeNight` (`phases.js:42`) resets `p.zero`.

## #18 uat (vote.js)
- `closeVote` final path, after `G.voteResult` is built, `G.phase = 'VOTE_RESULT'` and the `ผลโหวต` sys/log, immediately before `G.checkEnd()`: `if (G.evIs('uat')) G.uatAnnounce()`.
- `uatAnnounce`: `pool = G.alive()` (ejectee already dead); empty pool: return; `picked = shuffle(pool).slice(0, 3)` (fewer than 3 alive: all, no error); `dark = picked.some(p => p.faction === 'dark')` (never via `honeyOn`/`alibiOn`/`overpromised`). Text `🧪 UAT Too Late: สุ่มทดสอบ ${names} → ${dark ? 'มีฝ่ายมืดอย่างน้อย 1 คน' : 'ไม่มีฝ่ายมืด'}`. Push to `G.voteResult.lines`, `G.sys`, `G.report`, `G.log`. Inactive: no code runs, no `Math.random` call (AC-19).

## #19 redesign: phase machine (phases.js, vote.js, views.js, chat.js, mod-view.js, moderator.js)
`MORNING -> VOTE` (`toVote`; sets `G.voteRound = G.evIs('redesign') ? 1 : 0`, `G.votes = {}`)
`VOTE -> VOTE_INTERIM` (`closeVote`, only when `evIs('redesign') && voteRound === 1`)
`VOTE_INTERIM -> VOTE` (`openRound2`; `voteRound = 2`; `G.votes` kept)
`VOTE -> VOTE_RESULT` (`closeVote` final; `voteRound = 0`) `-> NIGHT` (`toNight`, guard unchanged: a `VOTE_INTERIM` cannot reach `NIGHT`).
- Diagram: `docs/architecture/states/game-phase.html` (spec in the hand-off, drawn by diagrammer).
- `tallyVotes()` (pure, no writes): builds `votes` (silenced skipped, hijack voter = SKIP, no vote = SKIP) and `tally`/`skip` with the `vote.js:29` weights. It does NOT write defaults back into `G.votes` and ignores `bonusVotes`. The final close uses it too (then adds `bonusVotes` as today).
- `closeVote()`: `if (G.evIs('redesign') && G.voteRound === 1) return G.closeRound1()`. `closeRound1()`: store `G.interim = { tally: [{ name, n }] sorted by n desc, skip }` from `tallyVotes()`; `G.phase = 'VOTE_INTERIM'`; `G.timer = null` (else round 2 revives the old countdown, `common.js:21`); `G.sys` and `G.log` with the counts only. Writes nothing else: no `skipStreak`, `traps`, `lastVotes`, `bonusVotes`, `mana`, `voteResult`; zero RNG calls; no `checkEnd`.
- `openRound2()`: not `VOTE_INTERIM` -> return `เปลี่ยนเฟสไม่ได้ในตอนนี้`; else set `phase = 'VOTE'`, `voteRound = 2`, `G.interim = null`, `G.timer = null`, sys/log; no reset of `G.votes`. Round 2 final close = today's `closeVote` body, so traps, skip streak, Mana +2, `voteResult.lines`, `lastVotes` use round 2 votes only (a non-re-voter keeps the round-1 vote because `G.votes` persists).
- No voter names in `VOTE_INTERIM`: `common().voteResult` is `null` in that phase (yesterday's lines name voters); logs and sys carry counts only; `me.voted` is the viewer's own vote.
- `chat` allows `VOTE_INTERIM` (AC-23). `views.js` `voteCandidates` stays `VOTE` only. `mod-view.js`: `pending()` returns `{}` in `VOTE_INTERIM`; `guidance()` gets a `VOTE_INTERIM` case (title, read interim tally, next = press open round 2) and a `VOTE` note on round 1 or 2.
- `moderator.js`: `closeVote` guard stays `phase !== 'VOTE'`; add `else if (action === 'openRound2') err = g.openRound2()`. Only the moderator socket reaches `mod:do` (AC-24).

## #20 status
Gate and publication: `contract/night-report.md`. `drawEvent`: `if (id === 'status') this.pickOnCall()`: `G.event.onCall = rnd(G.alive()).id` (one `rnd`), then `G.sys` and `G.report.push('📟 มีวิศวกรเวร 1 คนได้รับสรุปเมื่อคืน (ไม่บอกชื่อ)')`. `G.log` of the draw never names the on-call.
