# qa-tester: change-lobby-ui

2026-11-16, r1, L3. Local node app + CDP-driven headless Chrome at 360x640 / 1280x720 + reduced-motion; room via socket.io-client.
Result: Pass, 0 blockers. All AC 1.1-4.1 pass; Unchanged rows pass (game MORNING phase renders after start).
Non-blockers: N-1 button #fff/#7c3aed not tokens; N-2 badge glow/dot pulse restart on each state push; N-3 stale test/http-parity.json (same 7 DIFFs on main, pre-existing).
npm test: http-parity fails (pre-existing); other 6 suites pass when run individually.
Decisions: no committed tests (no UI harness; throw-away scripts); prefill param is `?room=` not `?code=`.
Files: .team/change-lobby-ui/qa-report.md. Open: re-record http-parity.json after merge.
