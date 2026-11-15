---
project: deadline-necromancer
task: event-cards-16-20
date: 2026-11-15
status: done (branch accepted by the user at the Human gate; not merged, not pushed)
---
# event-cards-16-20
Five new Daily Rule Event Cards (#16 Meeting Purge, #17 More Hands on Deck, #18 UAT Too Late, #19 Client Redesign, #20 Status Page Down), deck 15 -> 20. Branch `feature/event-cards-16-20` (head 04207bb at close). Plan `docs/plan/event-cards-16-20.md`, ADRs `docs/adr/0001-existing-stack.md`, `docs/adr/0002-event-cards-16-20-structure.md`, design spec page https://claude.ai/artifact/F3wSDVnyuTYMdQZ7iiecV3 (no Claude Design canvas).
Links: [[agents/researcher/event-cards-16-20]] [[agents/product-manager/event-cards-16-20]] [[agents/architect/event-cards-16-20]] [[agents/devops/event-cards-16-20]] [[agents/docs-writer/event-cards-16-20]]

Run: onboard (baseline + ADR 0001) -> L0 brief -> PM (ac 44, plan) -> gate 2b -> designer/architect/devops -> gate 3c -> BE stage A (refactor, golden unchanged) -> FE + BE stage B -> golden/balance -> review r1 reject (B-1 test gap) -> fix -> review r2 approve -> QA L3 -> Human gate -> docs -> http-parity re-record. Final `npm test` exit 0 (all suites), qa-cards.js 4/4.
3d skipped: no smoke trigger. UX review skipped: text spec only.

## Lessons
- The muffy gate guard blocks `architect` in onboard mode while any task checkpoint exists (it demands gate 2b); the Orchestrator wrote the stack ADR itself after asking the user.
- The `Task:` header must be alone on the first line of a spawn prompt (the guard regex ends the line); make-envelope prints `Task: x  Brain: y` on one line, so add a line break.
- 44 ACs do not fit ac.md's 60-line cap: use a one-line table with inline links to `ac/AC-n.md` from the start; reference-style `[AC-n]` labels need definitions.
- A text-only design spec cannot pass gate 3c (it wants a canvas URL and an `AC id -> artboard` section for every AC): publish the spec as a page and map engine-only ACs to `n/a`.
- Two-stage backend landing (stage A refactor proves non-card days unchanged on the old golden snapshot) worked well and made RNG-order review cheap.
- A review of tests catches tests that pass trivially (UAT ejection case); mutation-check the fix.
- A haiku-model fix round signed the commit with its own model name; check trailers before merging.

## Open issues
- Skipped reviewer suggestions: moderator VOTE guidance note for round 1/2 (changes golden output) and a non-moderator openRound2 test (needs a mod-actions expectation).
- No thumbnails for #16-#20 (`app/public/thumbs/events/`); gallery falls back to the full image.
- UI never opened in a real browser (syntax check + socket tests only); AC-44 Thai tone not reviewed by a person.
- Balance bots do not model #17/#18/#19/#20 information effects (light win 44-56%); real effect needs human playtests.
- Branch not merged into main and not pushed.
- Baseline reads yellow (its own commit pin trails HEAD); `CLAUDE.md` muffy block not added (user was not shown the change).

## Usage
- researcher (haiku, 1 round) tok:121616; researcher onboard (sonnet) tok:59033
- product-manager (3 rounds) tok:86772 · designer tok:52301 · architect tok:192624 · devops tok:32732
- backend-dev (4 rounds) tok:240199 · frontend-dev tok:66864
- code-reviewer (2 rounds) tok:167330 · qa-tester tok:61358 · docs-writer tok:88055
- Orchestrator: n/a
