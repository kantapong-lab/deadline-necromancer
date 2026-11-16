# AC -> contract -> tests

How tests run today: `cd app && npm test` = `node test/<file>.js` chain (plain `assert`, no framework, no browser/DOM harness). Engine tests drive `new Game(...)` directly, `events.js` style. No UI test harness exists and none is added (D-8): UI ACs use the manual recipes below (3d smoke step), which need no setup beyond the browser console.

## New engine test: `app/test/quick-replies.js` (BE, appended to `npm test`)

Build a 12-player table like `events.js` `table()`; set `G.phase = 'MORNING'`; Purge = `G.event = { id:'purge', accepted:null, pending:false, votes:{} }; G.chatUsed = {}`; silence = `G.P(i).silenced = true`. Test names:

| Test name | Asserts |
|---|---|
| `list: 23 unique phrases, all valid` | `QUICK_REPLIES.length === 23`; unique; each non-empty, equals `.trim()`, not in `EMOJIS`; `Array.from(p).length <= PURGE_LEN`; index 12 === `'ขอโหวต Skip รอบนี้'`; index 0 `'ซัสสส ชัดเจน'`; index 22 `'ฝ่ายมืดคืนนี้นอนไม่หลับแน่'` |
| `purge: phrase counts 1` | `chat(0, QUICK_REPLIES[i])` is `null`, `viewFor(0).me.chatLeft` 3 -> 2 -> 1; feed entry `text` equals the phrase exactly, `kind:'chat'`, `who:0` |
| `no purge: unlimited, uncounted` | 5 phrase sends all `null`; `chatUsed[0]` undefined; `viewFor(0).me.chatLeft === undefined` |
| `purge quota 0: phrase rejected, emoji ok` | after 3 sends 4th phrase returns `/โควตาแชทวันนี้หมด/`, feed length unchanged, `chatLeft` 0; `chat(0,'👍') === null` |
| `silence: phrase rejected, emoji ok` | every one of the 23 phrases returns `/NDA Silence/`, feed unchanged; under Purge also `chatUsed` unchanged; `chat(p,'😂') === null` |
| `altered phrase takes the typed path` | no Purge: phrase + `'x'` accepted as typed text; Purge: index 15 (29 cp) + `'xy'` (31) -> `/ยาวเกิน 30/`, no quota used, while exact index 15 -> `null`; padded `' ' + phrase + ' '` is accepted with `text` trimmed to the phrase; silenced + altered phrase -> `/NDA Silence/` |
| `skip phrase is chat only` | in MORNING and VOTE_INTERIM: `votes`, `mana`, `skipStreak`, `voteResult` deep-equal before/after sending index 12 |

## Map

| AC | Contract home | Owner | Check |
|---|---|---|---|
| AC-1 | `p-chat.md` Client flow: `sendChat` steps 3, 5 + `render()` focus-restore fix | FE | M-1 |
| AC-2 | `sendChat` step 4 (text kept, `setChatErr`) | FE | M-2; engine already rejects (`events.js purge`) |
| AC-3 | `#chatSend` `type="submit"` in the same form as `#chatIn` | FE | M-3 |
| AC-4 | disabled rule on `#chatIn` + `#chatSend`; empty send returns early (D-6) | FE | M-4 |
| AC-5 | `chatBar()` guard unchanged; panel renders 23 `.btn.qr` in table order | FE | M-5 |
| AC-6 | `quick(i)` never touches `chatDraft`/`#chatIn` | FE | M-6 |
| AC-7 | existing `chat()` Purge branch (no code change) | BE (test) | `purge: phrase counts 1`, `no purge: unlimited` |
| AC-8 | pill `disabled` when `out`; server quota reject | FE + BE (test) | M-7 + `purge quota 0` |
| AC-9 | pill `disabled` when `silenced`; server Silence reject | FE + BE (test) | M-8 + `silence: phrase rejected` |
| AC-10 | pill `disabled` when `chatLen > S.chatLimit.len`; list invariant | FE + BE (test) | `list: ...` (every entry <= `PURGE_LEN`; the 31-char server reject is already in `events.js purge`), M-9 |
| AC-11 | unchanged typed path, no trust marker (D-2, D-3) | BE (test) | `altered phrase takes the typed path` |
| AC-12 | `chat()` has no vote/Mana code | BE (test) | `skip phrase is chat only` |
| AC-13 | design `.qr-*` CSS, vertical scroll panel, mobile rule | FE | M-10 |
| AC-14 | single `QUICK_REPLIES` in `shared/data.js`; client reads it, test imports it | BE + FE | code review: `grep` shows exactly one list literal |

## Manual / 3d-smoke recipes (tester, browser at `/?room=CODE`, game started, morning)

Fixture trick for states hard to reach: in devtools console set `S.me.silenced = true` / `S.chatLimit = { msgs: 3, len: 30 }; S.me.chatLeft = 0` then `render()`. Real states: Meeting Purge card drawn; NDA Silence via a night action.

- **M-1 (AC-1)**: type `hello`, press Enter: feed shows it, `$('#chatIn').value === ''`. Repeat with a second player sending in the same second (forces a mid-send `state` push): input still empty.
- **M-2 (AC-2)**: Purge, type 31 chars, Enter: text stays in `#chatIn`, `#chatErr` shows the over-30 text; edit to 30, Enter: sent, input empty. Also quota 0: text stays.
- **M-3 (AC-3)**: click `ส่ง` instead of Enter: same feed + empty input; same errors as M-2.
- **M-4 (AC-4)**: Silenced and quota 0: `#chatIn` and `#chatSend` both `disabled`; empty input, click `ส่ง`: nothing posted, no crash.
- **M-5 (AC-5)**: open the panel: 23 pills, table order. Hidden in VOTE, NIGHT, VOTE_RESULT and for a dead player.
- **M-6 (AC-6)**: type `abc`, tap one pill: feed has the exact phrase once, `#chatIn` still `abc`. Rapid double tap posts once (D-5).
- **M-7 (AC-8)**: Purge, send 3: chip `0/3`, all pills disabled, emoji still send; a forced tap is rejected with the quota error in `#chatErr`.
- **M-8 (AC-9)**: Silenced: all pills disabled with the note, emoji send; no quota used.
- **M-9 (AC-10)**: Purge, console `QUICK_REPLIES.push('x'.repeat(31)); render()`: the new pill is disabled, the 23 originals enabled (pop it after).
- **M-10 (AC-13)**: 375px viewport: input + `ส่ง` on one row, emoji below, toggle visible; open panel scrolls vertically only, `document.documentElement.scrollWidth <= innerWidth`; tapping pills inside the scrolled panel keeps its scroll position.
