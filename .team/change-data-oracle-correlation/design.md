# Design: change-data-oracle-correlation

Canvas URL: (pending publish by Orchestrator) source `.team/change-data-oracle-correlation/canvas/project/Main.dc.html`
Platform: web. Screen map: none needed (no screen added/moved). Design system: none in project (`docs/design-system/` absent, internal-style game UI); tokens reused from `app/public/style.css` (`--light --panel2 --line --mut`, `.btn`, `.btn.sel`, `.hint`, `.targets`). No new tokens or components.

## Persona / flow (brief)
Light player (Data Oracle) at night: opens skill, picks 2 friends, submits. Next morning reads one Night Log line. Drop-off risk: confusion over "team" -> copy states 3-way real faction, never names team.

## Screen states (AC -> state)
| AC | Screen | State | Before | After |
|---|---|---|---|---|
| AC-1 | Night skill picker (`index.html` tpick, generic `need` picker, no new UI) | no pick | no picker (`t:0`) | hint "เลือกเป้าหมาย 2 คน (เลือกแล้ว 0/2)"; buttons for others only, self never listed |
| AC-1 | same | 1 or 2 picked | n/a | `.btn.sel` on picked, counter 1/2, 2/2; submit enabled only at 2/2 |
| AC-1 | same | repeat-blocked | n/a | disabled button "<name> (ซ้ำเมื่อคืน)" tooltip "ห้ามเป้าเดิมติดกัน" (existing `repeatBlocked`) |
| AC-1 | same | <2 candidates | n/a | "ไม่มีเป้าหมายให้เลือก"; skill not submittable |
| AC-1 | Role card / info | text | KPI Forecast, old `d` | skill "Data Correlation"; `d` per ac.md; `card-info.js` data_oracle: one "เลือก 2 คน รู้ว่าอยู่ทีมเดียวกันหรือไม่"; what "เลือกเพื่อน 2 คน ระบบบอกว่าสองคนนี้ "อยู่ทีมเดียวกัน" หรือ "อยู่คนละทีม" ไม่บอกว่าทีมไหน"; when unchanged; tip "ฝ่ายอิสระ 2 คนนับเป็นทีมเดียวกัน ข้อมูลอาจถูกหลอกด้วย Honeypot/Alibi" |
| AC-2 | Morning Night Log (also mod3d.html:727 log) | same | "KPI Forecast: งานเสร็จจริง N ชิ้น · บั๊กแฝง M ชิ้น" | `Data Correlation: X กับ Y → อยู่ทีมเดียวกัน 🔗` |
| AC-2 | same | different | same | `Data Correlation: X กับ Y → อยู่คนละทีม ⛓️‍💥` |
| AC-4 | same | Honeypot flip | n/a | shows flipped line, same format, no marker for player |
| AC-5 | Night Log (fixNotes, Debug Scanner) | altered | n/a | `(Debug Scanner แก้ข้อมูล) Data Correlation: X กับ Y → <true result>`; none if unchanged |
| AC-6 | Night Log + 3D | Power Outage | `ไม่ได้ข้อมูล` bubble / old | `Data Oracle: ไม่ได้ข้อมูลเลย 🔌` only; no result line, no fx payload |
| AC-7 | 3D stage (`director.js` `data_oracle`) | same | two bars real/bugs, 3200ms | see fx |
| AC-7 | 3D stage | different | same | see fx |
| AC-4 | Honeypot card | text | "สายสืบ (Senior Dev/QA/UX) ที่ส่อง…" | "สายสืบ (Senior Dev/QA/UX/Data Oracle) ที่ส่องคนนี้คืนนี้จะได้ข้อมูลปลอม" |
| AC-8 | Rune UX card (`data.js d`, `card-info.js` what) | text | "…รู้ชื่อทุกคนที่ใช้สกิลใส่คนนี้" | append "(นับตามเป้าหมายหลังถูกสลับโดย Scope Creep/Hot Desking)" |
| AC-9 | Mystery Intern card (`data.js d`; `card-info.js` already says random) | text | "…ฝ่ายแสงที่อยู่ถัดไปทางขวามาใช้คืนนี้" | "ก๊อปสกิลของผู้เล่นฝ่ายแสงที่ยังอยู่คนหนึ่ง (สุ่ม) มาใช้คืนนี้" |

## 3D fx spec (AC-7)
Payload: `{ caster, targets:[A,B], result:{ same } }`. Handler `data_oracle({caster:c, targets:[a,b], result:r})`.
1. 0-600ms: `shoot(c,a,0x4fd0ff)` and `shoot(c,b,0x4fd0ff)` in parallel (reuse QA Hunter pattern), `ringUp` on both; `hover('🔎')` over each.
2. 600-1800ms: glowing tether (cyan `0x4fd0ff`, same colour for both results) drawn between `wp(a)` and `wp(b)`; midpoint `hover` icon.
3. same: tether pulses and thickens 1x, hover 🔗. different: tether splits at midpoint, halves recoil 0.3 units, hover ⛓️‍💥.
4. Total about 3200ms (keep old duration so night timeline unchanged); remove tether meshes after. `r.same` undefined -> treat as no result: play beams only, no icon.
Rules: never use faction colours (gold/purple/teal) for result, so fx cannot hint team. `priv` is a no-op already; result stays in Night Log only. Remove `real`/`bugs` bars. Reduced motion (`prefers-reduced-motion`): skip beams/recoil, show only the 🔗/⛓️‍💥 hover icon 1500ms.

## Interaction
Picker: click toggles (`toggleT`), keyboard Enter/Space on buttons (native `<button>`), focus ring existing. Disabled repeat button not focusable. Counter text is live text in `.hint`.

## A11y
Native buttons; selected state not colour-only (counter text + inset border); log lines carry text plus emoji (emoji not sole carrier: words "ทีมเดียวกัน/คนละทีม"). Contrast uses existing tokens (>=4.5:1 `--txt` on `--panel`).

## Heuristic notes
- H1 visibility: counter x/2 (ok). H5 error prevention: self excluded, repeat disabled with reason. H2 match: "ทีม" used consistently in card, log, tip. No severity >=3 found. UX rules: P1 contrast, P2 touch targets use existing `.btn` (8px 14px padding; unchanged).

## FE notes (not done by Designer)
`mod3d.html:727` still formats `r.real/r.bugs`; must switch to the Data Correlation line (AC-2/7). Skill name in `mod3d.html` roles table uses `S.skill` so follows data.js.

## Design system changes
None.

## Quality checks
- Every UI-facing AC (1,2,4,6,7,8,9) mapped to a state: pass (AC-3/5 logic ACs also noted)
- States covered (none/partial/full/repeat-blocked/<2/outage/altered): pass
- Copy final in Thai: pass
- A11y + reduced motion: pass
- Canvas placeholder data: sample names only, no contract fields (logic-only task): pass
- Design system consistency: pass (existing tokens)
