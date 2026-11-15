# Conventions

## Naming and style
- camelCase functions; `registerX` handler factories (app/src/server/handlers/session.js:5); event names `scope:verb` (`mod:do`, `p:vote`) (app/src/server/handlers/player.js:12-17)
- Terse engine names: `P`, `nm`, `er`, `evIs`, `sys`, `log` (app/src/engine/game.js:60-70)
- Dense one-line style, semicolons, single quotes, 2-space indent; no formatter config found [verify]
- Header comment on each file stating its role (app/src/server/rooms.js:1, app/src/server/paths.js:1); comments mix Thai and English (app/src/server/index.js:2-3)
- `'use strict'` only in some files (app/src/engine/phases.js:1; absent in game.js)

## Modules
- CommonJS everywhere (`require`, `module.exports`) (app/src/server/index.js:4-10)
- Engine split as mixin objects of methods merged onto `Game.prototype`; duplicate names throw at load (app/src/engine/game.js:18-24, 85)
- Handlers are `module.exports = function register(socket, deps)` with deps `{ io, rooms, ctx, member, pushState }` built per connection (app/src/server/index.js:17-23)
- `src/shared/data.js` is dual-use: browser global plus conditional `module.exports` (app/src/shared/data.js:70)
- All filesystem paths come from `paths.js` (app/src/server/paths.js:1)

## Error handling
- Engine and handlers return a Thai error string on failure and `null`/undefined on success; the handler acks `{ ok:false, error }` or `{ ok:true }` (app/src/server/handlers/moderator.js:39, app/src/server/handlers/player.js:9-10)
- `ack` tolerates a missing callback (app/src/server/rooms.js:25)
- Throws only for programmer errors: invalid player count, mixin duplicates (app/src/engine/game.js:30, 21)
- No try/catch or logging framework found; only one `console.log` at startup (app/src/server/index.js:26)

## Auth and sessions
- Moderator: room code plus `modToken` (app/src/server/handlers/session.js:12-14); checked via `socket.data.mod` on `mod:do` (app/src/server/handlers/moderator.js:7)
- Player: per-member `token`; rejoin by token or by an offline same name (app/src/server/handlers/session.js:21-27)
- Per-socket identity held in `socket.data` (app/src/server/handlers/session.js:9, 35)
- Input sanitising: names trimmed to 14 chars, announce to 200 (app/src/server/handlers/session.js:23, app/src/server/handlers/moderator.js:33)

## Data access and state
- No database; `rooms` Map of `{ code, modToken, modSockets, members, game, secrets }` (app/src/server/handlers/session.js:8)
- State push: after every action `pushState(room)` sends a per-recipient `state` view (`viewFor` for players, `modView` for moderator) so hidden info stays server-side (app/src/server/rooms.js:13-23)
- Randomness via `shuffle`/`rnd` helpers over `Math.random` (app/src/engine/random.js)

## Config
- Only `PORT` env (default 3000) (app/src/server/index.js:12); tests use `TEST_PORT`, `GOLDEN_SEEDS`, `BALANCE_MANA`, `BALANCE_COMP` (app/test/simulate.js:2, app/test/golden/run.js:15, app/test/balance.js:15-16)

## Tests
- Plain node scripts, `assert` and exit codes, no test framework (app/package.json:10, app/test/events.js:4)
- Golden-master: seeded bot plays games for 6-12 players, compared to `snapshot.json`; has a coverage gate; `--record` rewrites it (app/test/golden/run.js:1-47)
- Socket tests start the real server by requiring it with `PORT` set and use socket.io-client (app/test/simulate.js:2-5)
- `test/golden/targets.js` is the single place naming code under test (app/test/golden/targets.js:1-2)
- Run only from app/ (scripts use relative `test/...` paths) (app/package.json:10)
