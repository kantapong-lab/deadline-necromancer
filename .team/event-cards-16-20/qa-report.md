# QA report: event-cards-16-20 (round 1)

Verdict: Fail on docs only (AC-40, AC-41). Code behavior passes. Tested on branch qa/event-cards-16-20 (merge of be/event-cards-16-20 r4), worktree `.worktrees/qa-event-cards-16-20`.

## Suites (each run separately)
| Command | Result |
|---|---|
| `node test/events.js` | PASS, "all 20 event cards tested" |
| `node test/simulate.js` | PASS, ALL OK (7 sizes x 3 rounds) |
| `node test/golden/run.js` | PASS, 280 games, coverage 80/80, GOLDEN OK |
| `node test/mod-actions.js` | PASS, 71 steps |
| `node test/http-parity.js` | FAIL as expected, 10 paths differ: `/`, `/?room=ABCD`, `/mod`, `/gallery`, `/data.js`, `/common.js`, `/card-info.js`, `/index.html`, `/mod.html`, `/gallery.html` (hashes only; Orchestrator re-records) |
| `node test/qa/qa-cards.js` (new) | PASS 4/4 |

New file: `app/test/qa/qa-cards.js` (plain node, port 3177, TEST_PORT overrides; forces a card by pushing its key on `rooms.get(code).game.deck` before day-1 closeNight, so drawEvent pops it on day 2).

## AC results
Unit = case in `app/test/events.js` (passes). Socket/HTTP = `app/test/qa/qa-cards.js`.
| AC | Result | Evidence |
|---|---|---|
| AC-1 | pass | unit `purge`; socket: 30 chars ok via p:chat ack, `me.chatLeft` 3 to 2 |
| AC-2 | pass | unit; socket: 31 chars ack not ok, chatLeft unchanged, not in feed, not truncated |
| AC-3 | pass | unit; socket: 4th message ack not ok, feed length unchanged, other player quota independent |
| AC-4 | pass | unit (emoji-only free, mixed uses 1) |
| AC-5 | pass | unit (darkSay x5 at night) |
| AC-6 | pass | unit (NDA emoji ok, text old error) |
| AC-7 | pass | unit + socket (`chatLeft` in player state; FE counter itself not browser-tested) |
| AC-8 | pass | unit + socket (30 Thai code points with combining marks ok, 31 rejected) |
| AC-9 | pass | unit `hands` |
| AC-10 | pass | unit |
| AC-11 | pass | unit |
| AC-12 | pass | unit |
| AC-13 | pass | unit |
| AC-14 | pass | unit `uat` |
| AC-15 | pass | unit |
| AC-16 | pass | unit |
| AC-17 | pass | unit |
| AC-18 | pass | unit |
| AC-19 | pass | golden unchanged (GOLDEN OK) + unit |
| AC-20 | pass | unit + socket: closeVote gives VOTE_INTERIM, no one ejected |
| AC-21 | pass | unit + socket: all player and moderator payloads in VOTE_INTERIM have `interim.tally` counts, no voter map key, view `voteResult` null |
| AC-22 | pass | unit + socket: skipStreak, mana, traps unchanged after round 1 |
| AC-23 | pass | unit + socket: p:chat ok in VOTE_INTERIM |
| AC-24 | pass | socket: mod openRound2 ok; player-socket `mod:do openRound2` refused, phase stays VOTE_INTERIM |
| AC-25 | pass | unit + socket: round-1 votes carried (count equals alive), re-vote replaces |
| AC-26 | pass | unit (Blame Shifting, skip streak, Mana, lines); socket reaches VOTE_RESULT/OVER with round-2 result |
| AC-27 | pass | unit + socket: toNight from VOTE_INTERIM refused; full day reaches NIGHT |
| AC-28 | pass | golden unchanged, marathon unit, simulate ALL OK |
| AC-29 | pass | unit `status`; socket: public report has no Mana/full-report line |
| AC-30 | pass | unit; socket: public payload has the unnamed on-call line |
| AC-31 | pass | socket: exactly 1 of 8 players holds the on-call note and it is the `onCall` id; other players' payloads contain no `onCall`/`statusReport`/`fullReport` and no on-call note |
| AC-32 | pass | unit; socket: moderator `statusReport` present, `onCall` hidden when secrets off |
| AC-33 | pass | unit |
| AC-34 | pass | golden unchanged + unit control night |
| AC-35 | pass | unit (Reply All + #20, no throw) |
| AC-36 | pass | HTTP: `/data.js` 200, EVENTS has 20 entries n 1-20, keys purge/hands/uat/redesign/status; deck 20 in unit harness. Thai tone not judged here |
| AC-37 | pass | golden GOLDEN OK, coverage 80/80 |
| AC-38 | pass | events.js has five named cases, passes |
| AC-39 | untested | no balance run or report file requested of QA; not run |
| AC-40 | fail | see B-1: `docs/` not yet updated in the feature branch |
| AC-41 | fail | see B-1: stale "15" wording remains |
| AC-42 | pass | HTTP: `/gallery` 200, renders from EVENTS + `/card-info.js` (200, has all 5 keys); `/docs/event_cards/16..20_*.jpg` all 200 image/jpeg. Visual check in browser not done |
| AC-43 | pass | `git log --stat`: ideas doc and jpgs in commit 129f3b7; no push done by QA |
| AC-44 | untested | manual Thai tone review, not a QA-automatable check |

## Bug list
- B-1 (AC-40, AC-41, severity minor, docs pending): stale 15-card wording and no `VOTE_INTERIM`/20-card updates in docs. Repro: `grep -n "15 ใบ\|ทั้ง 15" docs/deadline_necromancer_event_cards.md docs/deadline_necromancer_player_rules.md app/README.md` returns `event_cards.md:1,30,64`, `player_rules.md:71`, `README.md:14` ("Event Card (15 ใบ)"); `grep -c VOTE_INTERIM docs/*.md app/README.md` finds none. Expected to be fixed by the docs update the Orchestrator mentioned; re-check after it lands. (The ideas doc lines 5 and 106 mention "15" as the historical before-count, which is fine.)

No code bugs found.

## Notes
- Round 1 route in the socket test uses a moderator and 8 players; day 1 vote may end with VOTE_RESULT, handled.
- All servers started by tests exit with the process; none left running.
