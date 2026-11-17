---
project: deadline-necromancer
task: change-vote-result-phase-ui
date: 2026-11-17
status: done
---
Vote-result title card, 4-step phase stepper and result caption in app/public/mod3d.html (+ e2e check reads aria-label). Committed on main as 5100bad, not pushed. Documents written after the work: .team/change-vote-result-phase-ui/ (ac.md, release-notes.md, checkpoint.md). No review or QA run. Mockups: https://claude.ai/artifact/8nRRKzCGyDaiPZhxjCwNV1
## Lessons
- Mockup first, then build: the user picked the combo after seeing eight variants, and nothing was redone.
- Keep a stable hook (aria-label / data-phase) when a text element becomes a widget, so tests that read it keep working.
## Open issues
- Reduced motion, narrow screens, long result text and a full e2e run were not checked.
- Result text shows the fired player's role on the 3D screen while secrets are hidden.
