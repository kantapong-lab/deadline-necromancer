# Schemas and payloads

No DB, no migration, no new game-state field, no view field. Only these shapes change.

## fx `skill` event for `data_oracle` (AC-7), Moderator-only (not in `PUBLIC_KINDS`; `redactFx` unchanged)

```
before: { kind:'skill', day, phase:'NIGHT', role:'data_oracle', caster:id, result:{ real:number, bugs:number } }
after:  { kind:'skill', day, phase:'NIGHT', role:'data_oracle', caster:id, targets:[idA, idB], result:{ same:boolean } }
```
- `targets` = the two compared player ids in `a.targets` order (after swaps); `same` = the SHOWN result (after Alibi and Honeypot), never the truth.
- An intern copy adds `via:{source:<seat index>}` as for every skill (existing `fxs`).
- `real` and `bugs` are removed from the payload and from every reader.
- Not emitted when: Power Outage, skills banned (`prod` accepted), the oracle rested, or fewer than 2 targets after a swap.
- Event key order in the fx stream is unchanged (emitted at the same place as before).

## Night Log lines (`G.intel` notes, `G.fixNotes`)

| Case | Text |
|---|---|
| same | `Data Correlation: <nameA> กับ <nameB> → อยู่ทีมเดียวกัน 🔗` |
| different | `Data Correlation: <nameA> กับ <nameB> → อยู่คนละทีม ⛓️‍💥` |
| Power Outage | `Data Correlation: ไฟดับ/เน็ตหลุด ไม่ได้ข้อมูลเลย 🔌` |
| Debug Scanner (`G.fixNotes`) | `(Debug Scanner แก้ข้อมูล) ` + the same-format line with the TRUE result |

Removed output: `KPI Forecast: งานเสร็จจริง N ชิ้น vs บั๊กแฝง M ชิ้น` (no work/bug counts, no light-alive count). The string `KPI Forecast` must not remain in `app/src` or `app/public`.

## Role spec in the player view (existing shape, new values)

`views.js` sends `spec:{skill,t,d,pool}`; for `data_oracle` it becomes `{skill:'Data Correlation', t:2, d:<AC-1 text>, pool:'others'}`. No `views.js` edit. `index.html` already picks `need` targets generically (`toggleT`, `need = max(spec.t,0)`).

## Trap state

`G.traps[]` entries (`{kind, owner, target, day, fresh, triggered}`) unchanged; Data Oracle now may set `triggered = true` on `alibi` / `honeypot` (existing announcement path at night-resolve.js 242-248 reads it).
