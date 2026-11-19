# devops: indie-solo-wins

## 2026-11-19 round 1, mode 1
- Pinned runtime: none in repo. Host Node v24.21.0, Docker 29.9.2 observed. Lockfile app/package-lock.json.
- Targets: none (no Dockerfile, compose, CI, IaC). Local verified path: `npm start` / `npm test` / `npm run balance` in app/.
- Ghost scheduler = in-memory per-room timer in the existing process: no infra, no new dep, no env var.
- Smoke 3d: no trigger. Smoke stage on record: none run.
- Decisions: wrote no infra files; did not pin Node or propose hosting or a Dockerfile (a container path would be a separate mode 2 task).
- Open: timer cleanup on room end/pause/reset (BE), no Node pin, fixed test ports 3111-3113.
