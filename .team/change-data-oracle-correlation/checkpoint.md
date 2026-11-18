# Checkpoint: change-data-oracle-correlation
Updated: step 6 · round 1
## Goal
redesign — Data Oracle skill rework + 2 card-text fixes (deadline-necromancer, app/)
1. Data Oracle (`data_oracle`, app/src/shared/data.js:13) — replace "KPI Forecast" with Data Correlation: pick 2 other players (t:2, pool:'others', no self); result next morning "Data Correlation: X กับ Y → อยู่ทีมเดียวกัน 🔗" or "→ อยู่คนละทีม ⛓️‍💥", never says which team. Team = real faction, 3-way light/dark/indie (two indies = same team). Card text: "เลือกเพื่อน 2 คน เช้าถัดไปรู้ว่าทั้งคู่อยู่ทีมเดียวกันหรือคนละทีม (ไม่บอกว่าทีมไหน)". Alibi Mirror: dark target with fresh Alibi counts as light. Honeypot on either target flips same↔different. Debug Scanner fixNotes get the true result. Power Outage → no info. Honeypot card text includes Data Oracle. Remove old output (work vs bug counts, light-alive count); update 3D fx payload. Defaults from existing rules: no repeat target on consecutive nights, usable night 1, swappable by Scope Creep/Hot Desking, appears in Rune UX, Mystery Intern can copy, Glory Thief can steal.
2. Card text: Rune UX — result reflects targets after Scope Creep/Hot Desking swaps (no rule change).
3. Card text: Mystery Intern — copies a random living light player (code), not "to the right".
Out of scope: Senior Dev "none" result being a 100% dark tell.

## Run profile
lane: change (ui+logic) · skipped 1, 3d

## Status
closed · 2026-11-18 · step 11 docs done, step 12 closing done
step 1 setup done · base: main · baseline: red (user: continue, code is the only truth) · announcement: no · route: change (redesign) · intake: 2 asked
gate 2b passed · user: "อนุมัติ" · 2026-11-18
gate 3c passed · user: "อนุมัติ" · 2026-11-18 (recorded by hand: canvas not published — Artifact publish and local server denied by permissions; user reviewed the local file canvas/project/Main.dc.html in the browser pane)
step 7 QA L3 pass (10/10) · step 10 Human gate approved · user: "อนุมัติ" · 2026-11-18 · role worktrees removed
canvas: local only (canvas/project/Main.dc.html) · ux-review: skipped (impeccable not installed) · 3c low finding: blackout line reads "Data Correlation: ไฟดับ/เน็ตหลุด ไม่ได้ข้อมูลเลย 🔌" (existing intelSkills text)

## Decisions in force
Grilling decisions above are final (user, 2026-11-18). night-resolve.js order and Math.random call order are rule-critical (golden tests).

## Loop counters
None.

## Open blockers
None.

## History
- step 2 r1: ac.md: 9 ACs + Unchanged [2-r1]
- step 6 r1: Approve, 5 suggestions, V-1 deviation accepted [6-r1]

[2-r1]: rounds/2-r1.md
[6-r1]: rounds/6-r1.md
