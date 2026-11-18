# Contract: change-data-oracle-correlation (Data Oracle -> Data Correlation)

Source: [ac.md](ac.md) (AC-1..9 + Unchanged), [design.md](design.md). Baseline red elsewhere; code is the only truth. Engine-only rule change: no endpoint, no socket event, no DB.

Stack: Platform: web · Runtime: Node.js 24.21.0 (dev-host version per voice-over deploy.md, not repo-pinned; unchanged) · existing CommonJS engine + Socket.IO ^4.7.5 + plain browser JS · zero new dependencies.

## Stack
Existing stack, build/buy/reuse table (all reuse), options: none, ADR: none, diagrams: none needed. [stack]

## Engine logic (BE)
`data.js` texts and fields (Data Oracle `t:2 pool:'others'`, skill name, `d`, Honeypot, Rune UX, Mystery Intern) and one block in `night-resolve.js` replacing the two KPI lines: 3-way real faction, Alibi, Honeypot single flip, Debug Scanner note, Power Outage, targets-after-swap, no new Math.random. [engine]

## Payloads and texts
fx `data_oracle` `{targets:[a,b], result:{same}}` (old `real`/`bugs` removed), exact Night Log lines, `fixNotes` text, view `spec` values. No schema or migration. [schemas]

## Client (FE)
`card-info.js` texts, `mod3d.html` log line, `director.js` `data_oracle` handler per design.md; what FE must not touch. [client]

## File ownership
FE: `app/public/**` (3 files). BE: `app/src/**` (2 files), `app/test/**`, `app/package.json`. Docs lane listed separately. One owner per row. [ownership]

## Tests
New `test/data-correlation.js` (T1-T11), edits to `test/fx.js`, golden re-record guarded by V-1 (Math.random call counts equal per seed). [tests]

## AC id -> logic
AC-1..9 and Unchanged mapped to section, owner and test. [ac-map]

## Decisions in force
Honeypot on both targets: single flip, first trap marked (as QA). Swapped to <2 targets: silent (as QA). Card-text strings pinned in engine.md s1. Alibi card text and Senior Dev "none" left as is (out of scope). Golden snapshot re-recorded only after V-1.

[stack]: contract/stack.md
[engine]: contract/engine.md
[schemas]: contract/schemas.md
[client]: contract/client.md
[ownership]: contract/ownership.md
[tests]: contract/tests.md
[ac-map]: contract/ac-map.md
