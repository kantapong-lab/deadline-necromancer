# Shared helper: `app/tools/e2e-pw-common.js` (AC-1)

Pure extraction of the setup block of `e2e-pw.js`. CommonJS, no side effect at require time except exports. Both runners call it in the order below. Strings printed and check names stay byte-identical to today.

## Exports
| Export | Signature | Behaviour (copied from e2e-pw.js) |
|---|---|---|
| `N` | `12` | seat count |
| `sleep` | `ms => Promise` | |
| `loadPw()` | `() => pw \| null` | tries `PLAYWRIGHT_DIR` then bare, `playwright-core` then `playwright`, rethrows non-MODULE_NOT_FOUND |
| `initEnv(defaultPort)` | `string => void` | `process.env.PORT = E2E_PORT \|\| defaultPort`; deletes `HTTPS_KEY`, `HTTPS_CERT`. MUST run before `startRoom()` (server reads PORT at require) |
| `makeChecker()` | `() => {results, check}` | `check(name, ok, detail)` pushes `{name, ok: !!ok, detail}` and prints `PASS `/`FAIL ` + name + (` :: ` + detail) |
| `makeWatch(errs)` | `errs[] => (page, tag) => void` | same `pageerror` / `console error` (ignoring `Failed to load resource\|WebGL\|GPU\|AudioContext`) / HTTP>=400 (ignoring `favicon.ico`) pushes |
| `startRoom()` | `async => Room` | requires `../src/server/index`, `socket.io-client`, `createPushState`; waits for `listening`; connects the mod socket; `mod:create`. Room = `{base, code, modToken, mod, act, httpServer, io, rooms, pushState, close}`; `act(action, payload)` = `mod:do` emit; `close()` = `mod.close(); io.close(); httpServer.close()` |
| `launchBrowser(pw, extraArgs?)` | `async => browser` | `pw.chromium.launch({headless: !E2E_HEADED, executablePath: CHROME \|\| undefined, args: extraArgs})`; e2e-pw passes none |
| `joinPlayers(browser, room, o)` | `async => {pages, ctxs}` | per i in 0..N-1: `newContext({viewport 390x844, deviceScaleFactor 1, ...o.contextOptions})`, `newPage`, `o.onPage?.(page, ctx, i, t0)` (`t0 = Date.now()` taken just before `newPage`), `o.watch(page, 'p'+i)`, `goto(base/?room=code)`, fill `#jname` = `P01`.., click `button:has-text("เข้าห้อง")`, wait `S.phase === 'LOBBY'` (15 s). Does NOT print the "12 players joined" check (runner does) |
| `openMod3d(browser, room, o)` | `async => {mctx, m3}` | `newContext({viewport 1440x900, ...o.contextOptions})`, `newPage`, `o.onPage?.(m3, mctx, 'mod', t0)`, watch tag `mod3d`, init script sets `localStorage dn-mod = {code, modToken}`, `goto(base/mod3d.html)`, `sleep(1500)` |
| `startGame(room, m3, check)` | `async => {room: R, G, seat}` | `act('start')` + check `game started`; wait `__mod3d.desks.length > 0` (60 s) + check `mod3d booted the 3D scene with a desk per player`; click `#sgBtn` if visible then `sleep(800)` (this registers mod3d for voice); `G = rooms.get(code).game`; `seat(i)` = index in `G.players` of name `P{i+1}` (the engine pid) |
| `clickIf(page, sel)` | `async => bool` | first match, if count and enabled, click |

## `e2e-pw.js` after the change
- Delete its local `loadPw`, `sleep`, `check/results`, `watch`, join loop, mod3d open, start/boot/sgBtn block, `clickIf`; call the helper instead. Env: `initEnv('3340')` first.
- Keep as is: `OUT` (`E2E_OUT`) and header comment, the `room ... screenshots` log line, the `12 players joined through the join form` check (between joinPlayers and openMod3d), oracle seeding, game loop, Data Correlation checks, contact sheets, final `E2E OK|FAILED` line, `main().then(process.exit)`.
- `launchBrowser(pw)` with no extra args, `joinPlayers`/`openMod3d` with no `contextOptions`/`onPage`: output and exit code identical.
- Verify (AC-1): `node tools/e2e-pw.js` before and after on the same machine: identical list of check names in order (random vote/night picks may change detail text, not the names set), exit 0.

## Voice runner usage of the same helper
`initEnv('3341')`, `startRoom`, `launchBrowser(pw, VOICE_ARGS)`, `joinPlayers`/`openMod3d` with `contextOptions: {recordVideo: {dir, size}, permissions: ['microphone']}` and `onPage` that records `t0`, grabs `page.video()` and registers the hook with `ctx.addInitScript(voiceHook, opts)` (see hooks.md), then `startGame`.
