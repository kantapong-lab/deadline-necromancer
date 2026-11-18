# AC: change-data-oracle-correlation
Source: checkpoint ## Goal (user-approved, final). Priorities: all P0.

## AC-1 Data Oracle picks 2 others (P0)
- Given Data Oracle (`data_oracle`) at night, when choosing, then it needs exactly 2 targets (`t:2`, `pool:'others'`), never self, never the same player twice.
- Skill name "Data Correlation" replaces "KPI Forecast" everywhere (data.js, night log, fx).
- Card text (`d`): "เลือกเพื่อน 2 คน เช้าถัดไปรู้ว่าทั้งคู่อยู่ทีมเดียวกันหรือคนละทีม (ไม่บอกว่าทีมไหน)".
- Usable night 1; may not pick the same target on consecutive nights (existing repeat rule); targets swappable by Scope Creep/Hot Desking; listed in Rune UX results; Mystery Intern can copy; Glory Thief can steal.

## AC-2 Result text (P0)
- Next morning log: "Data Correlation: X กับ Y → อยู่ทีมเดียวกัน 🔗" or "... → อยู่คนละทีม ⛓️‍💥".
- Team = real faction, 3-way light / dark / indie. Same faction = same team (two indies = same team; dark+indie = different).
- Text never names or hints which team.
- Old output removed: no work/bug counts, no light-alive count ("KPI Forecast: งานเสร็จจริง..." gone).

## AC-3 Alibi Mirror (P0)
- A dark target with fresh Alibi counts as light for comparison (dark+Alibi vs light = same; dark+Alibi vs dark = different). Alibi marked triggered as for other intel skills.

## AC-4 Honeypot (P0)
- Fresh Honeypot on either target flips same<->different (single flip even if both are trapped, as QA Bug Bounties does; trap marked triggered).
- Honeypot card text (data.js `honeypot.d`) lists Data Oracle with Senior Dev/QA/UX.

## AC-5 Debug Scanner (P0)
- When Honeypot/Alibi altered the shown result, `G.fixNotes` gets "(Debug Scanner แก้ข้อมูล) Data Correlation: ... " with the true result; no note when result is unchanged.

## AC-6 Power Outage (P0)
- Event `blackout`: Data Oracle gets "ไม่ได้ข้อมูลเลย 🔌" only, no result, no 3D result payload.

## AC-7 3D fx payload (P0)
- `fxs('data_oracle', ...)` carries `targets: [idA, idB]` and `result: { same: bool }` (shown result, post Alibi/Honeypot); old `real`/`bugs` fields removed. 3D consumer updated to match.

## AC-8 Rune UX card text (P0)
- Rune UX description states the result reflects targets after Scope Creep/Hot Desking swaps. Text only; resolve logic unchanged.

## AC-9 Mystery Intern card text (P0)
- Mystery Intern description says it copies the skill of a random living light player, not the one "to the right". Text only; matches code.

## Unchanged
- Order of steps in night-resolve.js and the sequence of Math.random calls (golden tests).
- Senior Dev "none" result (out of scope).
- Other intel skills (Senior Dev, QA, Ledger Sage) results and Power Outage text for them.
- Win conditions, roles, other card texts, Rune UX / Mystery Intern behavior.
