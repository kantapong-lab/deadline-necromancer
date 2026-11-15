## Review 2: event-cards-16-20 (diff-2, app/test/events.js) — saved by the Orchestrator from the code-reviewer's message

**Verdict: Approve.** B-1 is closed. S-1 is meaningful. No blockers remain.

### B-1: closed
- New loop at `events.js:218-231`: every alive player votes HR (seat 7); asserts HR is dead (ejection proven), the UAT line has 3 distinct ids, HR is not among them, every named player is alive.
- Would fail if the pool were built before the ejection (`vote.js:88` sets `t.alive = false`; `uatAnnounce` at `vote.js:108` reads `G.alive()` after). Pre-ejection pool contains HR with probability 3/12 per iteration; over 60 iterations the miss chance is about 3e-8. The backend's mutation check agrees.
- The `!picks.includes(G.P(HR).name)` check restates the id check (harmless).

### S-1: meaningful, not trivially true
- `events.js:300-308`: hijack trap + `P5.silencedNext = true`, then `closeNight`. Positive assertions prove both lines are generated and present in on-call intel and `modView(false).statusReport`; negative assertions prove they are absent from `common().report` and `common().feed`. Control case at line 310 shows an ungated card publishes the full report.

### Skipped S-2 and S-4: acceptable
- S-2 (mod guidance note) changes golden output (44 games differ); can wait for a later re-record.
- S-4 needs a new step in `mod-actions.json`; the guard `socket.data.mod` (`handlers/moderator.js:7`) already exists and has no defect.

### Notes
- D-5: the backend used a different model name in a commit trailer; the Orchestrator amended it to the run's trailer. Brain note for fix rounds not required.

```json
{"role":"code-reviewer","task":"event-cards-16-20","step":"6","round":2,"status":"done","verdict":"Approve","paths_written":[],"blockers":[],"quality_checks":{"passed":true,"failed":[]},"summary":"Approve: B-1 closed (real ejection test, fails if pool built pre-ejection); S-1 hijack+NDA gating test non-trivial; S-2/S-4 skips acceptable."}
```
