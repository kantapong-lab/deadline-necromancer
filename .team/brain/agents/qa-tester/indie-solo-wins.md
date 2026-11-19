# qa-tester: indie-solo-wins
2026-11-19, r1, L3. Plain Node + headless Chrome CDP (no docker in repo). Dev suite (17 scripts) green, golden 315 games OK.
New: app/test/qa/qa-indie-browser.js (qa/indie-solo-wins eccac8e) 11/11: AC-2/5/20/22/23, S-2 moderator wiring, 375px.
Report: .team/indie-solo-wins/qa-report.md in the feature worktree. Blockers: none.
Open: AC-34 docs lane pending; AC-5 3D + AC-27 manual (mod3d needs CDN three.js, did not boot headless); balance Light -6..9 pts at 10-12 vs main.
Lesson: browser fixtures must keep mana < max and dark < light or closeNight ends the game and clears ghosts.
