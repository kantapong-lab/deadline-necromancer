# Engine logic (BE): Data Correlation

No REST, no socket event, no schema change. The socket surface is unchanged: the client picks targets through the existing `submitNight` (`SKILL` + `targets[]`) and reads results from the existing Night Log (`G.intel` notes) and the existing `spec` in the view (`{skill,t,d,pool}`).

## 1. `app/src/shared/data.js` (card texts, exact strings; copy from this file, do not retype emoji)

| Key | Field | New value |
|---|---|---|
| `ROLES.data_oracle` | `skill` | `Data Correlation` |
| `ROLES.data_oracle` | `t`, `pool` | `t:2`, `pool:'others'` (was `t:0`, no pool) |
| `ROLES.data_oracle` | `d` | `เลือกเพื่อน 2 คน เช้าถัดไปรู้ว่าทั้งคู่อยู่ทีมเดียวกันหรือคนละทีม (ไม่บอกว่าทีมไหน)` |
| `TRAPS.honeypot` | `d` | `หมอบที่ผู้เล่น 1 คน — สายสืบ (Senior Dev/QA/UX/Data Oracle) ที่ส่องคนนี้คืนนี้จะได้ข้อมูลปลอม` |
| `ROLES.rune_ux` | `d` | `วางรูนที่เพื่อน 1 คน เช้าถัดไปรู้ชื่อทุกคนที่ใช้สกิลใส่คนนี้ (นับตามเป้าหมายหลังถูกสลับโดย Scope Creep/Hot Desking)` |
| `ROLES.mystery_intern` | `d` | `ก๊อปสกิลของผู้เล่นฝ่ายแสงที่ยังอยู่คนหนึ่ง (สุ่ม) มาใช้คืนนี้` |

Nothing else in `data.js` changes (blackout card text, Alibi text, other roles stay). `t:2` + `pool:'others'` makes the existing generic code do AC-1 validation with no edit: `night-input.js` (`need = max(s.t,0)`, count, uniqueness, not in `candidatesRaw`, `REPEAT_MSG`), `game.js candidatesRaw` (excludes self for `others`), `avoidRepeat` (drops both of last night's targets, waived when fewer than 2 remain), `phases.js:31` (`prevTargets`). Do not edit those files.

## 2. `app/src/engine/night-resolve.js`

Edit only the two `data_oracle` lines (189-190), in place. Step order, position (after `qa_hunter`, before `rune_ux`) and Math.random sequence stay identical; the new block makes no `rnd`/`shuffle` call. Also delete the now-unused `const lightsAlive` (line 130; its only readers were the old lines).

Replace the two old lines with one block (same helpers as `qa_hunter`):

```js
intelSkills('data_oracle').forEach(a => {
  if (a.targets.length < 2) return;                       // after a swap the oracle may hold 0/1 targets: silent, like qa_hunter
  const [x, y] = a.targets;
  const truth = P(x).faction === P(y).faction;
  const team = id => { const al = alibiOn(id); if (al && P(id).faction === 'dark') { al.triggered = true; return 'light'; } return P(id).faction; };
  let same = team(x) === team(y);                          // both targets evaluated: every fresh Alibi on a dark target is marked
  const hp = a.targets.map(honeyOn).find(Boolean); if (hp) { same = !same; hp.triggered = true; }   // single flip, first trap only (as qa_hunter)
  const mk = s => `Data Correlation: ${nm(x)} กับ ${nm(y)} → ${s ? 'อยู่ทีมเดียวกัน 🔗' : 'อยู่คนละทีม ⛓️‍💥'}`;
  add(a.p.id, mk(same));
  fxs('data_oracle', a.p.id, { targets: [x, y], result: { same } });
  if (same !== truth) G.fixNotes.push({ pid: a.p.id, text: '(Debug Scanner แก้ข้อมูล) ' + mk(truth) });
});
```

Rules the block encodes:
- Team = real `faction` (3-way `light|dark|indie`). `indie`+`indie` = same; `dark`+`indie` = different. The text never names or hints a team.
- Alibi (fresh, on a `dark` target) turns that target into `light` for the comparison; marked `triggered`. Alibi on a non-dark target does nothing and is not marked.
- Honeypot (`honeyOn`, which already returns nothing under `G.cleanSprint`) on either target flips once; if both are trapped only the first found is marked `triggered` (identical to `qa_hunter`).
- Order inside: Alibi first, then Honeypot flip (so dark+Alibi vs light, plus a Honeypot, shows "different").
- Debug Scanner note only when shown differs from the real result (`same !== truth`, where `truth` ignores Alibi and Honeypot). Same-format line, true result.
- Power Outage: `intelSkills` already adds `Data Correlation: ไฟดับ/เน็ตหลุด ไม่ได้ข้อมูลเลย 🔌` (it reads `G.spec(a.p).skill`) and returns `[]`, so no result note, no fx. Do not add a separate `!blackout` fx line (the old line 189 is removed).
- Targets after swap (Scope Creep, Hot Desking) are what is compared; a target may equal the oracle itself after a swap; compare as normal. Dead-tonight players keep their real faction.
- Glory Thief steal, Mystery Intern copy (`er()` gives the copied role; `fxs` adds `via`), Rune UX listing (the oracle is `SKILL` with `targets` so it already appears) need no code.
- Math.random order unchanged. Verification V-1 in [tests.md](tests.md).
