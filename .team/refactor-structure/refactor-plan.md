# Refactor plan: app/ structure (behaviour-preserving)

Scope: `app/` only. `docs/`, `poc/` untouched. No rule, UI, URL or Thai-string change. Plan only; no source edited.
Rules for every step: one move OR one extraction, never a move plus a logic change. Method/function bodies are moved byte-for-byte.

## 0. Design rules (decisions already made)

1. **Public URLs are frozen.** `/`, `/mod`, `/gallery`, `/data.js`, `/style.css`, `/common.js`, `/card-info.js`, `/thumbs/*`, `/docs/*.jpg|png`, `/socket.io/*`, `/?room=XXXX`. Phase A edits zero HTML files.
2. **CommonJS stays.** No ES modules, no bundler, no TypeScript. Client stays classic scripts with globals (`data.js` -> `common.js` -> inline; inline `onclick="fn()"` needs globals).
3. **`app/` stays the package root** (`package.json`, `node_modules`, `public/`, `tools/`, `test/` stay). New code goes under `app/src/`.
4. **Engine keeps `Game` as one facade class**; method groups are moved into files and mixed onto the prototype. `g.closeVote()` etc. keep working; no require cycles (modules never `require` each other, only `../shared/data`, `constants`, `random`).
5. **Math.random call order is part of behaviour.** Moving code must not reorder `shuffle`/`rnd` calls.
6. **Every path is derived from one `APP_ROOT`** (`src/server/paths.js`), so cwd never matters (launch.json runs from repo root).

## 1. Current-state findings

| # | Where | Smell | Why it matters |
|---|---|---|---|
| F1 | `engine.js` 1-677 | One file, one class, ~45 methods, 8 concerns: setup (13-43), helpers (45-68), chat (70-85), event/booster votes (87-131), day vote (133-204), night input (206-257), night resolution (259-469), phase control (471-545), win (547-570), views + mod guidance (572-674) | Hard to navigate; every change risks the rest |
| F2 | `engine.js` 259-469 | `resolveNight` = 210 lines, ~12 ordered stages sharing closure state (`A`, `notes`, `rep`, `shield`, `heal`, `immune`, `deaths`...); lines up to ~300 chars (362-363, 434) | Order is rule-critical (Scope Creep -> locks -> shield/heal -> curse -> mana -> intel -> credit...) and uses `Math.random` mid-way (hotdesk 291, prod 322/342, audit 395, reply-all 446, recruiter 458) |
| F3 | `engine.js` 144, 209, 260, 490, 630, 643, 660 | Mixed styles: `const G = this, P=..., nm=...` aliasing in some methods, plain `this` in others | Inconsistent; blocks mechanical extraction unless bodies stay verbatim |
| F4 | `engine.js` (30 lines) + `server.js` + both HTML | Phase names `'MORNING'/'VOTE'/'VOTE_RESULT'/'NIGHT'/'OVER'/'LOBBY'` are bare strings (50 occurrences in app/, excl. node_modules) | Typo-prone; but they are also the client wire protocol, so do NOT rename (defer) |
| F5 | `engine.js` everywhere | Thai player-facing messages inline in rule logic | Untestable/un-i18n-able; out of scope, byte-identical rule |
| F6 | `server.js` 1-156 | Four concerns in one file: static HTTP (14-35), room store + views (38-57), socket handlers (59-153), bootstrap (155-156) | Mixed lifecycle; cannot test pieces |
| F7 | `server.js` 123-134 | Layering leak: moderator branch writes engine internals (`g.paused =`, `g.timer =`, `g.sys`, `g.log`, `g.event?.pending`, `g.booster.open`) | Server knows engine fields; engine cannot protect its invariants |
| F8 | `server.js` 28 + `data.js` | `data.js` sits at app root, is the only non-`public/` file served to browsers (special route), mixes server rule tables with client asset URL constants (`IMG`, `*THUMB`, lines 62-69) and a hand-listed export (70) | Unclear ownership; "shared" is implicit |
| F9 | `public/*.html` | Inline JS: `index.html` 14-254 (~240 lines), `mod.html` 14-113 (~100), `gallery.html` 49-92 (~44) + inline CSS `gallery.html` 8-38 | Page = markup + app code + styles; no caching, no reuse |
| F10 | `gallery.html` 50, 52, 68 | Duplicates `esc` (= `common.js:3`) and `FN` (= `FNAME`, `data.js:4`); `$f = ...` is an undeclared implicit global (68) | Drift risk. Fixing is optional; implicit global makes `'use strict'`/modules unsafe |
| F11 | `test/simulate.js` | Randomised (`Math.random`), checks invariants only (no crash, no role leak, reaches OVER, no errors). Does not exercise `secrets`, `kick`, `reset`, `pause`, `timer`, `announce`, `closeEvent`, `closeBooster`. Hoisted odd `mods()` at 72 | **Cannot detect a rule change** (off-by-one Mana, reordered night step, changed Thai string all pass). Not enough alone to prove a refactor |
| F12 | `package.json` / `.claude/launch.json` | `main` and `start` point to `server.js`; launch.json points to `app/server.js` | Must follow any move |
| F13 | `README.md` structure table, `docs/deadline_necromancer_design.md` 145-167, 229, 238 | Name `app/engine.js`, `app/server.js`, `app/data.js` | Go stale after the move (docs is out of scope: see decision D1) |

Out-of-scope findings (record only; fixing changes behaviour; make a separate ticket):
- `server.js:16` `file.startsWith(base)` has no trailing separator (sibling dir `public-x` would pass).
- `server.js:24` `decodeURIComponent` is unguarded: malformed URL (`/%E0%A4%A`) throws an uncaught `URIError` and can crash the process.
- `server.js:111` seat shuffle `sort(() => Math.random() - 0.5)` is biased.
- `server.js:39` rooms are never deleted (memory grows).
- `engine.js:344` empty `if (!t) { }` branch.

## 2. Target tree

```
app/
  package.json              (main/start/test updated)
  README.md                 (structure table updated)
  src/
    server/
      index.js              bootstrap: build http server + io, register handlers, listen on require, export { httpServer, io, rooms }
      paths.js              APP_ROOT, PUBLIC, DOCS, SHARED (single source of paths)
      http.js               MIME, serveFile, route table (/ /mod /gallery /data.js /docs/*, static fallback)
      rooms.js              rooms Map, token(), newCode(), lobbyView(), createPushState(io)
      handlers/
        session.js          mod:create, mod:join, player:join, disconnect
        moderator.js        mod:do (start/secrets/kick/reset + engine-delegated actions)
        player.js           playerAct + p:chat/dark/vote/night/event/booster
    engine/
      index.js              exports { Game, COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS }
      game.js               class Game: constructor + helpers (P nm alive er spec hasSkill evIs skillsBanned curseBlocked sys log candidates canRest); mixes parts below
      constants.js          COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS
      random.js             shuffle, rnd (still call global Math.random at call time)
      chat.js               chat, darkSay
      events.js             castEventChoice, closeEventVote, castBooster, closeBoosterVote, drawEvent, replyAllLeak
      vote.js               castVote, closeVote
      night-input.js        submitNight, setCopies
      night-resolve.js      resolveNight
      phases.js             toVote, toNight, closeNight
      win.js                checkEnd, endGame
      views.js              revealed, pubPlayers, common, viewFor
      mod-view.js           pending, guidance, modView
    shared/
      data.js               (moved from app/data.js; unchanged bytes; still UMD; served at /data.js)
  public/                   UNCHANGED in Phase A (index.html mod.html gallery.html style.css common.js card-info.js thumbs/)
  test/
    simulate.js             (existing; one require path changed)
    golden/ run.js bot.js snapshot.json     NEW characterization test (see section 6)
    http-parity.js          NEW URL parity check
    mod-actions.js          NEW socket test for the untested moderator actions
  tools/make_thumbs.py      UNCHANGED
```

Optional Phase C (client tidy, needs user OK, changes URLs so HTML is edited): `public/css/style.css`, `public/js/{common,card-info,player,mod,gallery}.js`; inline script bodies extracted verbatim into the `js/` files, classic `<script src>`, same order and position; gallery inline CSS to `css/gallery.css`. `public/thumbs/` stays (generated by make_thumbs.py, URL-addressed).

## 3. Move / rename table

| Old | New | Phase |
|---|---|---|
| `app/server.js` | split into `app/src/server/{index,paths,http,rooms}.js` + `handlers/{session,moderator,player}.js` | A |
| `app/engine.js` | split into `app/src/engine/*` (section 4) | A |
| `app/data.js` | `app/src/shared/data.js` (git mv, no content change) | A |
| `app/test/simulate.js` | stays; line 4 require changed | A |
| `app/test/golden/*`, `http-parity.js`, `mod-actions.js` | new | A (step 1-3, before any move) |
| `app/public/style.css` | `app/public/css/style.css` | C (optional) |
| `app/public/common.js`, `card-info.js` | `app/public/js/common.js`, `js/card-info.js` | C |
| inline script `index.html` 14-254 / `mod.html` 14-113 / `gallery.html` 49-92 | `public/js/player.js` / `mod.js` / `gallery.js` | C |
| `app/public/thumbs/**`, `app/tools/make_thumbs.py`, `app/package-lock.json` | no change | - |

Decision D3: **no `app/server.js` shim.** Only 3 references change (package.json, launch.json, test require); a shim would leave a permanent stray file. (Alternative if the user wants zero external edits: 1-line shim `module.exports = require('./src/server');`.)

## 4. Engine split

Mechanism: each part file exports a plain object of methods (shorthand methods, `this` = Game). `game.js` does `mixin(Game, chat, events, vote, nightInput, nightResolve, phases, win, views, modView)`, where `mixin` copies descriptors with `enumerable:false` (matches class methods) and **throws on duplicate method names**. Bodies are pasted verbatim (existing `const G = this` aliases kept). Because calls go through `this`, cross-calls (`toVote -> closeEventVote -> checkEnd`; `closeNight -> resolveNight, drawEvent -> replyAllLeak, checkEnd, endGame`) need no imports.

| Module | Responsibility | Methods (current lines) | Requires |
|---|---|---|---|
| `constants.js` | roster limits, side ratios, emojis | consts 9-11 | none |
| `random.js` | shuffle, rnd | 5-6 | none (uses global `Math.random` at call time, so tests can seed it) |
| `game.js` | state + helpers + composition | constructor 14-43, helpers 46-68 | `../shared/data`, constants, random, all parts |
| `chat.js` | morning chat, dark chat | 71-85 | constants (EMOJIS) |
| `events.js` | event-card vote, booster vote, event draw, reply-all leak | 88-131, 528-545 | data (EVENTS, BOOSTERS), random |
| `vote.js` | day vote cast + tally/outcome/traps | 134-204 | data (ROLES, FNAME), random |
| `night-input.js` | night action validation, Mystery Intern copy | 208-257 | data (ROLES, TRAPS) |
| `night-resolve.js` | whole night resolution | 259-469 | data (ROLES, TRAPS, FNAME), random |
| `phases.js` | moderator phase transitions | 472-527 | data (DAYS), random |
| `win.js` | win check, end game | 548-570 | none |
| `views.js` | per-player view | 573-628 | data (ROLES, EVENTS, TRAPS, FNAME, DAYS) |
| `mod-view.js` | moderator pending/guidance/view | 629-674 | data (EVENTS) |

`resolveNight` is moved whole (one method, no decomposition) in this refactor. If decomposed later: a fixed-order pipeline over one shared `ctx` object in this exact order: build actions `A` + mark once-skills -> Trap placement -> skills-banned/Hot Desking -> Scope Creep -> locks (devops/chrono) -> shield/heal/Espresso -> Production shield -> Curse (+ prod random curse) -> shield-break (PM lock) + Overpromise/PIP/NDA -> Mana -> intel (Code Review, Bug Bounties, KPI, Wireframe) -> Take Credit/Poach/Fake Bug -> Reply All -> trap cleanup -> deaths + recruiter retarget -> deliver notes -> report/feed/log. That is a separate, later change, only after the golden coverage gate (section 6) is green.

**Public interface that must not change** (what `server.js` and tests touch):
- Constructor: `new Game(names[])` (throws on N outside 6-12).
- Methods: `viewFor(pid)`, `modView(secrets)`, `toVote()`, `closeVote()`, `toNight()`, `closeNight()`, `closeEventVote()`, `closeBoosterVote()`, `chat(pid,text)`, `darkSay(pid,text)`, `castVote(pid,target)`, `submitNight(pid,data)`, `castEventChoice(pid,accept)`, `castBooster(pid,key)`, `sys(text)`, `log(title,text)`.
- Fields read/written directly by server: `phase`, `event?.pending`, `booster.open`, `paused` (write), `timer` (write: `{sec,endsAt,phase}`).
- Module exports: `{ Game, COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS }`; `data.js` exports unchanged.

**Order of extraction** (each = one commit, golden + `npm test` after): E0 `constants.js` + `random.js` -> E1 `views.js`, `mod-view.js` (read-only, safest) -> E2 `win.js` -> E3 `events.js` -> E4 `chat.js` -> E5 `vote.js` -> E6 `night-input.js` -> E7 `phases.js` -> E8 `night-resolve.js` -> E9 leftover becomes `game.js`; `engine/index.js` re-exports.

Server split order: S1 `paths.js` + `http.js` -> S2 `rooms.js` -> S3 `handlers/{session,player,moderator}.js` (per-socket `ctx`/`member` closures passed in) -> S4 `index.js` bootstrap. Optional S5 (decision D5): fix F7 by adding `Game#announce(text)`, `#setPaused(on)`, `#setTimer(sec)` with identical bodies/strings and having the handler call them; only after `mod-actions.js` is recorded on the baseline.

Server interface that must not change: socket events `mod:create`, `mod:join`, `player:join`, `mod:do`, `p:chat|dark|vote|night|event|booster`, `state`, `kicked`, `disconnect`, ack shapes `{ok, error?}`; `require('src/server')` still starts listening (reads `process.env.PORT` at require time) and exports `{ httpServer, io, rooms }`.

## 5. References to update

Phase A (HTML, `make_thumbs.py`, `poc/`, `.gitignore`, `package-lock.json`: no change):

| File | Change |
|---|---|
| `app/package.json` | `main`: `src/server/index.js`; `scripts.start`: `node src/server/index.js`; `scripts.test`: golden + http-parity + mod-actions + simulate (see section 6) |
| `.claude/launch.json` (repo root) | `runtimeArgs`: `app/server.js` -> `app/src/server/index.js` (config outside app/; needs OK, D1 note) |
| `app/test/simulate.js` line 4 | `require('../server')` -> `require('../src/server')` |
| `app/src/server/paths.js` | `APP_ROOT = path.resolve(__dirname,'..','..')`; `PUBLIC = APP_ROOT/public`; `DOCS = APP_ROOT/../docs` (same resolved strings as today, so the `startsWith` guard behaves identically); `SHARED = APP_ROOT/src/shared` |
| `app/src/server/http.js` | `/data.js` route -> `serveFile(res, SHARED, 'data.js')`; `/docs/` rule and static fallback unchanged |
| `app/src/engine/*` | `require('../shared/data')` (was `./data` in engine.js:3) |
| `app/src/shared/data.js` | content unchanged (its `IMG`/`*THUMB` values are URLs, not paths) |
| `app/README.md` | structure table (lines 22-31) to new paths; keep run instructions (`cd app; npm install; npm start`) |
| `app/tools/make_thumbs.py` | none: stays at `app/tools`, `DOCS=../../docs`, `OUT=../public/thumbs` still resolve |

Phase C only: `<link href="/style.css">` (index/mod/gallery line 7) -> `/css/style.css`; `<script src="/common.js">` (index/mod line 13) -> `/js/common.js`; `<script src="/card-info.js">` (gallery 48) -> `/js/card-info.js`; replace each inline `<script>` body with `<script src="/js/<page>.js">`; `README.md` thumbs/structure text.

Not in scope, user decision D1: `docs/deadline_necromancer_design.md` 145-167, 229, 238 will name old paths.

## 6. Behaviour-preservation check

Limit of the existing test: `simulate.js` only proves "does not crash and reaches OVER" and is nondeterministic. It cannot prove rules are unchanged. So three recorded-on-baseline checks are added **before any move**.

**G1 Golden master (engine).** `test/golden/run.js` + `bot.js`:
- Seeded PRNG replaces `Math.random` (e.g. mulberry32) and `Date.now` is a fixed counter; drive `Game` directly (no sockets) with a bot policy like `simulate.js` (chat, event/booster votes, votes, night actions incl. dark side actions/traps/plus1), seeded from the same stream.
- Games: N = 6..12, ~15 seeds each (~100 games). After every action record `sha256(JSON.stringify({ viewFor(p) for all p, modView(true), modView(false) }))`; snapshot stores the per-game hash chain + final `over`.
- Record once on the untouched code into `snapshot.json`. Every later step must match exactly. `--dump <file>` writes full per-step JSON so a divergence can be diffed against a dump made from the baseline commit.
- Any change of `Math.random` call order shows up as a diff. That is correct: different draws are a behaviour change.
- **Coverage gate before recording:** the run prints coverage and must show all 15 events (accept and reject for the 5 choice cards incl. `prod`), all 3 boosters opened, all 6 traps placed and triggered, all 17 roles' skills used, hijack, silence, zero/dbl vote, Freelance Dodge, Chrono rollback incl. Insurance, burnout deaths, timeout and each winner kind (light, dark, indie solo wins). Add seeds or bot bias until none is missing, then freeze.

**G2 HTTP parity.** `test/http-parity.js` (start on `TEST_PORT`, `fetch` each): expected status + content-type + sha256 of body for non-HTML static files. Table:
- 200: `/` `/mod` `/gallery` `/data.js` `/style.css` `/common.js` `/card-info.js` `/index.html` `/mod.html` `/socket.io/socket.io.js`, one `/thumbs/roles-md/team_deliver/01_senior_dev.jpg`, one `/docs/event_cards/01_fast_approval.jpg`
- 403: `/docs/deadline_necromancer_design.md`, `/docs/..%2f..%2fx.jpg`, `/..%2fserver.js`
- 404: `/nope`, `/thumbs/none.jpg`
- Phase A: HTML bodies must be byte-identical. Phase C: instead assert every `src`/`href` in each page resolves 200 with the right content-type, and the extracted `js/<page>.js` is byte-identical to the old inline script body (diff against baseline).
- Do not include malformed-percent URLs (known crash, out of scope).

**G3 Moderator actions.** `test/mod-actions.js` over Socket.IO, recorded on the baseline: lobby kick, `secrets` on/off (modView shape), `start` twice (error string), `reset`, `pause` on/off (player action rejected with `Moderator พักเกมอยู่`), `timer` set/clear (shape, ignoring `endsAt`), `announce` (feed + timeline), `closeEvent`/`closeBooster` error strings, non-mod `mod:do` rejected, rejoin by token and by offline name. Expected `{ok,error}` strings and state fields saved as JSON.

**Gate after every step:** `node test/golden/run.js` (empty diff) -> `node test/http-parity.js` -> `node test/mod-actions.js` -> `npm test` (simulate, ALL OK). Test script order in package.json runs them in that sequence.

**Manual smoke (once after Phase A, once after Phase C):** `npm start` from `app/` and from repo root via launch.json (cwd independence); open `/mod` (create room), 6 player tabs `/?room=CODE`; confirm lobby, start, chat, event/booster vote panel, vote, night, thumbnails and tap-to-open full images, game over screen; `/gallery` filters + lightbox ( <- -> , Esc ); reload a player tab (token rejoin); browser console shows no 404/errors.

## 7. Risks and ordered steps

Risks: (R1) simulate.js passes while a rule silently changed -> mitigated by G1-G3. (R2) `Math.random` order changes -> G1. (R3) mixin loses `this` or shadows a method -> duplicate-name throw + G1. (R4) `__dirname`-relative paths break after moving files -> `paths.js` + G2 + launch from repo root. (R5) `simulate.js` relies on require-time listen -> `index.js` keeps it. (R6) Phase C: inline scripts depend on globals/order and implicit global `$f` -> classic scripts only, same position, no `'use strict'`, byte-diff of script bodies. (R7) No git yet -> D2. (R8) Pre-existing bugs tempt "while I'm here" fixes -> forbidden in this task.

Decisions needed from the user (plan assumes the default):
- D1: `docs/design.md` 145-167/229/238 and `.claude/launch.json` name old paths. Default: update `launch.json` (needed to run), leave `docs/` stale and list it as a follow-up.
- D2: no git repo. Default: Orchestrator/user runs `git init` + baseline commit before step 1 so each move is reviewable and revertible.
- D3: no `server.js` shim (default).
- D4: Phase C (client folders + inline script extraction) in or out. Default: out until Phase A is accepted.
- D5: optional S5 (move mod-action internals into `Game` methods). Default: out.

Ordered steps (each is its own commit; stop and revert on any gate failure):
1. `git init` + baseline commit (excludes `node_modules`) [D2].
2. Add `test/golden/*`, run on untouched code, pass coverage gate, record `snapshot.json`; commit.
3. Add `test/http-parity.js` and `test/mod-actions.js`, record on baseline; update `scripts.test` to run all four; commit.
4. Pure moves, no extraction: `git mv app/data.js app/src/shared/data.js`; `git mv app/engine.js app/src/engine/game.js` (temporary home of the whole file); `git mv app/server.js app/src/server/index.js`. Only require/path lines change (engine `require('../shared/data')`, server `require('../engine/game')` then `paths` constants for PUBLIC/DOCS/SHARED computed from APP_ROOT, `/data.js` route -> SHARED); update package.json, launch.json, simulate.js require. Gate. (From here the folder layout is final; content is still verbatim.)
5. Add `src/engine/index.js` re-export and point the server at it; gate.
6. Engine E0..E9 one extraction per commit. Gate each.
7. Server S1..S4 one extraction per commit. Gate each.
8. Update `README.md` structure table; remove nothing else.
9. Manual smoke (section 6).
10. Final report: files moved, grep proof that no reference to `app/server.js`, `app/engine.js`, `app/data.js`, `./data`, `../server` remains.
11. (Optional, if D4) Phase C as separate steps: css move, js move (common, card-info), then one inline-script extraction per page (index, mod, gallery), parity gate each.
12. (Optional, later) `resolveNight` pipeline decomposition and S5, each only behind the unchanged G1 coverage gate.
