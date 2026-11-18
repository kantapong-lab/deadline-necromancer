# Deadline Necromancer — Multiplayer (Node + Socket.IO)

เกมเล่นหลายคนผ่านเว็บ พร้อมหน้าจอ Moderator (Host ที่ไม่ได้เล่น คุมจังหวะเกม) ใช้กติกาตาม `../docs/`

## รัน
```bash
cd app
npm install
npm start          # http://localhost:3000
```
- **Moderator:** เปิด `http://<เครื่อง host>:3000/mod` → กด "สร้างห้องใหม่" จะได้รหัสห้อง 4 ตัวอักษร
- **ผู้เล่น (6–12 คน, ไม่มีบอท):** เปิด `http://<เครื่อง host>:3000/` ใส่รหัสห้องและชื่อ (หรือใช้ลิงก์ `/?room=ABCD` จากหน้า Moderator)
- ผู้เล่นอยู่ในวง LAN/Wi-Fi เดียวกันใช้ IP ของเครื่อง host แทน `localhost`
- **แกลเลอรีการ์ด:** `http://<เครื่อง host>:3000/gallery` ดูรูปการ์ดบทบาท (17 ใบ), Trap Card (6 ใบ), Sprint Booster (3 ใบ) และ Event Card (20 ใบ) พร้อมคำอธิบาย กดดูภาพขยายและเลื่อนด้วยปุ่ม ← →

## Moderator ทำอะไรได้
- เห็น **ลำดับเหตุการณ์** (timeline) ว่าเกมดำเนินไปถึงไหน และการ์ด **"ตอนนี้ / สิ่งที่ต้องแจ้งผู้เล่น / ขั้นตอนถัดไป"**
- กดเปลี่ยนเฟส: ไปเฟสโหวต → ปิดโหวตและประกาศผล → เข้ากลางคืน → ปิดกลางคืนและประมวลผล (ดูว่าใครยังไม่โหวต/ยังไม่ส่งแอ็กชัน)
- ปิดโหวตการ์ดเหตุการณ์ / Sprint Booster, ตั้งตัวจับเวลา (แสดงนับถอยหลังให้ผู้เล่น ไม่เปลี่ยนเฟสอัตโนมัติ), พักเกม, ประกาศข้อความ, เตะผู้เล่นในล็อบบี้
- สลับ "แสดงข้อมูลลับ" เพื่อดูบทบาท/Trap/แอ็กชันกลางคืนของทุกคน (ปิดไว้เป็นค่าเริ่มต้น)

## โครงสร้าง
| ไฟล์ | หน้าที่ |
| :--- | :--- |
| `src/server/index.js` | จุดเริ่มระบบ (`npm start`): สร้าง HTTP + Socket.IO, ต่อ handler, listen · export `{ httpServer, io, rooms }` |
| `src/server/paths.js` | path ทั้งหมดของ server คำนวณจาก `APP_ROOT` ที่เดียว (ไม่ขึ้นกับ cwd) |
| `src/server/http.js` | เสิร์ฟไฟล์ static และตาราง URL (`/`, `/mod`, `/gallery`, `/data.js`, `/docs/*.jpg\|png`) — URL สาธารณะห้ามเปลี่ยน |
| `src/server/rooms.js` | ที่เก็บห้อง (room), รหัสห้อง/token, lobby view, `pushState` |
| `src/server/handlers/` | socket handler: `session.js` (สร้าง/เข้าห้อง, reconnect ด้วย token, disconnect) · `moderator.js` (`mod:do`) · `player.js` (`p:*`) · `voice.js` (`voice:on`, `v:sig`, `syncVoice`) |
| `src/engine/index.js` | ทางเข้า engine: export `{ Game, COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS }` |
| `src/engine/game.js` | คลาส `Game` (state + helper) และรวม method จากไฟล์ด้านล่างด้วย `mixin` (ชื่อซ้ำจะ throw) |
| `src/engine/{chat,events,vote,night-input,night-resolve,phases,win,views,mod-view}.js` | กติกาเกมแยกตามหน้าที่ (server-authoritative) · ส่งข้อมูลลับเฉพาะคนผ่าน `viewFor(pid)` / `modView()` · ลำดับ `Math.random` เป็นส่วนหนึ่งของพฤติกรรม ห้ามสลับ |
| `src/engine/{constants,random}.js` | จำนวนผู้เล่น/สัดส่วนฝ่าย/อีโมจิ · `shuffle`, `rnd` |
| `src/shared/data.js` | ข้อมูลบทบาท/การ์ด ใช้ร่วม server กับ client (เสิร์ฟที่ `/data.js`) |
| `public/index.html` · `public/mod.html` · `public/gallery.html` | หน้าผู้เล่น / หน้า Moderator / แกลเลอรี |
| `tools/gen-cert.js` · `test/voice.js` | สร้างใบรับรอง self-signed สำหรับ HTTPS · ทดสอบ voice (canSpeak, relay gate, HTTPS) |
| `test/simulate.js` | ทดสอบ end-to-end ด้วย Moderator + ผู้เล่น 6–12 คน |
| `test/golden/` | golden-master ของ engine (เกมสุ่มแบบ seed ~100 เกม เทียบ hash กับ `snapshot.json`) — `node test/golden/run.js` (`--record` เฉพาะเมื่อเปลี่ยนกติกาจริง) |
| `test/http-parity.js` · `test/mod-actions.js` | ตรวจ URL สาธารณะ (status/content-type/body) และคำสั่ง Moderator/ห้องผ่าน socket เทียบกับไฟล์ `.json` |

ผู้เล่นที่รีเฟรช ปิดแท็บ หรือหลุดการเชื่อมต่อ เข้ากลับที่นั่งเดิมได้เองด้วย token ที่เก็บใน `localStorage` (ผูกกับรหัสห้อง) เมื่อเกมเริ่มแล้วจะไม่รับผู้เล่นใหม่และไม่รับช่วงที่นั่งด้วยชื่ออีก ผู้เล่นที่ล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่องจะกลับเข้าไม่ได้ ถ้าต้องเปิดหลายแท็บในเครื่องเดียวเพื่อทดสอบ ให้เติม `?tab=ชื่อ` ต่อท้าย URL (เช่น `/?room=ABCD&tab=2`) เพื่อแยก token ต่อแท็บ

**รหัสผ่าน Moderator:** ตั้งตัวแปรสภาพแวดล้อม `MOD_PASSWORD` ก่อนเริ่ม server (เช่น `MOD_PASSWORD=xxxx npm start`) เพื่อให้ต้องใส่รหัสตอนสร้างห้องที่หน้า `/mod` ถ้าไม่ตั้งค่า ใครก็สร้างห้องได้ (เหมาะกับ LAN ส่วนตัว)

## Voice (เสียงในเกม, WebRTC)
ผู้เล่นคุยกันผ่านไมค์ได้ในช่วง MORNING / VOTE_INTERIM เท่านั้น (กติกา `canSpeak` ใน `src/engine/chat.js`: ยังมีชีวิต + เฟสถูกต้อง + ไม่ถูก NDA Silence + ไม่พักเกม) หน้าจอ 3D (`/mod3d.html`) ได้ยินเสียงตามตำแหน่งโต๊ะ เซิร์ฟเวอร์เป็นผู้กรอง signalling (`v:sig`) ส่วนเสียงวิ่ง P2P แบบ mesh

- **ต้องใช้ HTTPS บนมือถือ** (เบราว์เซอร์ไม่ให้ใช้ไมค์บน http ยกเว้น localhost):
  ```bash
  cd app
  node tools/gen-cert.js [lanIp]     # ต้องมี openssl (>= 1.1.1); สร้าง app/.certs/voice.key + voice.crt
  HTTPS_KEY=.certs/voice.key HTTPS_CERT=.certs/voice.crt npm start   # PowerShell: $env:HTTPS_KEY=...; $env:HTTPS_CERT=...; npm start
  ```
  เปิด `https://<lanIp>:3000/` แล้วกดผ่านคำเตือนใบรับรอง self-signed (Advanced → continue) · ตั้งแค่ตัวใดตัวหนึ่ง หรืออ่านไฟล์ไม่ได้ เซิร์ฟเวอร์จะหยุดพร้อมข้อความ error (ไม่ถอยกลับเป็น http เงียบ ๆ)
- **ทางเลือก:** tunnel (`cloudflared tunnel --url http://localhost:3000` หรือ `ngrok http 3000`) ได้ใบรับรองจริง แต่ต้องมีอินเทอร์เน็ต
- `VOICE_ICE_SERVERS` = JSON array ของ RTCIceServer เช่น `[{"urls":"stun:stun.l.google.com:19302"}]` (ค่าเริ่มต้น `[]` ใช้ได้ในวง LAN) · ไม่มี TURN ในตัว
- **ข้อจำกัด:** mesh รองรับผู้เล่นสูงสุด 12 คน + จอ 3D (เกิน ~15 ต้องใช้ SFU)
- **ความเสี่ยงที่ยอมรับ:** การ mute = ตัดที่ server (ไม่ relay) + ผู้รับทิ้งการเชื่อมต่อ + ผู้พูดปิดการเชื่อมต่อ ไคลเอนต์ที่ถูกแก้ไขอาจยังส่งเสียงให้ผู้รับที่ถูกแก้ไขด้วยกันได้ และการที่ผู้เล่นที่ยังมีชีวิตแต่ถูก Silence "เงียบ" ก็เป็นสัญญาณที่ผู้อื่นอาจสังเกตได้

## รูปการ์ดและภาพย่อ
- รูปต้นฉบับอยู่ใน `docs/` (ใหญ่ ~0.8–1 MB/ใบ) หน้าเกมใช้ **ภาพย่อ** ที่ `app/public/thumbs/` เพื่อให้โหลดเร็วบนมือถือ:
  | ภาพย่อ | ขนาด | ใช้ที่ไหน |
  | :--- | :--- | :--- |
  | `thumbs/roles-md/` | 600px (~100–200 KB) | การ์ดบทบาทของตัวเองในแท็บ "ฉัน" |
  | `thumbs/roles/`, `thumbs/events/`, `thumbs/traps/`, `thumbs/boosters/` | 300px (~35–60 KB) | รายการ Trap ของฝ่ายมืด, แผงโหวต Sprint Booster, การ์ด Event, ตารางหน้าจบเกม, แกลเลอรี |
- แตะรูปในเกมเพื่อเปิดภาพเต็มจาก `docs/` ถ้าไม่พบภาพย่อ ระบบจะย้อนไปใช้ภาพเต็มเอง
- **เปลี่ยนรูปการ์ดแล้วให้สร้างภาพย่อใหม่:** `python app/tools/make_thumbs.py` (ต้องมี Pillow)
