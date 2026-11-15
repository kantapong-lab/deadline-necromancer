# Deploy check: event-cards-16-20 (mode 1)

Checked against `docs/architecture/baseline.md` (commit 043f790) and `ac.md`. Facts below come from files, not assumption.

## Pinned runtime
Runtime: Node (version not pinned in the repo) (base image none, lockfile app/package-lock.json)

- No Node pin exists: no `.nvmrc`, `.node-version`, `.tool-versions`, and no `engines` field in `app/package.json`. Nothing to match; the architect must not invent a version in the contract. The Node on this host is v24.21.0 (observed, not a project pin).
- Language: JavaScript, CommonJS, no build step (baseline.md "Stack").
- Lockfile: `app/package-lock.json`, lockfileVersion 3, tracked in git.
- Dependencies (`app/package.json:12-17`): runtime `socket.io ^4.7.5`; dev `socket.io-client ^4.8.4`. Unchanged by this task.
- Datastore: none. Rooms live in an in-memory `Map` (`app/src/server/rooms.js:4`).

## Target
- Existing deploy targets: none found. No Dockerfile, compose file, CI config, IaC or deploy script in the repo (Glob of the worktree). Deploy method is unknown to the repo (baseline.md "Runtime and deploy"); where it runs is the user's decision.
- Local run (from `app/`): `npm install`, then `npm start` (= `node src/server/index.js`); port from `PORT` env, default 3000.
- Test command (from `app/`): `npm test` (golden, http-parity, mod-actions, simulate, events). Needs `npm install` first: `app/node_modules/` is git-ignored and absent in this worktree, and the tests use `socket.io-client`. Tests bind fixed ports 3111-3113 (baseline "Open issues"), so no two test runs at once on one host.
- Balance sim (AC-39): `npm run balance -- 2000` from `app/`.
- Build, lint, typecheck: none defined.

## Smoke (step 3d)
3d skipped: no trigger.
- New runtime: no. The AC and ADR 0002 add 5 `EVENTS` entries, a `VOTE_INTERIM` phase, game logic, Thai strings and docs only.
- New dependency or native package: no. `package.json` and the lockfile are untouched in the AC.
- New datastore: no. State stays in memory.
- Devops-owned files changed: no. No infra file exists and none is created.
- No passing smoke on record for this stack: true on paper, but the trigger list (mode 2) counts it only for a stack that has a smoke to run. There is no Dockerfile or health route; building them is out of scope and would add infra files, which this task must not do. QA on the local `npm start` / `npm test` covers the feature.

## Files devops owns
None. No Dockerfile, compose, CI config, `.env.example` or deploy script exists, and this task creates none. The contract's ownership table needs no devops row.

## Risks
- No Node version pin (no `.nvmrc`, no `engines`): a different Node on another host is not caught by anything. Pre-existing; out of scope here. Suggest a pin as a separate task.
- No Dockerfile, CI or documented deploy target: the user sets up hosting. Nothing in this task changes that.
- Tests use fixed ports 3111-3113: parallel runs (for example gate and QA on one host) can collide. Pre-existing.
- Golden re-record (AC-37) changes `golden/snapshot.json` and `mod-actions.json`; how the golden tests seed `Math.random` is still [verify] in the baseline. QA should confirm the gate is stable across two runs.
- In-memory rooms, never deleted (baseline "Open issues"): a new `VOTE_INTERIM` phase adds no persistence, so no change in memory profile beyond a few fields per room.
