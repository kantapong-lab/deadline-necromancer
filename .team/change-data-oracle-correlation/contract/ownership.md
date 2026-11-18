# File ownership (one owner per row; no overlaps)

| Path | Owner | Change |
|---|---|---|
| `app/public/**` | FE | `card-info.js` (data_oracle, honeypot.what, rune_ux.what), `mod3d.html` (skillText line ~727), `mod3d/director.js` (`data_oracle` handler + comment). Nothing else under `app/public` (see [client.md](client.md) section 4) |
| `app/src/**` | BE | `shared/data.js` (6 texts/fields in [engine.md](engine.md) section 1), `engine/night-resolve.js` (the two `data_oracle` lines + unused `lightsAlive`). Nothing else under `app/src`; `night-input.js`, `game.js`, `phases.js`, `views.js`, `fx.js` stay untouched |
| `app/test/**` | BE | update `fx.js` (line 40 + the `4: skill()` seat), new `data-correlation.js`, re-record `golden/snapshot.json`, `http-parity.json`, and `mod-actions.json` only if they differ (see [tests.md](tests.md)) |
| `app/package.json` | BE | append `&& node test/data-correlation.js` to `scripts.test`; no dependency change |

Docs lane (not FE/BE, not touched by this task's builders): `docs/deadline_necromancer_player_rules.md:102`, `docs/deadline_necromancer_design.md:31`, `docs/deadline_necromancer_strategy.md:21`, `poc/DIRECTOR.md:24` (payload table) still describe KPI Forecast / `{real,bugs}`. Docs agent updates them at the docs step; because `http-parity.json` hashes `/docs/deadline_necromancer_design.md`, whoever merges that doc change last re-records `http-parity.json`. `poc/*.html` and `poc/director.js` are frozen prototypes: leave them. Shared files the guard blocks (`docs/strategy.md`, `docs/architecture/**`, `docs/design/screen-map.html`) are not needed by this task.

Merge order: BE first (`data.js`, `night-resolve.js`, tests), then FE; then BE re-runs `node test/http-parity.js` and re-records only if the diff is limited to `/data.js` and `/card-info.js`. FE never edits `app/src`, BE never edits `app/public`. `tools/` untouched (the bots already handle `t:2`: `play-bots.js` slices `max(1, t)`, `demo-bots.js` slices `max(t,0)`).
