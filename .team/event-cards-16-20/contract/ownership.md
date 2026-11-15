# File ownership

One owner per row. FE = frontend-dev, BE = backend-dev.

| Pattern | Owner |
|---|---|
| app/public/** | FE |
| app/tools/** | FE |
| app/src/** | BE |
| app/test/** | BE |
| app/package.json | BE |

## Not in the table (other roles, same worktree)
- docs-writer owns `docs/**` except `docs/architecture/**` and `docs/adr/**` (shared guard; the Orchestrator and architect). The five card jpgs and the ideas doc are already committed in `129f3b7`; docs-writer only verifies (AC-43).
- The Orchestrator owns `.team/**` and every commit and merge. No devops files exist or change (no Dockerfile, CI or pin).
- Nobody edits `app/package-lock.json` or `app/node_modules/`.

## Seams (who edits what inside the table)
- `app/src/shared/data.js` is BE's but FE's `card-info.js` and `gallery.html` read it. Keys are fixed: `purge`, `hands`, `uat`, `redesign`, `status` (n 16-20, appended after `bonus` in that order; key order feeds the deck shuffle, see `golden.md`). img names: `16_meeting_purge.jpg`, `17_more_hands_on_deck.jpg`, `18_uat_too_late.jpg`, `19_client_redesign.jpg`, `20_status_page_down.jpg`.
- Thai `t` and `d` for the five cards: BE writes them (proposals in `events.md`); FE's `card-info.js` text (`one/what/when/tip`) must repeat the same rule numbers; docs-writer copies from `data.js` once BE lands it.
- View fields and the `openRound2` action are fixed in `events.md`; FE codes against that file, not against engine internals.
- `app/test/http-parity.json`, `app/test/golden/snapshot.json`, `app/test/mod-actions.json`: BE re-records them in the last commit after FE and docs-writer branches are merged (their hashes cover `data.js`, `index.html`, `mod.html`, `gallery.html`, `card-info.js`, `common.js` and `/docs/deadline_necromancer_design.md`).
- Merge order: BE stage A (no behaviour change) first, then BE stage B and FE and docs in any order, then BE re-record. Details in `golden.md`.
