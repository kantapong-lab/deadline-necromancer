# QA report: change-lobby-ui (r1, L3)

Verdict: **Pass** (0 blockers, 3 non-blockers). Branch qa/change-lobby-ui @ 2c1fd26 (includes review r2 fixes).
Method: local node app (`PORT=3222`), real room via socket.io-client (mod:create, player:join x5 bots + me via the page), headless Chrome driven over CDP at 360x640 and 1280x720, computed-style and getAnimations() measurements, prefers-reduced-motion emulation. Screenshots + raw output in the QA scratchpad (`m-*.png`, `d-*.png`, `out.json`). Note: the page reads the prefill from `?room=XXXX` (not `?code=`); tested with `?room=`.
No test files added (UI-only, no existing UI test harness; checks are throw-away CDP scripts, not committed).

## AC id -> test name table (manual CDP checks, no committed tests)

| AC | Result | Evidence |
|---|---|---|
| AC-1 | pass | covers 1.1-1.5 below |
| AC-2 | pass | covers 2.1-2.6 below |
| AC-3 | pass | covers 3.1-3.4 below |
| AC-4 | pass | covers 4.1 below |
| 1.1 | pass | 360px: scrollWidth 360 = innerWidth; #jcode 298x49, #jname 298x48 (full card width), button 298x48 |
| 1.2 | pass (note N-1) | h1 `--light`, help/placeholder `--mut`, labels `--txt`, card `--panel`/`--panel2`; only hard-coded text colour is `#fff` on the join button (`#7c3aed` bg), see N-1 |
| 1.3 | pass | h1 10.96:1 (large, needs 3), help 6.1, labels 14.7, input 13.5, button #fff on #7c3aed 5.7, error banner 12.7 |
| 1.4 | pass | empty name -> `.banner.warn` "กรุณาใส่ชื่อ" is before #jcode in DOM and in screenshot, role=alert, 14px, 12.7:1 |
| 1.5 | pass | `?room=HXMN`: #jcode value HXMN, maxLength 4, text-transform uppercase; #jname maxLength 14; button onclick `join()`; join works |
| 2.1 | pass | `.code` in `.lb-codebox` (gold 2px border badge), 36px mobile / 44px desktop, letter-spacing 6/10px; largest text after h1 (22px) |
| 2.2 | pass | rows 56px with avatar initial + name; own row gold border, gold avatar, tinted bg, "(คุณ)" present |
| 2.3 | pass | offline row: "(ออฟไลน์)", muted text colour (6.1:1), grayscale avatar, `--panel` bg vs `--panel2` online; screenshot m-4-offline |
| 2.4 | pass | 360x640, 6 players: count "ผู้เล่นตอนนี้ 6 คน" and wait text "รอ Moderator เริ่มเกม (ต้องมีผู้เล่น 6–12 คน)" bottoms 227/190px (<640); last row bottom 615 |
| 2.5 | pass | 14-char Latin and long Thai names: no overflow (nm/nm-t/row scrollWidth <= clientWidth), tags still inside row. 14-char self name + "(คุณ)" with ellipsis not directly measured (CSS: `.nm-tag{flex:none}`, `.nm-t` ellipsis) |
| 2.6 | pass | no lobby text < 14px (sizes 14/15/16/22/36-44); row 56px, button/inputs 48px; no other interactive lobby elements |
| 3.1 | pass | `lb-glow` (2.4s infinite) on code badge and `lb-pulse` (1.6s infinite) on dot, CSS only |
| 3.2 | pass | new row has `.enter`, `lb-in` duration 240ms, 1 iteration; only new player (Newbie, then Eve) got `.enter` on later pushes |
| 3.3 | pass | reduced-motion emulated: getAnimations() = [], animation-name none on badge/dot/rows, static glow shadow kept; mobile and desktop |
| 3.4 | pass (note N-2) | existing rows not re-animated on push; focus + typed value on #jname kept after render() (id jname, value kept). Badge glow/dot pulse restart on each push (N-2) |
| 4.1 | pass | ornaments are emoji (🕯️) + CSS with `/ ""` alt; no new assets/requests (`git diff main -- app/src` empty, only index.html + style.css) |

## Unchanged checks

| Row | Result | Evidence |
|---|---|---|
| No change server/socket/API/state/rules | pass | `git diff main --stat -- app/src` empty; only app/public/index.html, style.css (plus .team docs) |
| ids jcode/jname, join(), render focus-restore | pass | AC-1.5, AC-3.4 |
| Other phases render | pass | mod started game with 8 players: phase MORNING renders gameHTML at 360x640 (no horizontal scroll, scrollW 360) and 1280x720; `.lb` absent |
| Desktop layout | pass | 1280x720 join card 520px centred, lobby card centred (d-*.png); scrollW 1265 = viewport minus scrollbar |
| Shared classes (.setup,.btn,.card,.plist,.pl,.av,.chip) elsewhere | pass | all new rules scoped under `.jn`/`.lb`/`.setup.lb`; game screen visually/structurally intact |
| No new deps/fonts/assets | pass | no package.json/asset diff |

## npm test (app/)

`npm test` exit 1, **pre-existing failure, not caused by this change**: `test/http-parity.js` reports 7 DIFFs (`/`, `/?room=ABCD`, `/mod`, `/style.css`, `/common.js`, `/index.html`, `/mod.html`). The identical 7 DIFFs occur on the untouched `main` checkout (stale `test/http-parity.json`: it also flags /mod.html and /common.js which this branch does not change). `&&` chain stopped there, so the rest were run individually, all pass: golden (315 games) OK, mod-actions OK (71 steps), simulate ALL OK, events ok, fx OK, no-repeat-cards OK.
After this branch merges, `http-parity.json` needs a re-record (`node test/http-parity.js --record`) by the owner on a known-good baseline (not done by QA; that is not a UI regression).

## Results

16 of 16 AC pass (story rows AC-1..AC-4 plus 1.1-4.1). Bugs: none.

## Bugs

none

## Notes

For backlog (not bugs, nothing open):
- N-1 (FE, AC-1.2): join button text is hard-coded `#fff` on `#7c3aed` (neither a theme token); done deliberately to fix review B-1 (contrast 5.7:1). Consider a token later.
- N-2 (FE, AC-3.4): on every state push the whole `#app` is re-rendered, so the code badge glow and waiting-dot pulse restart (glow jumps from 750ms to ~80ms). List rows do not flicker. Visible only on join/leave pushes; low impact.
- N-3 (Orchestrator/Dev, tests): stale `app/test/http-parity.json`, see npm test.

Environment notes: no docker; node_modules junction created then removed with `rmdir` (target intact); server and Chrome stopped. QA worktree has no changes to commit; report files were written to the feature worktree path as instructed.
