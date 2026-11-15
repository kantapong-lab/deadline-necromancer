# Design: event-cards-16-20 (text spec, no canvas)
Canvas: none (text spec). Rendered spec page: https://claude.ai/artifact/F3wSDVnyuTYMdQZ7iiecV3

Scope: 5 small UI changes. No new design system, no new tokens, no new CSS file. Reuse `app/public/style.css` classes only. All copy is Thai, tone = existing cards (casual office jokes + emoji prefix). Copy marked [FE] is final text; engine may substitute `{names}` / `{n}`.

Existing classes reused: `.chips`/`.chip`, `.hint`, `.bad`, `.report`, `.votes`, `.card.stage`, `.msg.sys` (feed line), `.btn`/`.btn.primary`/`.bigbtn`, `.targets`, `.intel`, `.banner`. At most ONE new CSS rule is allowed, and only if the chip needs a warning colour: use the existing `.bad` class on the chip text instead, so zero new rules.

## 0. Event card text (data.js EVENTS n:16-20, shown by `eventCardHTML` with no change)
| n | img | t | d |
|---|---|---|---|
| 16 | 16_meeting_purge.jpg | ✂️ ล้างประชุมประจำ | วันนี้ทุกคนพิมพ์ได้แค่ 3 ข้อความ ข้อความละไม่เกิน 30 ตัวอักษร (อีโมจิไม่นับ) ฝ่ายมืดคุยในห้องลับได้ไม่จำกัด |
| 17 | 17_more_hands_on_deck.jpg | 🧑‍🤝‍🧑 ทีมเสริมมาช่วย | ระบบสุ่มผู้เล่นบางคนเป็น "ทีมเสริม" คะแนนโหวตของพวกเขาวันนี้นับเป็น 0 (ยังโหวตและถูกโหวตได้) ประกาศชื่อทุกคน |
| 18 | 18_uat_too_late.jpg | 🔎 ทดสอบก่อนส่งงานไม่กี่วัน | หลังปิดโหวต ระบบสุ่มตรวจ 3 คนที่ยังอยู่ แล้วประกาศว่า "มีฝ่ายมืดอย่างน้อย 1 คน" หรือ "ไม่มีฝ่ายมืด" (ไม่บอกว่าใคร) |
| 19 | 19_client_redesign.jpg | 🗳️ ลูกค้าขอแก้ดีไซน์ | วันนี้โหวต 2 รอบ รอบแรกเห็นแค่คะแนนรวม (ไม่เห็นว่าใครโหวตใคร) ไม่มีใครถูกไล่ออก แล้วโหวตรอบสองตัดสินจริง |
| 20 | 20_status_page_down.jpg | 🛠️ หน้าสถานะล่มไปด้วย | เช้านี้ไม่มีรายงานสาธารณะ เห็นแค่ชื่อคนที่ Burnout มีวิศวกรเวร 1 คน (สุ่ม ไม่บอกชื่อ) ได้รับสรุปเมื่อคืนแบบลับ |

Card title numbers (#16..#20) come from `ev.n`, no UI change.

## 1. #16 remaining-count chip (index.html `chatBar()` area, player view)
Placement: inside card "แชทกลาง", between `.chat` and the `.chatbar` form: `<div class="chips"><span class="chip">…</span></div>`.
Show only when `S.event.n===16`, player alive, not hidden by silenced. Hidden on all other days (AC-7).

| State | Chip text [FE] | Input | Notes |
|---|---|---|---|
| start / n=3 | `✂️ พิมพ์ได้อีก 3/3 ข้อความ · ไม่เกิน 30 ตัวอักษร` | enabled, placeholder `พิมพ์ข้อความ… (ไม่เกิน 30 ตัวอักษร)` | |
| n=1..2 | `✂️ พิมพ์ได้อีก {n}/3 ข้อความ · ไม่เกิน 30 ตัวอักษร` | enabled | updates from next state broadcast after a post |
| n=1 (last) | same text, chip text wrapped in `.bad` | enabled | warns last message |
| n=0 | `✂️ โควตาข้อความหมดแล้ว (0/3) — ส่งอีโมจิได้เท่านั้น` (`.bad`) | text input `disabled`, placeholder `โควตาหมดแล้ว — ส่งได้แค่อีโมจิ` | emoji buttons stay enabled (exempt) |
| silenced (NDA) | chip still shown; input placeholder stays existing `🤐 ถูกปิดปาก — ส่งได้แค่อีโมจิ` | existing disabled | existing behaviour wins, chip text unchanged |
| rejected: too long | none in chip; inline below chatbar: `<div class="hint bad">ข้อความยาวเกิน 30 ตัวอักษร (พิมพ์มา {len}) ไม่ถูกส่งและไม่เสียโควตา</div>` | text is RESTORED into the input, not cleared, so the player can shorten it | needs a small change to `sendChat` (today it clears before send). Never truncate silently |
| rejected: quota gone | inline `<div class="hint bad">โควตาข้อความวันนี้หมดแล้ว</div>` | | |
| dead / spectator | chip hidden | existing | |
| dark chat (`#darkIn`) | no chip | unchanged | unlimited |

Inline error auto-clears on next keystroke or after 4 s. Counting is by code points; the client shows `{len}` using `Array.from(t).length`, excluding EMOJIS entries.
Mobile: chip wraps (`.chips` is flex-wrap); chat tab unchanged.

## 2. #19 interim vote screen (index.html `s.phase==='VOTE_INTERIM'`)
New branch next to `VOTE_RESULT` in the stage switch. Reuse `.card.stage` + `.votes`. Chat card below stays visible and usable (AC-23).

Player, alive or dead (same view; dead player also has `deadBanner`):
```
<div class="card stage">{deadBanner}
  <h2>📊 คะแนนโหวตรอบแรก</h2>
  <p>ยังไม่มีใครถูกไล่ออก · เห็นแค่คะแนนรวม ไม่เห็นว่าใครโหวตใคร คุยกันต่อแล้วรอผู้ดำเนินเกมเปิดโหวตรอบสอง</p>
  <div class="votes">{name} — {n} คะแนน<br>… <br>⏭️ Skip — {n}</div>
  <p class="hint">โหวตรอบแรกของคุณยังนับอยู่ ถ้าไม่โหวตใหม่ในรอบสอง</p>   (alive & voted only)
  {waitMod('รอเปิดโหวตรอบสอง')}
</div>
```
Rules: list every candidate with >=1 vote, highest first; candidates with 0 are omitted; if nobody voted the `.votes` line is `ยังไม่มีใครโหวต`. Skip line always shown. Format "N คะแนน" (weighted), no voter names, no marks for who voted for whom. Plural not needed in Thai.
Top bar `.phase` label: `🗳️ พักรอบโหวต` (add to existing phase-label map in common.js, same place as the other phases).

Round labels on the existing VOTE screen when #19 active:
| Round | h2 | extra line |
|---|---|---|
| 1 | `🗳️ PIP Vote รอบแรก — ไล่ใครออก?` | `<p>` appended: ` · รอบแรกยังไม่ไล่ใครออก เห็นคะแนนรวมก่อนโหวตรอบสอง` |
| 2 | `🗳️ PIP Vote รอบสอง — ไล่ใครออก?` | `.hint` above `.targets`: `โหวตรอบแรกของคุณ ({target name | Skip}) ยังนับอยู่ กดเลือกใหม่เพื่อเปลี่ยน` (only if the player voted in round 1); `voted` line unchanged |
Silenced / hijacked / dead branches unchanged (their text still applies to both rounds). Confirm button stays `ยืนยันโหวต`; in round 2 pre-select the round-1 choice (`UI.voteSel`) so pressing confirm is optional.

## 3. #19 moderator buttons (mod.html `ACTIONS`)
Same big primary button slot (`.btn.primary.bigbtn`), no new layout. Normal timing controls (`timers`, pause) unchanged and apply to each round.
| Phase | Label [FE] | act |
|---|---|---|
| VOTE, #19 active, round 1 | `ปิดโหวตรอบแรก (ยังไม่ไล่ใคร)` | `closeVote` |
| VOTE_INTERIM | `เปิดโหวตรอบสอง →` | new act `openRound2` (name FE/BE may change) |
| VOTE, #19 active, round 2 | `ปิดโหวตและประกาศผล` (existing) | `closeVote` |
| VOTE (not #19) | existing | existing |
VOTE_INTERIM: mod `g.title` = `พักรอบโหวต — คะแนนรอบแรก`; guidance text `แจกจ่ายให้ผู้เล่นคุยกันก่อน แล้วกด "เปิดโหวตรอบสอง"`; mod stage also shows the same `.votes` list (counts only, no voter names — mod public broadcast must not leak names; secrets toggle does not reveal them in this phase). `progress(pd.vote,…)` label becomes `โหวตรอบแรก` / `โหวตรอบสอง`. Public feed `.msg.sys` line on entering interim: `📊 ปิดโหวตรอบแรกแล้ว — ยังไม่มีใครถูกไล่ออก` and on opening round 2: `🗳️ เปิดโหวตรอบสอง — โหวตเดิมยังนับอยู่`.

## 4. Public messages (feed `.msg.sys`, existing `feedHTML`; no new component)
| Card | When | Text [FE] |
|---|---|---|
| #17 | on draw, after event announcement | `🧑‍🤝‍🧑 ทีมเสริมวันนี้: {A}, {B} — คะแนนโหวตของพวกเขาวันนี้นับเป็น 0 (ยังโหวตและถูกโหวตได้)` |
| #18 | right after the ejection/vote-result lines, before game-over banner | `🔎 UAT ตรวจ {A}, {B}, {C} — มีฝ่ายมืดอย่างน้อย 1 คน` or `🔎 UAT ตรวจ {A}, {B}, {C} — ไม่มีฝ่ายมืด` |
| #18, <3 alive | same line with all alive names | e.g. `🔎 UAT ตรวจ {A}, {B} — ไม่มีฝ่ายมืด` |
| #20 | morning report | Burnout line exactly as today (names), then `🛠️ Status Page ล่ม — มีวิศวกรเวร 1 คนได้รับสรุปเมื่อคืน (ไม่บอกชื่อ)`. No curse-blocked / bug / Mana / trap lines publicly |
Names joined with `, `. Zero-weight players also keep the existing mod-only `📉0` tag (mod.html `extraTags`); no new public tag.

## 5. #20 on-call engineer private note and moderator view
- On-call player: appears in "ข้อมูลลับของคุณ" (`.intel div`, existing). Text [FE]: `🛠️ คุณคือวิศวกรเวร — สรุปเมื่อคืน: {line1} · {line2} · …` (full report lines joined with ` · `). Heading small tag `วัน{dayName}` is existing. Empty report → `🛠️ คุณคือวิศวกรเวร — เมื่อคืนไม่มีอะไรผิดปกติ`.
- Mana bar: no change (already visible to everyone in top bar); confirms AC-32 with no work.
- Moderator view: the full report stays in the existing morning `.report` block, prefixed `🛠️ รายงานเต็ม (เฉพาะผู้ดำเนินเกม + วิศวกรเวร):`. The on-call identity is NOT shown on the mod screen (keeps one data path with no public leak; mod can see it under `secrets` if the BE already exposes intel). The public morning screen never receives the full lines.
- Chaos Intern Reply All leak (AC-35): no UI; existing note path.

## 6. Gallery (gallery.html, card-info.js)
- gallery.html:63 title `Event Card (15 ใบ)` -> `Event Card (20 ใบ)`; items already built from EVENTS, so #16-#20 appear and use the existing lightbox. Images from docs/event_cards (existing path); `onerror` fallback unchanged.
- card-info.js `CARD_INFO.events` add 5 keys (event keys decided by BE; one/what/when/tip, same shape as `blackout`/`audit`):
  - purge: one `ทุกคนพิมพ์ได้แค่ 3 ข้อความ ข้อความละไม่เกิน 30 ตัวอักษร` / what `ประชุมตัดบท วันนี้แชทกลางมีโควตา 3 ข้อความต่อคน อีโมจิไม่นับ ข้อความที่ยาวเกินจะถูกปฏิเสธ ไม่ใช่ตัดให้` / when `มีผลเฉพาะวันที่เปิดการ์ด` / tip `ฝ่ายมืดคุยกันในห้องลับตอนกลางคืนได้ไม่จำกัด ส่วนฝ่ายแสงต้องเลือกคำพูดให้คุ้ม`
  - hands: one `ผู้เล่นบางคนโหวตนับเป็น 0 วันนี้` / what `ระบบสุ่มทีมเสริมจำนวน 1 ใน 4 ของคนที่ยังอยู่ (อย่างน้อย 1 คน) ประกาศชื่อทุกคน คะแนนโหวตของพวกเขานับ 0 แต่ยังโหวตและถูกโหวตได้` / when `มีผลเฉพาะวันที่เปิดการ์ด` / tip `ถ้าคุณเป็นทีมเสริม เสียงของคุณไม่นับ ใช้การคุยโน้มน้าวคนอื่นแทน`
  - uat: one `หลังโหวตมีการสุ่มตรวจ 3 คนว่ามีฝ่ายมืดไหม` / what `หลังปิดโหวตและไล่ออกแล้ว ระบบสุ่ม 3 คนที่ยังอยู่ แล้วประกาศความจริงว่ามีฝ่ายมืดอย่างน้อย 1 คนหรือไม่ โดยไม่บอกว่าใคร` / when `ประกาศก่อนตัดสินว่าเกมจบหรือไม่` / tip `ผลนี้เชื่อได้เสมอ ไม่ถูกบิดด้วย Honeypot หรือ Alibi`
  - twoRound: one `โหวต 2 รอบ รอบแรกเห็นแค่คะแนนรวม` / what `รอบแรกไม่มีใครถูกไล่ออก ทุกคนเห็นแค่คะแนนรวมแต่ไม่เห็นว่าใครโหวตใคร ผู้ดำเนินเกมกดเปิดรอบสอง โหวตเดิมยังนับอยู่ถ้าไม่เปลี่ยน` / when `มีผลเฉพาะวันที่เปิดการ์ด` / tip `ใช้ช่วงพักคุยเปลี่ยนใจคนอื่นก่อนรอบสอง`
  - statuspage: one `เช้านี้ไม่มีรายงานสาธารณะ มีแค่วิศวกรเวร 1 คนที่รู้` / what `ซ่อนรายงานเมื่อคืน (คำสาปที่ถูกกัน บั๊ก Mana กับ Trap) เหลือแค่ชื่อคนที่ Burnout ระบบสุ่มวิศวกรเวร 1 คนให้ได้รับสรุปแบบลับ ไม่บอกชื่อ` / when `มีผลเฉพาะเช้าวันที่เปิดการ์ด` / tip `ถ้าคุณคือวิศวกรเวร ใช้ข้อมูลโดยไม่เปิดเผยตัวมากเกินไป`
  (Thai text is a draft; tone review is AC-44.)

## States checklist
| Screen | loading | empty | error | success | notes |
|---|---|---|---|---|---|
| #16 chip | n/a | n=0 state | too long / quota | n shown | rejection never clears input |
| #19 interim | `waitMod` hint | `ยังไม่มีใครโหวต` | n/a | counts list | no voter names |
| mod buttons | disabled while paused (existing) | n/a | n/a | n/a | one primary button per phase |
| feed lines | n/a | n/a | n/a | n/a | plain `.msg.sys` |

## Accessibility and mobile
- Chip and inline errors are text, not colour-only (`.bad` plus words); chip region `aria-live="polite"` is optional, no new roles.
- Touch targets use existing `.btn` min-height 44px on mobile; mod button is `.bigbtn` and inside existing `.stickybar` if present.
- No new images, icons or fonts beyond emoji already used.

## Open items for FE/BE
1. `sendChat` must keep text on rejection (needs ack error code e.g. `too_long` / `quota`).
2. Phase-label map entry for `VOTE_INTERIM` in common.js.
3. mod public broadcast during `VOTE_INTERIM` carries counts only (AC-21).
4. Event img filenames for 16-20 follow docs/event_cards; confirm exact names.

## AC id → artboard
This task has no Claude Design canvas: the UI is five small changes on existing styles. Each AC maps to the section of this spec that shows it (published as a rendered page, see the link below). `n/a` = engine, test or docs AC with no screen.
| AC | Section |
|---|---|
| AC-1 | §1 chip, n=3 and n=1..2 states |
| AC-2 | §1 chip, rejected too long |
| AC-3 | §1 chip, rejected quota gone and n=0 |
| AC-4 | §1 chip, emoji exempt (n=0 row) |
| AC-5 | §1 chip, dark chat row |
| AC-6 | §1 chip, silenced (NDA) row |
| AC-7 | §1 chip placement and states |
| AC-8 | §1 counting note |
| AC-9 | §4 #17 public message |
| AC-10 | §4 #17 public message |
| AC-11 | n/a engine (vote weight) |
| AC-12 | n/a engine (night reset) |
| AC-13 | n/a engine (k for 3 alive) |
| AC-14 | §4 #18 public message |
| AC-15 | n/a engine (truthful result) |
| AC-16 | n/a engine (pool after ejection) |
| AC-17 | §4 #18 placement before game-over banner |
| AC-18 | §4 #18 with fewer than 3 alive |
| AC-19 | n/a engine (no #18 side effects) |
| AC-20 | §2 interim vote screen |
| AC-21 | §2 interim vote screen (counts only) |
| AC-22 | n/a engine (no round-1 side effects) |
| AC-23 | §2 interim screen, chat card stays |
| AC-24 | §3 moderator buttons |
| AC-25 | §2 round 2 hint and pre-selected vote |
| AC-26 | n/a engine (round-2-only effects) |
| AC-27 | §3 moderator buttons |
| AC-28 | n/a engine (non-#19 days unchanged) |
| AC-29 | §4 #20 morning report |
| AC-30 | §4 #20 morning report |
| AC-31 | §5 on-call private note |
| AC-32 | §5 moderator view and Mana bar |
| AC-33 | n/a engine (report classification) |
| AC-34 | n/a engine (non-#20 nights unchanged) |
| AC-35 | §5 Reply All, no UI |
| AC-36 | §0 event card text |
| AC-37 | n/a test |
| AC-38 | n/a test |
| AC-39 | n/a balance run |
| AC-40 | n/a docs |
| AC-41 | n/a docs |
| AC-42 | §6 gallery |
| AC-43 | n/a commit |
| AC-44 | §0 and §6 Thai copy |
