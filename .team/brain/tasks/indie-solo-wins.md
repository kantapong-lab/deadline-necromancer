---
project: deadline-necromancer
task: indie-solo-wins
date: 2026-11-19
status: done
---
Independent faction solo wins: no team win; each Independent exits the game at once on completing their goal (Seeker precedent). Glory Thief credit needs a real skill effect (2 credits, no Light-win condition). Chaos Intern gets a new "fake chat" skill (preset message, 10-15 s after morning, faded for the target) with a vote-count goal T = floor(alive/4)+2, twice. Soul Recruiter exits as soon as the target is voted out.
Lane: feature (forced full flow by `/muffy feature`). Baseline red at setup.
Decided in a grilling session with the user; full rules in `.team/indie-solo-wins/requirements.md`.
Links: [[agents/product-manager/indie-solo-wins]] [[agents/architect/indie-solo-wins]]
3d skipped: stack unchanged (plain Node, no dependency/runtime change); no passing smoke on record but devops mode 1 found nothing to smoke
Branch feature/indie-solo-wins accepted at the Human gate 2026-11-19; not merged to main, not pushed. Role branches fe/be/qa kept; qa worktree was locked at closing. 3d skipped (no trigger; no smoke on record). 3c recorded by hand (design approved in chat on local canvas, no publish). ADRs 0004, 0005.
## Lessons
- Name the user's decided-rules file requirements.md, not brief.md: brief.md is the researcher's output file and would be overwritten.
- gate-summary 3c needs a canvas URL and an "AC id -> artboard" section; a local-only canvas cannot pass it, so the gate was recorded by hand.
- gate-summary 10 reads `## Bugs` as open bugs; put non-bug follow-ups under another heading.
- Delay timers belong in a server module (crypto.randomInt, injected now), not in the engine; the golden Math.random sequence stays untouched.
- A warn-only test gate (STRICT_PUBLIC) hid FE-lane asserts until review caught it; make cross-lane checks strict from the start.
## Open issues
- 3D ghost fx and EXIT stamp not run on a real 3D screen (needs a person; three.js CDN).
- Review S-1..S-5: GHOST_MSGS served to every client via /data.js; moderator.js scheduler wiring now has a QA browser test but no unit test; faded flag keyed by ts:who; cosmetic test nit.
- Balance (bots, internal guidance): Light win 32/24/31% vs 38/32/40% on main at 10/11/12 players; Thief solo ~28% at 11-12. Needs a human playtest.
- V-1 Math.random A/B not re-run by QA.
- qa worktree .worktrees/qa-indie-solo-wins was locked at closing.
## Usage
researcher sonnet ~99k · product-manager sonnet ~34k · designer sonnet ~100k · architect sonnet ~183k · devops sonnet ~34k · backend-dev sonnet ~182k+19k · frontend-dev sonnet ~87k · code-reviewer sonnet ~196k+14k · qa-tester sonnet ~94k · docs-writer sonnet ~73k · Orchestrator (not measured).
