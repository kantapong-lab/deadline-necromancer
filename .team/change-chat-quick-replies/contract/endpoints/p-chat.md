# Socket event `p:chat` (unchanged) and the client send flow

Handler: `app/src/server/handlers/player.js:12` -> `Game.chat(pid, text)` in `app/src/engine/chat.js`. **No server code changes.** `pushState(r)` runs BEFORE `ack(cb)` (player.js:10), so on every successful send the client gets a `state` push and re-renders while it is still awaiting the ack. That is the AC-1 bug, not a race (see Client flow).

Request `{ text: string }`. Response `{ ok: true }` or `{ ok: false, error }` (200-slice, trim, as today). Auth, phase and paused checks are the existing `playerAct` ones.

## Why the unchanged server path already satisfies the quick-reply rules

A quick reply is a typed message whose text equals one list entry. Every entry: has non-emoji content, is <= 29 code points, has no vote/Mana meaning.

| Case | Existing `chat()` behaviour | AC |
|---|---|---|
| Purge, quota left | Not emoji-only, so `counted = true`; `chatUsed[pid] += 1`; `chatLeft` drops by 1. A phrase can never be emoji-exempt (no entry is in `EMOJIS`) | AC-7 |
| No Purge | `evIs('purge')` false: nothing counted, unlimited | AC-7 |
| Purge, quota 0 | `'โควตาแชทวันนี้หมดแล้ว (Meeting Purge: 3 ข้อความ)'`, feed unchanged, quota unchanged | AC-8 |
| Silenced | `p.silenced && !EMOJIS.includes(raw)` -> `'คุณถูก NDA Silence — ส่งได้แค่อีโมจิ'` (contains the AC text), checked BEFORE the Purge block so no quota is used | AC-9 |
| Purge, text > 30 code points | `'ข้อความยาวเกิน 30 ตัวอักษร (Meeting Purge) — ไม่ได้ส่ง ไม่เสียโควตา'`. No list entry hits this today; a longer future entry is rejected by the same line (client also disables it) | AC-10 |
| Altered phrase (extra char, other text) | Same single path as any typed text: normal length/quota/silence rules, no trust granted. Exact phrase and typed identical text are indistinguishable by design | AC-11 |
| Skip phrase | `chat()` only pushes a feed item (+ maybe `chatUsed`); it never touches `votes`, `mana`, `skipStreak` | AC-12 |
| Dead player / wrong phase / empty | `'ผู้เล่นที่ออกจากเกมแล้วพิมพ์ไม่ได้'` / `'พิมพ์แชทได้เฉพาะช่วงประชุมเช้า'` / `'ข้อความว่าง'` | AC-4, AC-5 |

Status/error codes: none beyond the strings above (socket ack, no HTTP).

## Client flow (FE, `app/public/index.html`)

`chatBar()` (still `''` unless phase MORNING/VOTE_INTERIM and `me().alive`):
- Row 1: `#chatIn` + `#chatSend` in the same `<form onsubmit="sendChat(event)">`. Both `disabled` when `me().silenced || out` (`out = limited && chatLeft <= 0`).
- Row 2: existing emoji buttons (unchanged, `emoji(t)` via `act`, enabled under Silence and quota 0).
- Row 3: `.qr-toggle` ("💬 ข้อความด่วน (23)", `▾`/`▴`), never disabled. Row 4 `#qrPanel` only when `qrOpen`: 23 `.btn.qr` in table order + notes/hint copy from `design.md` "Final copy".
- Pill `disabled` iff `silenced || out || (limited && chatLen(phrase) > max)` with `max = S.chatLimit.len` (no literal 30), reusing the existing `chatLen`. A disabled pill has no extra note unless silenced/out.

`sendChat(e)` (AC-1/2/3/4):
1. `e.preventDefault()`; return if `chatBusy`; read `#chatIn`; `raw = i.value`, `t = raw.trim()`; return if `!t` (no emit, D-6). Keep the existing client pre-checks (over `lim.len`, `chatLeft === 0`) that set the error and return without emitting.
2. `chatBusy = true; const r = await emit(socket, 'p:chat', { text: t }); chatBusy = false;`
3. On `r.ok`: `if (chatDraft === raw) chatDraft = ''` (keeps text typed while the send was in flight), `setChatErr('')`, `error = ''`.
4. On reject: leave `chatDraft` as is (the text stays), `setChatErr(chatErrText(r.error, len))`.
5. `render()`, then re-query `$('#chatIn')` (the awaited `i` is detached after the mid-send re-render) and set `.value = chatDraft` (so success leaves `""`).

`render()` fix (the root cause): the focus-restore line must not write a DOM value back for `#chatIn`. Rule: `#chatIn` is always rendered from `chatDraft` (`value="${esc(chatDraft)}"` already); the restore keeps focus (and may keep the caret) but takes no value from `document.activeElement.value` when `focus === 'chatIn'`. Other focused inputs (`#jcode`, `#jname`, `#darkIn`) keep today's behaviour.

`quick(i)` (AC-6/7/8/9): `const t = QUICK_REPLIES[i]`; return if `!t || chatBusy`; `chatBusy = true; r = await emit(socket, 'p:chat', { text: t }); chatBusy = false;` reject -> `setChatErr(chatErrText(r.error, chatLen(t)))` (`#chatErr`, not the global `error` banner); ok -> `setChatErr('')`. Never reads/writes `chatDraft` or `#chatIn`. Then `render()`.

`render()` also saves/restores `.qr-panel` scrollTop (`qrScroll`) because each tap triggers a `state` push and a full `innerHTML` rebuild.

Mobile CSS (AC-13): `style.css` adds the `.qr-*` rules from `design.md`; inside the existing `@media(max-width:1000px)` block replace `.chatbar input{flex:1 1 100%}` with `flex:1 1 0;min-width:0` so `#chatSend` sits beside the input and the emoji row wraps below. Panel scrolls vertically only (`max-height:176px`), no horizontal scroll at 375px.
