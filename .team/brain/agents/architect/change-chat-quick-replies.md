# architect: change-chat-quick-replies

## 2026-11-16 round 1 (step 3)
Done: contract for the quick-reply change (change lane, ui+logic). Read `ac.md`, `design.md`, current `chat.js`, `constants.js`, `index.html` chat code, `style.css`, `player.js`, `http.js`, `http-parity.*`, `package.json` test chain.

Stack: existing Node + Socket.IO + vanilla JS, reused. No ADR, no diagram (none needed), no migration.

Decisions
- D-1 `QUICK_REPLIES` in `app/src/shared/data.js` (already served at `/data.js`, already loaded by `index.html`); rejected `constants.js` (no URL, frozen URL table) and sending in state (bytes on every push).
- D-2 `p:chat {text}` unchanged, `engine/chat.js` not edited: Purge count, quota 0, Silence, >30 and Skip all hold on the typed path; rejected `{quick:n}` (second path, drift risk, no AC benefit).
- D-3 AC-11/AC-14 read as "no trust marker; one list definition consumed by client and engine test". A hard server whitelist would be a scope change (asks the user if wanted).
- D-4 list not frozen (console injection for the AC-10 manual check). D-5 shared `chatBusy` in-flight guard. D-6 empty send returns early (differs from design.md S-row). D-7 collapsible panel per design.md. D-8 no UI test harness; manual M-1..M-10 recipes.
- Enter bug root cause pinned: `pushState` runs before `ack` in `player.js:10`, so the mid-send re-render happens on every success; fix = `#chatIn` always rendered from `chatDraft`, `render()` never restores a DOM value for it, re-query the input after the await.

Files: `.team/change-chat-quick-replies/contract.md`, `contract/{stack,schemas,ownership,ac-map}.md`, `contract/endpoints/p-chat.md`, `handoff/3-architect-r1.json`.

Open issues
- http-parity hashes change on `/data.js`, `/style.css`, `/`, `/?room=ABCD`, `/index.html`: one `--record` after both branches merge (BE), reviewing that only those 5 URLs differ.
- `design.md` canvas URL still pending (designer's note, not mine).
