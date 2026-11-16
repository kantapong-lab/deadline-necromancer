# Stack and decisions

Platform: web (existing). Runtime: Node + Socket.IO 4 (`app/package.json`), vanilla JS client (no framework, no build step). Nothing new: **reuse** everything; no dependency, provider, datastore, migration or ADR. Build vs buy: n/a. Code is the truth (the baseline doc is stale; the user chose code as truth).

## Options considered (one real fork: where the shared phrase list lives and how it is sent)

| Option | What it is | Trade-off | Verdict |
|---|---|---|---|
| A. `QUICK_REPLIES` in `app/src/shared/data.js` | Plain array next to ROLES/EVENTS; already served at `/data.js` and already loaded by `index.html` before its inline script; already `require`d by the engine | No new URL (public URL table is frozen), no new socket field; changes the `/data.js` parity hash | **Picked** |
| B. In `engine/constants.js` | Next to `EMOJIS`, `PURGE_LEN` | CommonJS only, no URL; serving it needs a new route in `http.js` (URL table frozen) | Rejected |
| C. Sent inside every `state` push | Server is the only source | Adds ~23 strings (~1 KB) to every push to every player; list is static, no reason to ship it per push | Rejected |

## Decisions (mirrored in the hand-off `decisions`)

- **D-1** list in `data.js` as `QUICK_REPLIES` (option A). Name grep-checked: no existing `QUICK_REPLIES` in any page or script (only `QUICK_EMO` in `index.html`, unrelated). A top-level `const` clash across classic scripts would blank the page, so BE must not rename it without re-grepping `index.html`, `mod.html`, `mod3d.html`, `gallery.html`, `common.js`, `audio.js`, `card-info.js`.
- **D-2** `p:chat` payload is unchanged: `{ text }`. A quick reply is a normal chat whose text equals a list entry. No `{quick: n}` field, no new error string, and `engine/chat.js` is **not edited**. Why: every rule the ACs ask for already holds on the typed path (see `endpoints/p-chat.md`). A `{quick:n}` branch would add a second path and an index that can drift between client and server for no AC benefit.
- **D-3** AC-11 / AC-14 reading: the server trusts no quick-reply marker, so there is nothing to spoof; an altered phrase is just typed text under the normal rules. "One source of truth" = one definition in `data.js`, rendered by the client and imported by the engine test, which is the drift guard. If the user wants a hard server whitelist (reject any non-phrase), that changes the typed-chat rules and is a scope change.
- **D-4** `QUICK_REPLIES` is a plain (not frozen) array, so a tester can `QUICK_REPLIES.push('x'.repeat(31))` in the browser console to check the AC-10 disabled rule.
- **D-5** Quick reply and typed send share one in-flight guard (`chatBusy`) so a double tap or Enter+tap cannot post twice or burn two Purge slots.
- **D-6** Empty input + send button: client returns early, no emit (current behaviour). Differs from design.md S-row AC-4 ("server error shows"); AC-4 only requires "does nothing new", and the server still returns `ข้อความว่าง` if called.
- **D-7** Panel layout follows `design.md` (collapsible `💬 ข้อความด่วน (23)` panel), not a horizontal strip.
- **D-8** No test DOM harness exists and none is added (no new dependency). Engine ACs get a Node test; UI ACs get exact manual/3d-smoke recipes in `ac-map.md`.

`diagrams: none needed` (no new component, datastore or integration; two participants, one existing socket event).
