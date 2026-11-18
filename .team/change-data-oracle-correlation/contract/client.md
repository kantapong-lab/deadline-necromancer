# Client (FE): `app/public/**`

Design source: [design.md](../design.md) (copy and fx spec are final there). This file only pins what FE must change and where it must agree with BE.

## 1. `app/public/card-info.js` (player-facing card info)

- `roles.data_oracle`, replace all four fields:
  - `type`: keep `วิเคราะห์`
  - `one`: `เลือก 2 คน รู้ว่าอยู่ทีมเดียวกันหรือไม่`
  - `what`: `เลือกเพื่อน 2 คน ระบบบอกว่าสองคนนี้ "อยู่ทีมเดียวกัน" หรือ "อยู่คนละทีม" ไม่บอกว่าทีมไหน`
  - `when`: unchanged (`ใช้ทุกคืน เห็นผลตอนเช้า`)
  - `tip`: `ฝ่ายอิสระ 2 คนนับเป็นทีมเดียวกัน ข้อมูลอาจถูกหลอกด้วย Honeypot/Alibi`
  (texts from design.md; they must keep: 2 targets, same/different only, no team named, no work/bug counts.)
- `traps.honeypot.what`: add Data Oracle to the list: `(Senior Dev / QA / UX / Data Oracle)`.
- `roles.rune_ux.what`: append `(นับตามเป้าหมายหลังถูกสลับโดย Scope Creep/Hot Desking)`.
- `roles.mystery_intern`: already says "random, from living Light"; verify it contains no "ถัดไปทางขวา" and leave it.
- Leave `alibi`, `blackout`, `qa_hunter`, `senior_dev` text as is (out of scope per ac.md "Unchanged").

## 2. `app/public/mod3d.html`

- Line ~727 `skillText`: the `data_oracle` branch must stop reading `r.real/r.bugs`. New log line: `${S.skill}: ${nm(T[0])} กับ ${nm(T[1])} → ${r.same ? 'อยู่ทีมเดียวกัน 🔗' : 'อยู่คนละทีม ⛓️‍💥'}` (when `T.length < 2` or `r.same === undefined`, fall back to the generic `${S.skill} → …`). Never add a team colour or team name.
- The `ROLES` table at ~247 has no `skill` field for this role (it mirrors `data.js` names); no change unless a `KPI Forecast` string is found. `grep -n "KPI" app/public` must be empty afterwards.

## 3. `app/public/mod3d/director.js` (line ~157-159 `data_oracle`, and the doc comment above it)

New handler signature `data_oracle({ caster:c, targets:[a, b], result:r = {} })`, payload `{ same:boolean }` per [schemas.md](schemas.md). Behaviour per design.md "3D fx spec": two cyan beams caster to both targets, a cyan tether between the two desks, `same` pulses with 🔗, `different` splits with ⛓️‍💥, about 3200 ms, tether meshes removed after, `prefers-reduced-motion` shows only the icon. Same colour for both outcomes (never faction colours). Remove the `real`/`bugs` bars and the `priv(c, '📊 …')` line. `r.same` undefined: beams only, no icon. Update the `// result:{ real, bugs }` comment to `// result:{ same:boolean }`.
- The Power Outage branch at ~225 already lists `data_oracle`; unchanged.

## 4. Do not edit

`index.html` (generic picker already serves `t:2`), `common.js`, `mod.html`, `gallery.html`, `voice.js`, `style.css`.

## 5. FE <-> BE interface

Only the fx payload in schemas.md and the role `spec` values. If FE needs another field, ask the Architect; do not add it in `night-resolve.js`.
