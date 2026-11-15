# QA report: change-refactor-structure (round 1, L2)
Verdict: PASS. Branch qa/change-refactor-structure (feature, review-approved). No bugs.

## Results per AC
- AC-1 PASS. `cd app && npm test` x2, both exit 0. golden: 105 games, 19630 steps, coverage 71/71 GOLDEN OK; HTTP PARITY OK (21 urls); MOD ACTIONS OK (71 steps). Golden identical across both runs (deterministic). simulate.js is unseeded (win mix varies per run) but ALL OK both times.
- AC-2 PASS (tree check). app/src/{server,engine,shared} present; shared/data.js there; public/ present; no app/server.js, app/engine.js, app/data.js.
- AC-3 PASS. Mutation proof on a scratch copy (temp dir, deleted): vote.js line 37 `sorted[0][1] > skip` -> `>= skip`; `node test/golden/run.js` => `GOLDEN FAILED: 30 game(s) differ`. Golden snapshot guards rule behaviour. Worktree untouched.
- AC-4 PASS. http-parity + mod-actions (room create, 6+ join, start, kick, rejoin, mod rejoin, errors) + simulate (7 sizes 6..12, full games) all green. Socket smoke covered by these; nothing extra added.
- AC-5 PASS. grep for `server.js|engine.js|data.js` in app/ and .claude excluding node_modules, lock, public: only hits are README rows for src/server/http.js and src/shared/data.js, the `/data.js` URL in http.js, and URL strings in test/http-parity.*. No old file path refs. .claude/launch.json "app" uses `app/src/server/index.js`.
- AC-6 PASS. From repo root: `PORT=3190 node app/src/server/index.js`; curl: / 200, /mod 200, /gallery 200, /data.js 200, /style.css 200, /thumbs/events/01_fast_approval.jpg 200, /docs/event_cards/01_fast_approval.jpg 200, /docs/deadline_necromancer_design.md 403. Server stopped (port closed). Start from app/ is exercised by npm test (tests spawn server on 3111-3113).

## Not covered
- Real-browser UI smoke (client untouched by this refactor, public/ unchanged).
- Start via `npm start` and via launch.json runner itself (path content only checked).
- Windows-only; no Linux/macOS run. Other mutation sites (night-resolve.js) not tried; one mutation sufficient to prove gate.
- Out-of-scope items (plan section 1 bugs, Phase C) not tested.

## Housekeeping
No test files added; no production code changed. node_modules not committed.
