# architect: change-data-oracle-correlation

## 2026-11-18 round 1
- Wrote `.team/change-data-oracle-correlation/contract.md` (index) + `contract/{stack,engine,schemas,client,ownership,tests,ac-map}.md` in the feature worktree. AC-1..9 + Unchanged mapped.
- Stack: unchanged (Node CommonJS engine, Socket.IO, plain browser JS); no new dependency, no ADR, no diagram.
- Decisions: `t:2 pool:'others'` lets the generic validation (`night-input.js`, `game.js`) do AC-1, no engine edit there. Result block copies `qa_hunter` pattern: Alibi (dark->light, marked), Honeypot single flip with first trap marked, `fixNotes` when `same !== truth`, silent if swapped to <2 targets. Power Outage already handled by `intelSkills`; old fx line (`!blackout` guard) removed. `lightsAlive` const removed (unused).
- Findings: golden passes today; it will differ after (bot picks 2 targets), so V-1 compares per-seed Math.random call counts before/after before re-recording. `http-parity.json` hashes `/data.js`, `/card-info.js` and `/docs/deadline_necromancer_design.md`, so re-record after FE (and any docs change). `card-info.js` also carries data_oracle/honeypot/rune_ux texts (FE). `poc/DIRECTOR.md` and 3 docs still describe KPI Forecast (Docs lane).
- Open: Alibi card text (`data.js`, `card-info.js`) lists only Senior Dev/QA though it now also affects Data Oracle; left unchanged per ac.md "Unchanged" (PM may want it added).
