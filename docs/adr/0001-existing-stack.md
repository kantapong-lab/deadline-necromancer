# ADR 0001: Existing stack

Status: accepted. Records the stack as found on 2026-11-15 (baseline commit de82908). No change is proposed.

## Stack in force
- Language and modules: JavaScript, CommonJS `require` (app/src/server/index.js:4-10). Python 3 with Pillow only for a thumbnail tool (app/tools/make_thumbs.py:5-6).
- Server: Node `http` plus Socket.IO `^4.7.5`; the engine is server-authoritative (app/package.json:12-17, app/src/server/index.js:17-24).
- State: in-memory `Map` of rooms, no database (app/src/server/rooms.js:4).
- Client: static HTML and plain JavaScript, no framework and no build step; shared `data.js` is served to the client (app/public/index.html:11-13).
- Engine: `Game` class composed from method groups with a mixin that throws on a duplicate name (app/src/engine/game.js:18-24).
- Tests: five plain node scripts run by `npm test`, with a golden-master snapshot of seeded games (app/package.json:10, app/test/golden/run.js:3).
- Not present: bundler, linter, formatter, typechecker, Dockerfile, CI, Node version pin (baseline.md Runtime and deploy).

## Consequences recorded as facts
- Random call order in the engine is part of the golden-master snapshot; changing it means re-recording `app/test/golden/snapshot.json`.
- Public URLs (`/`, `/mod`, `/gallery`, `/data.js`, `/docs/*.jpg|png`) are frozen by `test/http-parity.js` (app/src/server/http.js:1).
- Player-facing strings are Thai.

Open items are listed in docs/architecture/baseline.md under `[verify]` and Open issues; this ADR makes no recommendation about them.
