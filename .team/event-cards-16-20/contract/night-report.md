# #20 night-report stash, classification, publication (night-resolve.js, phases.js, events.js, mod-view.js, BE)

## Why a stash
`closeNight` runs `resolveNight` before `drawEvent`, so tonight's report is built before anyone knows the new morning card. Card #20 withholds the report of the night that just ended, so publication moves behind `drawEvent`, without changing anything on other days.

## Classification (decided when the line is built, never by sniffing text)
In `resolveNight` every `rep.push(text)` becomes a status line; the final headline (Burnout names, "ไม่มีใคร Burnout" or "คืนแรกผ่านไปอย่างสงบ", today's `rep.unshift`) is the only public line. Status = Production Crisis lines, Hot Desking reveal, devops warning, curse-blocked count, Hotfix Rollback, Mana line, `Trap Card ทำงาน` lines.
Not part of the stash, published exactly where they are today:
- the Reply-All anon broadcast (`resolveNight`, stays immediate). AC-35: it reads `notes` only and the on-call status lines never enter `notes`, so they are not broadcast; a leak would be accepted, none is required. Test: Chaos Intern Reply All plus #20 in one night, no crash;
- the drawEvent lines (event sys, `leak`, `hands`, `status` announcement).
Also in the stash, as status lines, because AC-29/AC-30 say the public sees only the Burnout names: the NDA Silence report line (report only, no feed entry) and the Meeting Hijack `Trap Card ทำงาน` line (report and feed) that `closeNight` writes after `resolveNight`. `closeNight` adds them through `G.addNightLine(text, { sys })` instead of `G.report.push` and `G.sys`: in deferred mode it builds the prebuilt entry at the same moment as today (`Date.now` order kept), records `at = G.feed.length` for the hijack entry, and appends the line to the stash in code order (NDA, then hijack).
The `G.log('ประมวลผลกลางคืน', rep.join(' | '))` timeline entry stays in `resolveNight` with the full text (same `day` and `phase` stamps; the moderator view already shows it).

## Mechanics
- `resolveNight(opts)`: with `opts.defer` true, in this exact order (today's `Date.now` order): set `G.report = []`; push the anon broadcast; `feedMark = G.feed.length`; build the prebuilt entries `{ kind: 'sys', text, ts: Date.now() }`, one per line; `G.log('ประมวลผลกลางคืน', ...)`; store `G.nightStash = { day: G.day, feedMark, lines: [{ text, kind, entry, at }] }`. Without `opts` (every existing test and `balance.js` call) it publishes at once exactly as today: no behaviour change.
- `closeNight` calls `G.resolveNight({ defer: true })` and then calls `G.publishNight({ gated })` exactly once on every path: before each early return (`checkEnd` and day-5 timeout; `gated: false`, no card is drawn) and right after `drawEvent` with `gated: G.evIs('status')`.
- `publishNight({ gated })`: take and clear `G.nightStash`; `shown = gated ? lines.filter(public) : lines`; `G.report.unshift(...texts)` in stash order (the drawEvent lines already sit behind it, which reproduces today's order); feed entries are spliced highest index first so indices hold: the hijack entry at its `at`, then the night entries at `feedMark` (reproduces today's feed order: report lines before the morning line, hijack line after it). If `gated`: `G.event.fullReport = all line texts` (public ones too); every line (the full report, same set) goes to `G.intel[G.event.onCall]` as `{ day: stash.day, text: '📟 สรุปเมื่อคืน (วิศวกรเวร): ' + text }` (the Exit Scam `blockIntel` does not apply to it).
- `pickOnCall` runs in `drawEvent` (after this morning's deaths), so a dead player is never on-call. Exactly one on-call at any room size.

## Public vs private surface (checks for tests)
- Public (every player view, moderator view without secrets): `report` = Burnout headline + the announcement (no NDA, hijack, Mana or trap line) `📟 มีวิศวกรเวร 1 คนได้รับสรุปเมื่อคืน (ไม่บอกชื่อ)`; `feed` has the same; `mana` and `manaMax` unchanged (the bar stays visible, AC-32).
- Moderator view: `statusReport` (all lines) under both secrets settings (the timeline already shows them); `onCall` id only when `secrets` is on.
- On-call player only: `me.intel`. The on-call id never appears in `common()`, `pubPlayers`, `feed`, `report`, the timeline or `event` as built for views.
- Not #20 (AC-34): `gated: false`, so `G.report`, `G.feed` text order and timeline equal today's; stage A of `golden.md` proves it.
