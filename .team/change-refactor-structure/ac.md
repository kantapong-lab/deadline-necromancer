# AC: change-refactor-structure
Scope: internal    Kind: refactor    Owner: BE
## Goal
refactor code และ file position (app/ only; plan approved: .team/refactor-structure/refactor-plan.md, defaults D1-D5)
## AC
- AC-1 | Golden-master, HTTP-parity and mod-actions tests exist, recorded on untouched baseline (7a91743) before any move; golden coverage gate passes | `node test/golden/run.js`, `node test/http-parity.js`, `node test/mod-actions.js`
- AC-2 | Layout matches plan section 2 (src/server, src/engine, src/shared); data.js moved unchanged; public/ untouched; no app/server.js shim | `git diff --stat`, tree
- AC-3 | engine split per plan section 4, bodies verbatim, no Math.random reorder, mixin throws on duplicate names | golden snapshot identical after every step
- AC-4 | server split per plan section 4 (paths/http/rooms/handlers/index); socket + HTTP behaviour unchanged | http-parity + mod-actions + simulate
- AC-5 | package.json, .claude/launch.json, simulate.js require, README structure table updated; no reference to old paths remains in app/ | grep proof in hand-off
- AC-6 | Behaviour unchanged: all four tests pass (`npm test`) after every commit; app starts from app/ and from repo root | `npm test`, launch from root
## Out of scope
Phase C client tidy (D4), S5 moderator internals into Game (D5), resolveNight decomposition, docs/ edits (D1), any bug fix listed in plan section 1 out-of-scope.
