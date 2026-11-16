# File ownership

One owner per row; patterns do not overlap. (The `Don't touch: app/**` in the Orchestrator brief applied to the architect only: contract, no code. FE and BE edit the files below.)

| Path | Owner | Change |
|---|---|---|
| `app/public/index.html` | FE | `chatBar()`, `sendChat`, new `quick`/`toggleQuick`/`chatErrText`, `render()` focus-restore fix, `qrScroll` handling |
| `app/public/style.css` | FE | `.qr-*`, `.btn.qr`, `#chatSend` layout, mobile `.chatbar input` rule |
| `app/src/shared/data.js` | BE | add `QUICK_REPLIES` + export |
| `app/test/quick-replies.js` | BE | new engine test (see `ac-map.md`) |
| `app/package.json` | BE | append `&& node test/quick-replies.js` to the `test` script (or the test never runs) |
| `app/test/http-parity.json` | BE | re-record after merge (below) |

Not edited by anyone (D-2): `app/src/engine/chat.js`, `app/src/engine/constants.js`, `app/src/server/**`, `app/public/mod*.html`, `app/public/common.js`, all other tests.

Parallel work: FE only needs the name `QUICK_REPLIES` (an array of 23 strings, schemas.md) and can develop against a local stub until BE's `data.js` lands. BE needs nothing from FE.

## Parity break (expected, not a regression)

`app/test/http-parity.js` is in `npm test` and hashes served bodies. This change deliberately alters exactly these URLs: `/data.js` (BE), `/style.css`, `/`, `/?room=ABCD`, `/index.html` (FE; the last three are the same file). Each branch's own `http-parity` run will therefore show DIFF on its own URLs only. After BOTH branches are merged, one run of `node test/http-parity.js --record` by BE (or the Orchestrator at integration) rewrites `http-parity.json`; review the diff: only those 5 URLs may change (`/mod`, `/gallery`, `/common.js`, `/card-info.js`, `/mod.html`, `/gallery.html` and every status/type/cache field stay identical). The golden suite (`test/golden/`) loads `data` as a module but only reads ROLES/TRAPS/BOOSTERS/EVENTS, so an added export does not affect it.
