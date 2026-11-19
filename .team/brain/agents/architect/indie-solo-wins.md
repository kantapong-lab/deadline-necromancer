# Architect: indie-solo-wins

## 2026-11-19 round 1 (step 3)
Done: contract index + parts (stack, engine, schemas, client, ownership, tests, ac-map) under `.worktrees/feature-indie-solo-wins/.team/indie-solo-wins/`; ADR 0005 (technical) ghost delivery scheduler. ADR 0004 (PM, product) followed unchanged.
Stack: existing Node + Socket.IO + plain JS; no new dependency; devops none.
Decisions: exit helper `exitSolo` with per-role cause; Thief credit via per-night `effect` set; deaths filter before Burnout so an exited Thief is not burned; Thief exit line is a `kind:'public'` stash line (survives Status Page Down); ghost state pure in engine, delay and timer in server module with CSPRNG; faded flag only in `viewFor` for the target via side set `ghostKeys`; fizzle settled eagerly at `toVote`; no `G.log` for ghosts (non-Secrets Mod timeline); Intern measured before ejection; Recruiter with Seeker target no exit (as coded); no exit fx (3D uses cause diff); 3D ghost fx Secrets-only (AC-27 deviation, user decision pending).
Files: contract.md, contract/{stack,engine,schemas,client,ownership,tests,ac-map}.md, docs/adr/0005-ghost-delivery-scheduler.md.
Diagrams: one flow spec `docs/architecture/flows/ghost-write.html` handed to the Orchestrator.
Open: AC-27 vs AC-23 choice (user); AC-31 wording says "delivered Monday" but the first delivery is Tuesday; skill name and messages from designer; pending ghosts lost on restart (accepted).
