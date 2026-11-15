# Layout

```
app/
  package.json            scripts, deps (app/package.json:7-17)
  public/                 static client: index.html (player), mod.html, gallery.html, common.js, card-info.js, style.css, thumbs/
  src/
    server/               index.js bootstrap, http.js static, rooms.js store, paths.js, handlers/{session,moderator,player}.js
    engine/               game.js + mixin parts: chat, events, vote, night-input, night-resolve, phases, win, views, mod-view; constants.js, random.js, index.js
    shared/data.js        roles, events, traps, boosters, image maps; loaded by Node and the browser
  test/                   balance.js, events.js, http-parity.js, mod-actions.js, simulate.js, golden/{run,bot,targets}.js + snapshot.json
  tools/make_thumbs.py    Pillow thumbnail generator (app/tools/make_thumbs.py:5-6)
docs/                     rules, design, event cards, role/trap/booster card art
poc/index.html            original single-file prototype (app/src/engine/game.js:1)
```

## Entrypoints
- Server: app/src/server/index.js; requiring it starts listening (app/src/server/index.js:3, 26)
- Engine public API: `require('src/engine')` returns `{ Game, COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS }` (app/src/engine/index.js:2, app/src/engine/game.js:87)
- Routes: `/` index.html, `/mod` mod.html, `/gallery`, `/data.js` (from src/shared), `/docs/*.jpg|png`, anything else from public/ (app/src/server/http.js:19-28)

## Socket events
- Session: `mod:create`, `mod:join`, `player:join`, `disconnect` (app/src/server/handlers/session.js:6-38)
- Moderator: `mod:do` with actions start, secrets, kick, reset, toVote, closeVote, toNight, closeNight, closeEvent, closeBooster, announce, pause, timer (app/src/server/handlers/moderator.js:9-36)
- Player: `p:chat`, `p:dark`, `p:vote`, `p:night`, `p:event`, `p:booster` (app/src/server/handlers/player.js:12-17)
- Server to client: `state` (per-role view), `kicked` (app/src/server/rooms.js:19-22, app/src/server/handlers/moderator.js:22)

## Game flow
Phases MORNING, VOTE, VOTE_RESULT, NIGHT, OVER; moderator drives transitions; 5 days then timeout (app/src/engine/phases.js:9-39). 6-12 players, side split in COMP (app/src/engine/constants.js:2-3).

## Monorepo
None.
