# Review 1: change-data-oracle-correlation (code-reviewer, round 1)
Verdict: Approve. Blockers: none.
AC-1..9 map to code and tests (data.js:12-20,61; night-resolve.js:188-199; director.js:158-171; mod3d.html:727; card-info.js; tests T1-T12).
V-1: 3/315 seeds differ (10001, 11030, 12012) via the contract-mandated silent <2-target branch changing the Reply All shuffle length (night-resolve.js:247). Accepted as a known deviation; contract V-1 vs silent-branch rule contradicted itself.
Suggestions (non-blocking):
- S-1 app/public/mod3d/director.js:182 stale mystery_intern comment ("right-hand light neighbour")
- S-2 app/test/data-correlation.js:94 leftover `G.cleanSprint = true;`
- S-3 app/test/data-correlation.js:108 muddled comment
- S-4 docs lane: player_rules.md:102, design.md:31, strategy.md:21, poc/DIRECTOR.md:24 still describe KPI Forecast; re-record http-parity after the docs merge
- S-5 reviewer had no shell; Orchestrator ran npm test on feature branch after merge: exit 0
