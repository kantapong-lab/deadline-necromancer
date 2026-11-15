# devops: event-cards-16-20

## 2026-11-15 round 1, mode 1
- Pinned runtime: none in repo (no .nvmrc, no engines). Lockfile app/package-lock.json (v3). Host Node v24.21.0, observed only.
- Targets: none (no Dockerfile, CI, IaC, deploy script). Local: `npm start` / `npm test` in app/.
- Smoke 3d skipped: no trigger (no runtime, dependency, datastore or devops file change).
- Decisions: wrote no infra files (task must not); did not propose a Node pin or hosting.
- Open: no Node pin, fixed test ports 3111-3113, golden seeding [verify].
