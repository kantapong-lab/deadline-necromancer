# backend-dev: change-refactor-structure

Branch be/change-refactor-structure, worktree .worktrees/be-change-refactor-structure, HEAD 976649e (19 commits after 375f88f).

- Tests recorded on baseline 7a91743 first: test/golden (105 seeded games, ~19.6k steps, coverage gate 71/71), test/http-parity.js (21 URLs), test/mod-actions.js (71 steps). `npm test` runs all four plus simulate.js.
- Layout: app/src/{server,engine,shared}; data.js moved 100% unchanged; no app/server.js shim; public/, tools/, docs/, poc/ untouched.
- Engine: Game in game.js + method-object parts mixed on via mixin() (throws on duplicate names); parts use 'use strict' (class bodies were strict).
- Server: paths.js, http.js, rooms.js (also holds ack), handlers/{session,moderator,player}.js, index.js bootstrap.
- Test require lines live in test/golden/targets.js, test/http-parity.js, test/mod-actions.js, test/simulate.js.
- Working tree files are CRLF (autocrlf), blobs LF: scripts that edit source must detect the line ending.
- Found, not fixed: socket `mod:do` with a null payload throws in the handler destructure (server crash).
- Not done: plan step 9 browser smoke, Phase C, S5, resolveNight decomposition.
