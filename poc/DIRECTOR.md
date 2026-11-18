# Director — API ของฉาก 3D (ก่อนต่อ engine)

`poc/director.js` คือ **ชั้นแสดงผลล้วน** ของฉาก 3D: ไม่มีกติกาเกมอยู่ในนั้น รับ "ผลที่ตัดสินแล้ว" มาเล่นเอฟเฟกต์เท่านั้น
`poc/office3d-full.html` คือฉาก + **mock resolver** (สุ่มผลเองด้วยกติกาแบบย่อ) ที่เรียก Director — ตอนต่อ engine จริงให้เปลี่ยนเฉพาะส่วน mock resolver (บล็อก "Glue + MOCK RESOLVER")

ชื่อ key ทั้งหมดตรงกับ `app/src/shared/data.js` (`ROLES`, `EVENTS`, `TRAPS`, `BOOSTERS`) และภาพการ์ดมาจาก `app/public/thumbs/`

```js
const D = createDirector({ THREE, scene, camera, desks, N, NAMES, ROLE, ROLES, EVENTS, TRAPS, BOOSTERS, FCOL, THUMB, board, assets, ui });
// ในลูป render:  D.update(dt, t);  …แล้วก่อน composer.render():  D.postCamera();
// ในไฟ: intensity *= D.state.lightMul     ในจอคัมภีร์ของผู้เล่น: color = d.fxColor || สีตามเฟส
```

`desk` = ตัวผู้เล่นในฉาก (หรือ index ของมัน) — ตอนต่อ engine map จาก `player.id`

## 🎭 Skill — `D.playSkill(roleKey, { caster, targets, result })`

| roleKey | targets | result | เอฟเฟกต์ |
| :-- | :-- | :-- | :-- |
| `senior_dev` | [เป้า] | `{ bug }` | ยิงแสง + 🔍 สแกน, ฟองลับ "ส่งงานจริง/แอบวางบั๊ก" |
| `oracle_pm` | [เป้า] | `{ barrierBroke }` | โดมบาเรีย; ถ้าบาเรียแตกโดมแดงแตก + "มีออร่ามืด!" |
| `qa_hunter` | [เป้า 2 คน] | `{ hasDark }` | ยิงสองทาง + 🔎 |
| `rune_ux` | [เป้า] | `{ reveal:[desk…] }` | วงรูนที่พื้นหน้าเป้า; เฉลยชื่อตอนเช้า (`D.skillMorning`) |
| `data_oracle` | – | `{ targets:[idA,idB], result:{ same } }` | เส้นเชื่อมระหว่างสองเป้าหมาย 🔗 (ทีมเดียวกัน) / ⛓️‍💥 (คนละทีม) |
| `chrono_tech_lead` | – | – | นาฬิกายักษ์หมุนย้อน + คลื่นทอง |
| `coffee_admin` | [เป้า] | – | ☕ บินไปฮีล + 💚 + ป้าย ☕×2 |
| `shadow_hr` | [เป้า] | `{ role }` | 👁 + ป้าย 0️⃣, ฟองลับเห็นบทบาท |
| `mystery_intern` | – | `{ copied, source, targets, result }` | 👻 ก๊อปจากเพื่อนขวามือ แล้วเล่นสกิลที่ก๊อปซ้อน |
| `illusionist_sales` | [เป้า] | – | 🎭 + ป้าย 🎭 |
| `chaos_scrum` | [a, b] | – | ยิงสองคน + 🔀 สลับกัน |
| `shadow_legal` | [เป้า] | – | โซ่ ⛓️ พันเป้า + ป้าย 🔇 |
| `chaos_devops` | – | – | ป้ายแดง DEPLOY ON FRIDAY, จอฝ่ายแสงกระพริบแดง, โดมบาเรียแตกหมด |
| `severance_seeker` | – | – | 🐛 กระจาย + ป้าย 🐛 +1 |
| `soul_recruiter` | [เป้าลับ] | `{ mode:'peek'\|'push', votedFor }` | 📞/🤝 ยัด +1 หรือ 👁 แอบส่อง |
| `glory_thief` | [เป้า] | `{ stolen }` | 🏅 ขโมยเครดิตบินกลับ |
| `chaos_intern` | – | `{ note }` | 📧 บินขึ้นจอ + แคปชันประกาศโดยไม่ระบุชื่อ |

กลางคืนเป็นความลับ: ฟองผลลัพธ์และเอฟเฟกต์ส่วนตัวแสดงเฉพาะเมื่อ `ui.secrets()` เป็นจริง (มุมมอง Moderator)

## 🎴 Event — `D.playEvent(eventKey, payload)`

payload = `{ accepted?, votes?:[{desk,yes}], targets?, result?, mana?, note? }`

| ชนิด | key | ใช้ payload |
| :-- | :-- | :-- |
| ปรับ Mana ทันที | `approve` `angry` | `mana` (ค่าหลังปรับ) |
| โหวตรับ/ปฏิเสธ | `scope` `ot` `prod` `bonus` | `votes`, `accepted`, (`ot`/`prod` ใส่ `mana`; `prod` รับ → `targets:[คนที่ได้คุ้มกัน]`) |
| ผลคืนนี้ | `down` `restart` `watch` `blackout` `snack` `marathon` `redesign` `purge` `status` | – |
| เลือกคน | `audit` `hotdesk`(2) `leak`(2, `result.same`) `hands`(n) `uat`(3, `result.hasDark`) | `targets`, `result` |

ทุกใบมี: การ์ดจริงตกลงมา → แคปชัน → ป้าย stamp → เอฟเฟกต์เฉพาะใบ → ชิปสถานะมุมขวา

## 🪤 Trap

- `D.trapPlace(trapKey, { owner, target? })` — ลับ: เห็นเฉพาะ Moderator (ลายรูน + ไอคอน + มินิการ์ด)
- `D.trapTrigger(trapKey, { owner, target?, inspector?, victim?, mana? })` — สาธารณะ: ประกาศ**ชื่อ**เท่านั้น (การ์ดคว่ำถ้าไม่ใช่ Moderator) แล้วเล่นเอฟเฟกต์เฉพาะใบ

`blame` (ตรา SKIP) · `honeypot` (🐝 + ข้อมูลปลอมที่ `inspector`) · `alibi` (กระจกแตก + วงสีเปลี่ยนเป็นฝ่ายแสง) · `hijack` (แถบเวลาลด 30% + `victim` ถูก Skip) · `insurance` (ร่มทอง) · `exit` (ประตูกลที่ `target` + `mana`)

## 🚀 Booster — `D.playBooster(boosterKey, { note?, result? })`

`scanner` (เรดาร์กวาดพื้น, `result.trapFound`) · `retro` (นาฬิกาย้อน) · `freeze` (น้ำแข็งครอบแท่น + โดมฟ้าที่ฝ่ายแสง)
การโหวตใช้ `D.showVotes([{desk, yes, label?}])` — engine โหวตแบบเลือก 1 ใน 3 ใบหรือ "ไม่เปิด" (เสมอ/ไม่เปิดมากสุด = ไม่เปิดใช้) mock ทำตามนั้นแล้ว

## ต่อ engine ต้องเพิ่มอะไร

engine ปัจจุบัน (`night-resolve.js`, `events.js`, `vote.js`) ส่งผลออกมาเป็น**ข้อความ** (`notes`, `report`, `timeline`) ยังไม่มีข้อมูลแบบโครงสร้างที่ Director ต้องใช้ จึงต้องเพิ่มขั้นเดียว:

1. ใน `resolveNight` / `closeEventVote` / `closeBoosterVote` / ตอน Trap ทำงาน ให้ `G.fx.push({ kind, key, caster, targets, result, … })` ตามตารางข้างบน (ใช้ `player.id` แทน desk)
2. ส่ง `G.fx` ผ่าน `modView` (ส่งให้ Moderator เท่านั้น — ผลลับของสกิลห้ามส่งให้ผู้เล่น)
3. ฝั่งหน้า `/mod` แทนที่บล็อก mock resolver ด้วยตัวอ่าน `fx` แล้วเรียก `D.playSkill / playEvent / trapPlace / trapTrigger / playBooster` ตามลำดับ (เล่นทีละอัน รอ `await` จบก่อนอันถัดไป)
4. `ui.setMana`, `ui.badge`, ป้ายสถานะ ใช้ค่าจาก state จริงของ engine แทนที่ Director จะเดาเอง
