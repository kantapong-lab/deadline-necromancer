# docs-writer: change-lobby-ui

## r1 (2026-11-16)
- Date: 2026-11-16
- Done: wrote `.team/change-lobby-ui/release-notes.md` (changes, breaking none, migrations none, rollback, Deploy hand-off, sources). No announcement (prompt did not say `announcement: yes`). Self-checked against ac.md, design.md, qa-report.md and the `app/public` diff.
- Decisions: no docs page edited (no lobby/join docs page exists; `app/README.md` does not describe the lobby look). Rollback = revert branch commits touching the two static files (no data). Branch noted as `feature/change-lobby-ui`; qa-report names `qa/change-lobby-ui @ 2c1fd26`, recorded as a note, not changed.
- Files: `.team/change-lobby-ui/release-notes.md`, `.team/change-lobby-ui/handoff/11-docs-writer-r1.json`.
- Open: `app/test/http-parity.json` stale (pre-existing); owner re-records after merge. Non-blocking QA notes N-1 to N-3 carried into release notes. `lobbySeen` not cleared on leave (cosmetic).
- Cost/tokens: not measured.
