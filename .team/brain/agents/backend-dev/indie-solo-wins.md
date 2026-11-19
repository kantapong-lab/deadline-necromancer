---
project: deadline-necromancer
task: indie-solo-wins
role: backend-dev
date: 2026-11-19
---
Branch be/indie-solo-wins, worktree .worktrees/be-indie-solo-wins, commit 6717e16. Diagram: not requested.

Built: engine/exit.js (exitSolo), engine/ghost.js (queue/deliver/fizzle/measure), server/ghost-scheduler.js, Thief credit by effect set, Recruiter/Intern exits in closeVote, winners from soloWon, per-viewer faded flag, data.js Ghost Write + GHOST_MSGS.
Tests: indie-exit, thief-credit, ghost, ghost-scheduler new; npm test all green; golden re-recorded (n=6 45/45 byte-identical to old snapshot); http-parity re-recorded (only /data.js differed); mod-actions unchanged.
V-1: 171 Intern-free games A/B, no draw-count change except 3 where an exit changed the alive pool (UAT shuffle / Recruiter re-target). V-5 clean.
V-4 (600 games/size, bot follow-rate 0.25): Intern solo 2-14% (7-12), Thief 7-29% (was 3-13%), Light 27-36% vs 29-40% before. Bot assumptions, direction only.

Gotchas: me.spec.msg only present (true) for the Intern so n=6 views and mod-actions hashes stay identical. Tests that read app/public (Reply All, CAUSE keys) WARN until FE merges; run `STRICT_PUBLIC=1 node test/ghost.js` after the FE merge. After FE merge re-run http-parity.
