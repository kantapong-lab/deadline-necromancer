---
project: deadline-necromancer
task: change-lobby-ui
date: 2026-11-16
status: done
---
Restyled player lobby (lobbyHTML) and join screen (joinHTML) in app/public/index.html + style.css (look only, scoped .jn/.lb). Branch feature/change-lobby-ui accepted at the Human gate, not merged, not pushed. Review r1 reject (join button contrast) fixed in r2; QA 16/16 AC. See [[agents/product-manager/change-lobby-ui]] [[agents/designer/change-lobby-ui]]. Design mockup: https://claude.ai/artifact/XzytptgJkYCcsBEU1u5Kyn
3d skipped: no trigger (UI only; checker's block:gate-not-passed for 3d is a false positive, 3d cannot be recorded via checkpoint gate).
## Lessons
- Check contrast of every text on the primary button gradient in design.md, not only tokens (review B-1).
- Designer text-only design needs a published mockup URL before gate 3c can be ready; qa-report needs ## Results, a `## Bugs` section that is exactly `none`, and story-level AC-n rows.
- make-envelope: goal <=200 chars; frontend-dev hand-off only accepts AC-n story ids.
## Open issues
- app/test/http-parity.json stale (pre-existing, 7 DIFFs on main): re-record after merge.
- S-2: lobbySeen never pruned (same-name rejoin has no entrance animation); glow/dot restart on each push.
## Usage
- pm 22.8k, designer 30.2k, frontend-dev 36.1k+25.0k, code-reviewer 67.4k+47.5k, qa-tester 56.5k, docs-writer (haiku) 43.0k tokens (spawns.tsv rebuilt from reports)
