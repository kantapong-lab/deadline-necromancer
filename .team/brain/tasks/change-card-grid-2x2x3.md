---
project: deadline-necromancer
task: change-card-grid-2x2x3
date: 2026-11-17
status: in progress
---
Role cards laid out as 2 rows x 2 columns x 3 (max 12) and enlarged (scale 1.9 -> 2.4) in app/public/mod3d.html. Implemented in the working tree of main, not committed. Documents written after the work: .team/change-card-grid-2x2x3/ (ac.md, release-notes.md, checkpoint.md). No review or QA run. Mockup: https://claude.ai/artifact/ABQ6r96SkmAcyBbvnifFtw
## Lessons
- Check the design against the real space before building: the first draft left the cards small because the old left column reserved a lot of width; moving the team legend to the top-left corner freed it.
- A mockup question that the user does not answer (packing) still needs a recorded default.
## Open issues
- Not tested: fewer than 12 players, widths below 900px, the team legend after the enlargement, e2e after the enlargement.
- Nothing committed yet.
