# deadline-necromancer-pitch — Requirement

> ปัญหา: ต้องการข้อมูล business สำหรับ pitch เกม Deadline Necromancer (ยังไม่มีข้อมูลตลาด/คู่แข่ง/โมเดลรายได้)
> สำหรับ: ผู้เล่นและชุมชน (ไม่ใช่นักลงทุน)
> ต้องการรู้: ตลาดเกมปาร์ตี้/social-deduction ภาษาไทย, คู่แข่ง, กลุ่มผู้เล่น, จุดขาย, ช่องทางเข้าถึงชุมชน

## Problem

> "สร้างข้อมูล business ที่ใช้สำหรับ pitch" [given]

- สินค้า: "Deadline Necromancer" เกมปาร์ตี้ social-deduction (สไตล์ Werewolf/Mafia) ภาษาไทย ธีมออฟฟิศ/Sprint [given]
- 3 ฝ่าย: Light (วิศวกร, Team Deliver) vs Dark (ลัทธิอู้งาน, Cult of Burnout) vs Independent (Severance Seekers) [given]
- กลไก: หลอด Mana Task, วันจันทร์–ศุกร์, โหวตไล่ออกตอนกลางวัน, แอ็กชันลับตอนกลางคืน, Event Card 20 ใบ, Trap Card, Sprint Booster [given]
- ผู้เล่น 6–12 คน; มีหน้าจอ Moderator (2D + 3D) และมือถือผู้เล่น รันบนเซิร์ฟเวอร์ Node/socket.io [given]
- ยังไม่มีข้อมูลธุรกิจ (ตลาด ขนาด คู่แข่ง รายได้) ในรีโป — ต้องวิจัยเพิ่ม [assumed]

## Target users

- ผู้เล่นและชุมชนเกมปาร์ตี้ (ไม่ใช่นักลงทุน) [given]
- กลุ่มที่น่าจะเกี่ยวข้อง: คนทำงานออฟฟิศ/สาย IT ชาวไทย ที่เล่นเกมวงสังคมกับเพื่อน/ทีม [assumed]
- ธีมงาน/Deadline เป็นจุดเชื่อมกับกลุ่มคนทำงาน [assumed]

## Market scope

- ประเทศไทย เป็นตลาดหลัก (เกมและ deck เป็นภาษาไทย) [assumed]
- อ้างอิงตลาด social-deduction ระดับโลกเป็นบริบทเท่านั้น (เช่น Werewolf, Among Us, Town of Salem) ไม่เจาะตลาดต่างประเทศ [assumed]

## Goal

- ได้ชุดข้อมูล business ที่ใช้ทำ pitch deck ให้ผู้เล่น/ชุมชน: ขนาดและพฤติกรรมกลุ่มเป้าหมาย, คู่แข่ง/ของทดแทน, จุดขายที่แตกต่าง, ช่องทางเข้าถึงชุมชน, แนวทางสร้างรายได้/ต้นทุน (ถ้ามี) [assumed]
- KPI ที่ต้องการขยับ (เช่น จำนวนผู้เล่นทดลอง, สมาชิกชุมชน) ไม่ได้ระบุ [assumed]
- เป้าหมายของ pitch (ดึงผู้ทดลองเล่น / สร้างชุมชน / หา playtester) ไม่ได้ระบุ [assumed: ดึงผู้ทดลองเล่นและสร้างชุมชน]

## Constraints

- งบ เวลา ข้อกำกับ: none stated [given]
- ข้อมูลผลิตภัณฑ์ต้องตรงกับ docs/deadline_necromancer_player_rules.md และ docs/deadline_necromancer_design.md (เช่น ฝ่ายมืด 2 คนทุกขนาดห้อง, manaMax = floor(N/2)+1 ตาม commit ล่าสุด, ไม่มีโหวตไล่ออกวันจันทร์) — ห้ามแต่งกติกาเอง [assumed]
- ตัวเลขจากบอทจำลอง (หลังแก้กติกา ฝ่ายแสงชนะประมาณ 28–41%) ใช้เป็นแนวทางภายในเท่านั้น ไม่ใช่ข้อมูลผู้เล่นจริง และไม่ควรขึ้นสไลด์ [given]
- หมายเหตุ: เอกสารผู้เล่นยังเขียน ManaMax = floor(N/2) ขณะที่ commit ล่าสุดเปลี่ยนเป็น floor(N/2)+1 — ใช้ค่าหลังสำหรับ deck [assumed]

## Audience

- ผู้เล่นและชุมชน ไม่ใช่นักลงทุน [given]

## Deck language

- ไทย (คงศัพท์อังกฤษของเกม เช่น Mana Task, Sprint, Light/Dark) [given]

## Research depth

- `standard` — ผู้ใช้ระบุ "moderate" [given]; ผลิตภัณฑ์ใหม่ กลุ่มผู้ฟังเป็นชุมชน ไม่ใช่นักลงทุน/ข้อมูลส่วนบุคคล จึงไม่ต้อง deep

## Out of scope

- การเงินระดับนักลงทุน (valuation, ตาราง cap, ประมาณการ ROI) [assumed]
- การเปลี่ยนกติกา/บาลานซ์เกม และการพัฒนาฟีเจอร์ใหม่ [assumed]
- ตลาดต่างประเทศเชิงลึกและการแปลภาษา [assumed]

## Assumptions

1. Market scope: ไทยเป็นหลัก อ้างอิงตลาดโลกเป็นบริบท [assumed]
2. Target users: คนทำงานออฟฟิศ/สาย IT ชาวไทยที่เล่นเกมวงสังคม [assumed]
3. Goal: ดึงผู้ทดลองเล่นและสร้างชุมชน; ไม่มี KPI ตัวเลข [assumed]
4. Constraints: ไม่มีงบ/เวลา/ข้อกำกับ; ใช้กติกาตามเอกสารในรีโปและ commit ล่าสุด (manaMax = floor(N/2)+1) [assumed]
5. Out of scope: การเงินนักลงทุน, การเปลี่ยนกติกา, ตลาดต่างประเทศเชิงลึก [assumed]
6. Research depth `standard` แมปจาก "moderate" ของผู้ใช้ [assumed]
7. ไม่มีข้อมูลธุรกิจเดิมในรีโป (ไม่ได้อ่านครบทุกไฟล์; อ่านเฉพาะ player rules และ README หัวข้อ) [assumed]

## Open questions

- ไม่มีคำถามที่ต้องถามผู้ใช้ (ผู้ใช้สั่งไม่ให้ถามเพิ่ม); ช่องว่างทั้งหมดใส่ default ด้านบน ตรวจที่ gate 1
- (ไม่บล็อก) โมเดลรายได้ที่ต้องการ: ฟรี/ขายขาด/อื่น ๆ — ใช้ default: ครอบคลุมทางเลือกกว้าง ๆ ในงานวิจัย [assumed]
