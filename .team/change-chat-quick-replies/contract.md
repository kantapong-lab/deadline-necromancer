# Contract: change-chat-quick-replies

Change lane (ui+logic), player morning chat only. Stack: web, Node + Socket.IO 4 + vanilla JS client, all reused (runtime pinned by `app/package.json`; no `deploy.md`). Code is the truth.

## Stack and decisions
Reuse everything; one real fork (shared list in `src/shared/data.js` as `QUICK_REPLIES`, served by the existing `/data.js`; not in state, not a new URL). Decisions D-1..D-8, incl. unchanged `p:chat` payload and no engine edit. [stack]

## Endpoints
One socket event, `p:chat`, unchanged; how the existing server path already covers Purge count, quota 0, Silence, >30, altered text and Skip phrase; client send flow including the Enter-clear fix. [p-chat]

## Schemas and migrations
No DB or migration. `QUICK_REPLIES` list invariants, unchanged payload and state, pinned client vars and DOM ids. [schemas]

## File ownership
FE = `app/public/**`; BE = `app/src/shared/data.js`, `app/test/**`, `app/package.json`; no engine/server edits. Expected http-parity break and re-record step. [ownership]

## AC id -> contract -> tests
All AC-1..AC-14 mapped, with engine test names (`app/test/quick-replies.js`) and manual M-1..M-10 recipes. [ac-map]

## Diagrams
none needed (no new component, datastore or integration).

[stack]: contract/stack.md
[p-chat]: contract/endpoints/p-chat.md
[schemas]: contract/schemas.md
[ownership]: contract/ownership.md
[ac-map]: contract/ac-map.md
