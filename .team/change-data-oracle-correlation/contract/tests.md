# Tests and verification (BE owns `app/test/**`)

Baseline note: `node test/golden/run.js` and `node test/fx.js` pass on this branch today (checked by the Architect); other baseline reds are unrelated and ignored (code is the only truth).

## New `app/test/data-correlation.js` (append to `npm test`)
Same harness style as `test/fx.js` (`table()` / `night()` with seat roles, `G.resolveNight()`), reading notes from `G.intel[pid]`, `G.fixNotes`, `G.fx`.

| Id | Case | AC |
|---|---|---|
| T1 | `ROLES.data_oracle` is `{skill:'Data Correlation', t:2, pool:'others'}` with the exact `d`; no `KPI Forecast` string in `app/src` | 1 |
| T2 | `submitNight`: 2 distinct others ok; self, duplicate, 1 target, 3 targets, 0 targets rejected; the same pair on consecutive nights gets `REPEAT_MSG` (when >= 2 other candidates remain); night 1 allowed | 1 |
| T3 | light+light and dark+dark and indie+indie -> "อยู่ทีมเดียวกัน 🔗"; light+dark, dark+indie, light+indie -> "อยู่คนละทีม ⛓️‍💥"; text contains no team name; no "งานเสร็จจริง"/"บั๊กแฝง" | 2 |
| T4 | Alibi on dark vs light -> same; dark+Alibi vs dark -> different; Alibi `triggered`; Alibi on a light target not marked | 3 |
| T5 | Honeypot on one target flips; on both flips once (single flip), exactly one trap `triggered`; `cleanSprint` -> no flip; Alibi+Honeypot together | 4 |
| T6 | Debug Scanner: altered result -> one `G.fixNotes` entry for the oracle with `(Debug Scanner แก้ข้อมูล) Data Correlation: … <true result>`; unchanged result -> none | 5 |
| T7 | `blackout`: oracle note is `Data Correlation: ไฟดับ/เน็ตหลุด ไม่ได้ข้อมูลเลย 🔌`, no result line, no `data_oracle` fx | 6 |
| T8 | fx payload deep-equals `{kind:'skill',…,role:'data_oracle',caster,targets:[a,b],result:{same}}`; `same` is the shown value (Honeypot case); no `real`/`bugs` key; `redactFx(batch,false)` drops it | 7 |
| T9 | Hot Desking/Scope Creep swap: result compares the swapped targets; swapped to <2 targets -> no note, no fx, no throw | 1 |
| T10 | Mystery Intern copying data_oracle gets the line and fx `via`; Glory Thief targeting the oracle steals it with `(ขโมยมา)`; Rune UX on a oracle target lists the oracle | 1 |
| T11 | `ROLES.rune_ux.d` ends with the Scope Creep/Hot Desking clause; `TRAPS.honeypot.d` contains `Data Oracle`; `ROLES.mystery_intern.d` has no `ถัดไปทางขวา` | 4, 8, 9 |

## Existing tests to edit
- `test/fx.js` line 40: replace `{ real: 7, bugs: 0 }` with a `{ same }` assert and `targets`; seat 4 acts as `skill(a, b)` (it is `skill()` today in the first case). `test/events.js`, `no-repeat-cards.js`, `quick-replies.js` run `data_oracle` seats: fix any that submit `skill()` for it (`t:2` now needs 2 targets).
- `test/golden/snapshot.json`: expected to differ (bot now picks 2 targets, new texts). First run V-1, then `node test/golden/run.js --record`; the coverage gate must stay 83/83.
- `test/http-parity.json`: re-record after FE merges (`/data.js`, `/card-info.js` hashes). `mod-actions.json`: re-record only if `node test/mod-actions.js` fails.

## V-1 Math.random order unchanged (golden guard)
Before editing, record per seed the number of `Math.random` calls for the golden games (wrap `Math.random` with a counter inside a throwaway script in the scratch dir, not in the repo); repeat after the change. The counts must match for every seed 6..12 x 45: the engine path adds no random call and the bot's draw count does not depend on `t`. A mismatch means the order moved: stop and fix, do not re-record. Only then re-record the snapshot and attach the count comparison to the hand-off.
