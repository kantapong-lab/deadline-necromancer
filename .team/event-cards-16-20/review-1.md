## Review 1: event-cards-16-20 (diff-1 app topic) — saved by the Orchestrator from the code-reviewer's message

**Verdict: Reject.** One test-gap blocker (B-1). No engine, view or client defect found. Re-review needs only the new test lines.

### Blockers
**B-1 (BE, severity medium, AC-16): the UAT test passes without testing "pool = alive after ejection".**
- `app/test/events.js:209-214` (60-iteration loop): `table()` has 12 alive. Only 3 players vote HR; the other 9 default to Skip, so nobody is ejected and the assertion at line 214 (`G.P(id).alive`, 'pool = alive after ejection') holds trivially.
- The only run with a real ejection is block E (`events.js:228-231`); it asserts game end and UAT-line order but never that the ejected HR (seat 7) is absent from the named players.
- A regression that built the pool before the ejection would still pass every UAT test.
- Fix: make the ejection happen in one UAT case (every alive player votes HR, as in E), over many iterations; assert HR is dead, `P7` is never in the line, every named id is alive.
- The code at `app/src/engine/vote.js:103-113` is correct (`G.alive()` read after `t.alive = false`).

### Must-not-miss checks (brief.md): all pass in code
#16 (reject before slice, quota after push, emoji exempt, code points, darkSay untouched, NDA path unchanged); #17 (k, `p.zero`, names announced, reset by phases.js:42); #18 (after ejection, before checkEnd, truthful from faction only, <3 alive, no RNG when inactive); #19 (closeRound1 has no side effects/RNG, no voter names in any view, round 1 votes persist, no dead end, toNight guard); #20 (rep[0] public headline, status lines gated, publishNight once incl. early returns, on-call only via intel and modView.statusReport, on-call id only with secrets); RNG order (new calls only in hands/status/uat plus the larger deck shuffle).

### Client
No missing-field crashes found; guards in place; all dynamic text through `esc`; `PHASES` has `VOTE_INTERIM`; `card-info.js` keys match `EVENTS`.

### Suggestions (non-blocking)
- S-1 (AC-33, AC-29): `events.js:270-290` (`status`) tests gating only with a Burnout and a Mana line; add a case with a hijack trap plus a silenced player under #20, asserting neither line is in `common().report` or `feed` but both are in the on-call intel. No #20 case on the checkEnd/day-5 early-return path (golden only).
- S-2 (contract/engine.md): `mod-view.js:31` VOTE guidance has no round-1/round-2 note.
- S-3: in round 2 `pending().vote` (`mod-view.js:16`) counts round-1 votes as done, so the progress bar starts full (harmless).
- S-4 (AC-24): no test sends `openRound2` from a player socket (guard is `socket.data.mod`, `handlers/moderator.js:7`).
- S-5 (AC-42): no thumbnails for #16-#20 in `app/public/thumbs/events/`; the onerror fallback to the full image works.
- S-6: `events.js:66-68` `hands` can pick a player already zero from PIP Curse (matches the contract).

```json
{"role":"code-reviewer","task":"event-cards-16-20","step":"6","round":1,"status":"done","verdict":"Reject","paths_written":[],"blockers":[{"id":"B-1","owner":"BE","file":"app/test/events.js","line":214,"severity":"medium","ac":"AC-16","summary":"uat test never ejects anyone (3 votes vs 9 default Skip) and block E does not assert the ejectee is excluded, so 'pool = alive after ejection' is untested"}],"quality_checks":{"passed":true,"failed":[]},"summary":"Reject: code, views and client correct and leak-free; only B-1 (AC-16 UAT test does not test ejection-excluded pool) to fix."}
```
