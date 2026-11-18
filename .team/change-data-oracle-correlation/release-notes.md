# Release notes: Data Correlation

## Changed
- Data Oracle skill "KPI Forecast" is now "Data Correlation". Night: pick 2 other players (never self, never the same twice). Next morning: told whether both are on the same team or different teams (light / dark / indie), never which team.
- Result: "Data Correlation: X กับ Y → อยู่ทีมเดียวกัน 🔗" or "→ อยู่คนละทีม ⛓️‍💥". Two indies count as the same team.
- Alibi Mirror makes a dark target read as light. A fresh Honeypot on either target flips the result once. Debug Scanner notes the true result when altered.
- Power Outage: Data Oracle gets only "Data Correlation: ไฟดับ/เน็ตหลุด ไม่ได้ข้อมูลเลย 🔌".
- 3D fx payload for `data_oracle`: `targets: [idA, idB]`, `result: { same }` (old `real`/`bugs` removed). 3D director updated.
- Card text: Honeypot lists Data Oracle; Rune UX notes results follow Scope Creep/Hot Desking swaps; Mystery Intern copies a random living light player.

## Removed
- Work/bug counts and light-alive count from Data Oracle output.

## Unchanged
Night-resolve step order, win conditions, other intel skills. The new engine block makes no Math.random call; the game-wide random sequence still shifts because bots now draw 2 targets for Data Oracle, and in 3/315 golden seeds the silent <2-target branch changes the Reply All shuffle length. Golden snapshot re-recorded (83/83).

## Deploy hand-off
- Branch `feature/change-data-oracle-correlation` (accepted 2026-11-18, not merged to main, not pushed). No migration, no config, no dependency.
- `npm test` passes on the branch after the docs commit (http-parity unchanged by the docs).
- After deploy, check: Data Oracle picker asks for 2 targets; morning log shows the same/different-team line; Moderator 3D shows the cyan tether. The 3D effect has not been run in a real browser yet.
- Docs updated: player_rules, design, strategy, poc/DIRECTOR.md; stale comment in app/public/mod3d/director.js fixed (S-1).
