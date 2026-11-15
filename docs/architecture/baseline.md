---
commit: de82908a6a8abacfb03f7ad46df5de6e99afb917
date: 2026-11-15
scan: .team/onboard/scan.json
---
# Baseline: deadline-necromancer

## Read this first
- Stack: Node (CommonJS) + Socket.IO ^4.7.5, plain HTML/JS client, no build step (app/package.json:12-17)
- Server-authoritative game engine in app/src/engine, Socket.IO handlers in app/src/server (app/src/server/index.js:17-24)
- Tests: `npm test` from app/ runs 5 plain node scripts, no framework (app/package.json:10)
- Conventions often broken: (1) engine methods are mixins, a duplicate method name throws (app/src/engine/game.js:18-24); (2) handlers return an error string, `null` = ok (app/src/server/handlers/player.js:9-10); (3) public URLs are frozen (app/src/server/http.js:1)
- Player-facing UI strings are Thai

| Section | File |
|---|---|
| Layout | [baseline/layout.md](baseline/layout.md) |
| Conventions | [baseline/conventions.md](baseline/conventions.md) |

## Stack
- JavaScript, CommonJS `require` (app/src/server/index.js:4-10); Python 3 + Pillow only for a thumbnail tool (app/tools/make_thumbs.py:5-6)
- Runtime dep `socket.io ^4.7.5`; dev dep `socket.io-client ^4.8.4` (app/package.json:12-17)
- Data store: none, rooms live in an in-memory `Map` (app/src/server/rooms.js:4)
- Client: static HTML pages loading `/socket.io/socket.io.js`, `/data.js`, `/common.js` (app/public/index.html:11-13)
- Frontend framework, bundler, linter, typechecker: none found [verify]

## Layout
Summary in [baseline/layout.md](baseline/layout.md). `app/` holds the game, `docs/` the rules and card art, `poc/index.html` the original prototype (app/src/engine/game.js:1). Entry: `app/src/server/index.js` (app/package.json:6).

## Conventions
Summary in [baseline/conventions.md](baseline/conventions.md): ack-callback errors as Thai strings, mixin engine, closure-injected handler deps, shared data.js on both sides, golden-master tests.

## Commands
- Install: `npm install` in app/ [verify] (no script; deps in app/package.json:12-17)
- Start: `npm start` = `node src/server/index.js` (app/package.json:8); port `PORT` env, default 3000 (app/src/server/index.js:12)
- Test: `npm test` (app/package.json:10), runs test/golden/run.js, http-parity.js, mod-actions.js, simulate.js, events.js
- Balance sim: `npm run balance` (app/package.json:9)
- Golden snapshot re-record: `node test/golden/run.js --record` (app/test/golden/run.js:3)
- Build, lint, typecheck: none defined

## Runtime and deploy
- Node version pin, `engines`, Dockerfile, CI: none found (scan.json: infra [], runtimePins {})
- Deploy method unknown [verify]
- `app/node_modules/` is git-ignored (.gitignore:1)

## Existing docs
- docs/deadline_necromancer_design.md, ..._player_rules.md, ..._event_cards.md; card art in docs/event_cards, role_cards, trap_cards, booster_cards (scan.json: docs.docsDir)
- docs/deadline_necromancer_daily_rule_ideas.md is untracked in git status at scan time [verify]
- No README, CLAUDE.md, AGENTS.md, CONTRIBUTING or ADRs (scan.json: docs)
- Server serves only .jpg/.png from docs/ at `/docs/*` (app/src/server/http.js:23-27)

## Open issues
- Room codes and tokens use `Math.random`, not crypto; the moderator token authorizes mod actions (app/src/server/rooms.js:5-6, app/src/server/handlers/session.js:14)
- Rooms are never deleted from the `rooms` Map (grep of `rooms.delete` shows none) [verify]
- `serveFile` guard `file.startsWith(base)` has no trailing separator check, so a sibling directory with the same prefix would pass (app/src/server/http.js:10); `decodeURIComponent` on a malformed URL can throw (app/src/server/http.js:18)
- `mod:create` has no auth; anyone connecting can create a room (app/src/server/handlers/session.js:6)
- Test scripts bind fixed ports 3111-3113 (app/test/simulate.js:2, app/test/http-parity.js:7, app/test/mod-actions.js:9)
- Shuffle for seat order uses `sort(() => Math.random() - 0.5)` (app/src/server/handlers/moderator.js:14)
- Golden tests run the engine with seeded bot but engine uses `Math.random` (app/src/engine/random.js:1-2); how determinism is achieved is [verify] (see app/test/golden/bot.js)
- Untracked/modified items in git status (docs/event_cards 16-20 images) are not in this baseline

## [verify]
- Install command and Node version the team uses
- Deploy target and whether any CI exists outside the repo
- Whether `rooms` cleanup happens anywhere
- How golden tests seed `Math.random` (app/test/golden/bot.js not read in full)
- Client-side code (app/public/index.html, mod.html, common.js, card-info.js) not read beyond script tags; its structure and state handling are [verify]
- Engine internals of night-resolve.js, vote.js, events.js, win.js, views.js not reviewed in depth
