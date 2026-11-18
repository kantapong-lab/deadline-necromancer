# docs-writer: voice-over

## 2026-11-18, round 1 (step 11)
- Done: wrote `.team/voice-over/release-notes.md` in worktree `.worktrees/feature-voice-over` (what users get, limits, socket events table, Deploy hand-off, manual steps M1-M4 marked not run).
- Decisions:
  - Socket events documented in release notes (no REST API). Reason: contract says no REST.
  - `v:sig` rate 600 per 1 s (code `SIG_MAX`), not contract's 150. Code is truth.
  - Cert paths `app/.certs/voice.key|crt` (helper output), not `deploy.md`'s example `certs/`.
  - `app/README.md` left unchanged: no contradiction found.
  - No announcement (`announcement: no`).
- Files: `.team/voice-over/release-notes.md` (created); `.team/voice-over/handoff/11-docs-writer-r1.json` (created).
- Cost/tokens: not tracked.
- Open issues: M1-M4 manual steps not run; contract.md rate figure (150) stale; S-8 unverified in a browser.
