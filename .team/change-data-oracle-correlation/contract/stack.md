# Stack

Platform: web. Existing codebase, no stack change: Node.js (CommonJS, `app/src/engine`, `app/src/shared`), Socket.IO ^4.7.5, plain browser JS + three.js via import map in `mod3d.html`. Runtime in use: Node 24.21.0 (from `.team/voice-over/deploy.md`: the dev host version, not pinned in the repo; this task changes no runtime and adds no dependency, so nothing to pin).

| Capability | build / buy / reuse | Reason |
|---|---|---|
| Target validation (2 targets, no self, repeat rule) | reuse | `t:2`, `pool:'others'` drive `night-input.js` + `game.js` generically; adding custom code rejected (duplicates rules, risks golden) |
| Result computation | reuse pattern | copies the `qa_hunter` Alibi/Honeypot/fixNotes pattern in the same pipeline slot |
| Night Log / fx transport | reuse | `add()`, `G.fixNotes`, `fxs()`; payload `{targets,result:{same}}` |
| 3D visual | reuse | `director.js` helpers (`shoot`, `ringUp`, `hover`, `timed`); no new asset |

Options (hard-to-reverse choices): none. The rule lives in one function in the existing pipeline; the engine, tests and fx format already decide the approach (ADR: none new). Rejected during design: a new `t:2` special-cased picker in `index.html` (generic picker already works); keeping the old fields in the fx payload beside `same` (dead data, and `real/bugs` would be a team-count hint if a consumer later showed it).

Diagrams: none needed (one resolve step changed, no new component, datastore, table or flow).
