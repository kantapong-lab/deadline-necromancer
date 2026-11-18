# AC -> contract map

| AC | Home | Owner | Test |
|---|---|---|---|
| AC-1 | [engine.md](engine.md) s1 (`data.js` `t:2`, `pool:'others'`, `skill`, `d`) + existing generic validation (`night-input.js`, `game.js avoidRepeat`); swap/Intern/Glory Thief/Rune UX work through existing paths; FE card info in [client.md](client.md) s1 | BE (+FE `card-info.js`) | T1, T2, T9, T10 |
| AC-2 | engine.md s2 (`mk`, `team`), [schemas.md](schemas.md) Night Log lines; old `KPI Forecast` line and `lightsAlive` removed; FE log line `mod3d.html` (client.md s2) | BE (+FE mod3d log) | T3 |
| AC-3 | engine.md s2 `team()` Alibi branch, marks `triggered` | BE | T4 |
| AC-4 | engine.md s2 `honeyOn` single flip; `TRAPS.honeypot.d` (engine.md s1); FE `card-info.js` honeypot.what | BE (+FE card-info) | T5, T11 |
| AC-5 | engine.md s2 `G.fixNotes.push` when `same !== truth` | BE | T6 |
| AC-6 | engine.md s2 via `intelSkills` blackout note; no fx | BE | T7 |
| AC-7 | schemas.md fx payload `{targets:[a,b],result:{same}}`; `director.js` + `mod3d.html` consumers in client.md s2-s3 | BE (producer) + FE (consumer) | T8, manual 3D |
| AC-8 | engine.md s1 `ROLES.rune_ux.d`; client.md s1 `card-info.js` rune_ux.what; resolve logic untouched | BE + FE | T11 |
| AC-9 | engine.md s1 `ROLES.mystery_intern.d` (matches `setCopies`, random living light); client.md s1 verify only | BE | T11 |
| Unchanged | order of steps and Math.random sequence: V-1 in [tests.md](tests.md); other intel texts, Senior Dev "none", win rules untouched (ownership.md lists the only files) | BE | V-1, full `npm test` |
