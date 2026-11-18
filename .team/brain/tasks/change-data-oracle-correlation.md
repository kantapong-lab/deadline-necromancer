---
project: deadline-necromancer
task: change-data-oracle-correlation
date: 2026-11-18
status: done
---
Data Oracle's skill changed from KPI Forecast (work vs bug counts) to Data Correlation: pick 2 others (t:2, pool:'others'), next morning "X กับ Y → อยู่ทีมเดียวกัน 🔗 / อยู่คนละทีม ⛓️‍💥", 3-way factions (two indies = same team). Alibi Mirror makes dark read as light, Honeypot flips once, Debug Scanner notes the truth, Power Outage gives no info, swapped to <2 targets = silent (like QA). Card text fixes: Honeypot lists Data Oracle, Rune UX notes post-swap targets, Mystery Intern copies a random light player. Decisions came from a grilling session with the user.
Lane: change (ui+logic), base main. Baseline red: user chose to continue with code as the only truth. No announcement.
Branch feature/change-data-oracle-correlation accepted at the Human gate 2026-11-18; not merged to main, not pushed. Role branches fe/be/qa kept.
Gates: 2b approved; 3c approved on the local canvas file (Artifact publish and local server were denied by permissions; recorded by hand in the checkpoint); 10 approved.
Out of scope (follow-up): Senior Dev "ไม่ได้ส่งงานเมื่อคืน" result is a 100% dark tell.
Links: [[agents/product-manager/change-data-oracle-correlation]] [[agents/designer/change-data-oracle-correlation]] [[agents/architect/change-data-oracle-correlation]] [[agents/frontend-dev/change-data-oracle-correlation]] [[agents/backend-dev/change-data-oracle-correlation]] [[agents/code-reviewer/change-data-oracle-correlation]] [[agents/qa-tester/change-data-oracle-correlation]] [[agents/docs-writer/change-data-oracle-correlation]]
## Lessons
- Contract V-1 ("Math.random counts unchanged per seed") was wrong whenever a role's `t` changes: golden bots draw per candidate. Write V-1 as an A/B of the engine block on identical data, not raw before/after.
- A silent branch that drops a private note shifts Chaos Intern's Reply All shuffle length; any change to which notes exist moves the random sequence.
- diff-signals flags any app/package.json edit as a dependency change; a scripts.test-only edit is a false positive (checked by hand).
- On macOS the `poc` launch config uses `python` (missing); Artifact publish and preview_start were both denied, so gate 3c ran on a file:// preview and gate-summary/checkpoint gate 3c could not record it.
- Grilling first, then muffy: the PM wrote 9 ACs in one round with no questions.
## Open issues
- 3D Data Correlation effect not run in a real browser.
- Review S-2/S-3: leftover line and muddled comment in app/test/data-correlation.js:94,108.
- test/qa/qa-cards.js: 3 failures already on main (stale harness: closeVote after day-1 toVote lands in VOTE_RESULT); not in npm test.
- Senior Dev "none" = 100% dark tell (balance, separate task).
## Usage
- product-manager · sonnet · 21,256
- designer · sonnet · 34,259
- architect · sonnet · 100,093
- frontend-dev · sonnet · 35,567
- backend-dev · sonnet · 70,285
- code-reviewer · sonnet · 64,993
- qa-tester · sonnet · 49,757
- docs-writer · sonnet · 17,010
- Orchestrator · opus · not read (no /context reading available in this session)
- Subagents total: 393,220
- Tally: qa-tester · sonnet · new tests: 1/1 completed.
