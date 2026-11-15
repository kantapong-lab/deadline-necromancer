# Socket events, view fields and card data (BE builds, FE consumes)

No new socket event names and no new HTTP route (public URLs stay frozen, `app/src/server/http.js`). Handlers keep the ack shape `{ ok: true }` or `{ ok: false, error: '<Thai>' }`. Pushes stay on the single `state` event (`rooms.js` `pushState`).

## Socket
| Event | Change | Request | Ack ok | Ack error (Thai, as returned by the engine) |
|---|---|---|---|---|
| `mod:do` `openRound2` | NEW action (moderator socket only) | `{ action: 'openRound2' }` | `{ ok: true }`, then `state`: `phase 'VOTE'`, `voteRound 2` | `เปลี่ยนเฟสไม่ได้ในตอนนี้` when `phase !== 'VOTE_INTERIM'`; `ไม่ใช่ Moderator` for a player; `ยังไม่ได้เริ่มเกม` with no game |
| `mod:do` `closeVote` | behaviour: in a #19 round 1 it ends in `VOTE_INTERIM`, not `VOTE_RESULT` | `{ action: 'closeVote' }` | `{ ok: true }` | `ไม่ได้อยู่ในเฟสโหวต` when `phase !== 'VOTE'` (so also in `VOTE_INTERIM`) |
| `mod:do` `toNight` | unchanged guard | | | `เปลี่ยนเฟสไม่ได้ในตอนนี้` from `VOTE_INTERIM` and every phase but `VOTE_RESULT` |
| `mod:do` `timer`, `pause`, `announce` | unchanged; work in `VOTE_INTERIM` (`timer.phase` = `VOTE_INTERIM`) | | | |
| `p:chat` | accepted in `MORNING` and `VOTE_INTERIM`; #16 limits | `{ text }` | `{ ok: true }` | `พิมพ์แชทได้เฉพาะช่วงประชุมเช้า` (other phases, unchanged); `ข้อความยาวเกิน 30 ตัวอักษร (Meeting Purge) — ไม่ได้ส่ง ไม่เสียโควตา`; `โควตาแชทวันนี้หมดแล้ว (Meeting Purge: 3 ข้อความ)`; existing `ข้อความว่าง`, NDA error |
| `p:vote` | unchanged; accepted in `VOTE` (round 1 and 2), error `ยังไม่ถึงเฟสโหวต` in `VOTE_INTERIM` | `{ target }` | | |
| `p:dark` | unchanged (unlimited under #16) | | | |
Status codes: n/a (Socket.IO acks, not HTTP). The game phase value set becomes `LOBBY, MORNING, VOTE, VOTE_INTERIM, VOTE_RESULT, NIGHT, OVER`.

## View fields (`state`, built by `common()`, `viewFor`, `modView`)
All new fields are absent (not `null`, not `false`) when their card is inactive, except `voteResult` below.
| Field | Where | Shape | Present when |
|---|---|---|---|
| `phase` | common | adds `'VOTE_INTERIM'` | #19 day |
| `voteRound` | common | `1` or `2` | #19 active, phases `VOTE` and `VOTE_INTERIM` |
| `interim` | common | `{ tally: [{ name, n }], skip }`, sorted by `n` desc; weighted ballots, no voter names, hidden bonus not included, no-vote counted as Skip | `phase === 'VOTE_INTERIM'` |
| `voteResult` | common | `null` while `phase === 'VOTE_INTERIM'` (yesterday's lines name voters); otherwise as today | always present, as today |
| `chatLimit` | common | `{ msgs: 3, len: 30 }` | #16 active |
| `event.extra` | common `event` | `number[]` seat ids of the extra team (public: names are announced) | #17 active |
| `me.chatLeft` | viewFor `me` | integer `3 - used`, min 0 | #16 active |
| `me.zero` | viewFor `me` | exists; true also for the extra team | as today |
| `statusReport` | modView | `string[]` all lines of the night just ended, in order | #20 active, set after the morning draw |
| `onCall` | modView | seat id or `null` | #20 active AND `secrets` on |
Never added to any view: `G.event.onCall`, `G.event.fullReport`, `G.nightStash`, `G.chatUsed`, `G.lastVotes`, any voter-to-target pair during `VOTE_INTERIM`.
`me.intel` carries the on-call lines: `{ day, text: '📟 สรุปเมื่อคืน (วิศวกรเวร): ...' }`.

## FE rendering rules (app/public)
- `common.js` `PHASES` gets `VOTE_INTERIM: '🗳️ พักโหวต (ผลรอบแรก)'`.
- `index.html`: a `VOTE_INTERIM` branch in `stageHTML`: show `interim.tally` and Skip, never `voteResult`; chat bar visible; text says nobody was removed and round 2 opens soon (`waitMod`). `chatBar()` shows for `MORNING` and `VOTE_INTERIM`. In `VOTE` with `voteRound === 2` show the player's carried vote and say they may change it. With `chatLimit`: show `chatLeft`, and pre-check `Array.from(text with EMOJIS removed, trimmed).length <= chatLimit.len` before `sendChat` clears the input (keep the text on a local reject). Zero chip: if `event.extra` includes `youId` show a team chip (not "PIP Curse", `index.html` 228/246).
- `mod.html`: `ACTIONS.VOTE_INTERIM = { label: 'เปิดโหวตรอบที่ 2 →', act: 'openRound2' }`; `ACTIONS.VOTE` label says round 1 when `voteRound === 1`; show `statusReport` (and `onCall` when present) in a card; hide nothing else.
- `card-info.js` entries for the five keys; `gallery.html` title `Event Card (20 ใบ)`.

## Card data (BE writes in `data.js`; Thai proposals, tone as cards 1-15, final wording per AC-44)
- `purge` n16 `🗓️ ล้างประชุมประจำ`: วันนี้พิมพ์แชทกลางได้คนละ 3 ข้อความ ข้อความละไม่เกิน 30 ตัวอักษร (อีโมจิไม่นับ) · แชทลับฝ่ายมืดไม่ถูกจำกัด
- `hands` n17 `👥 ทีมเสริมมาช่วย`: สุ่มผู้เล่น max(1, ⌊คนที่เหลือ÷4⌋) คนเป็นทีมเสริม ประกาศชื่อ — พลังโหวตวันนี้เป็น 0 (ยังโหวตและถูกโหวตได้)
- `uat` n18 `🧪 ทดสอบก่อนส่งงานไม่กี่วัน`: หลังปิดโหวต สุ่ม 3 คน ประกาศชื่อพร้อมผลจริง "มีฝ่ายมืดอย่างน้อย 1 คน" หรือ "ไม่มีฝ่ายมืด"
- `redesign` n19 `🎨 ลูกค้าขอแก้ดีไซน์`: วันนี้โหวต 2 รอบ รอบแรกประกาศแค่คะแนน (ไม่บอกชื่อ) ไม่มีใครถูกไล่ออก คุยได้แล้วโหวตรอบ 2 ผลสุดท้ายนับรอบ 2
- `status` n20 `📟 หน้าสถานะล่มไปด้วย`: สรุปผลเมื่อคืนไม่ถูกประกาศ เห็นแค่ชื่อคน Burnout · วิศวกรเวร 1 คน (สุ่ม ไม่บอกชื่อ) ได้สรุปลับ · หลอด Mana ยังเห็นปกติ
None has `now` or `choice`.
