# Schemas

No database, no migration, no `state` push change.

## Shared phrase list (BE writes, FE reads)

File `app/src/shared/data.js`: add a top-level `const QUICK_REPLIES = [ ... ]` (plain array of strings, not frozen, see D-4) and add `QUICK_REPLIES` to the existing `module.exports` line (last line of the file).

- Exactly the 23 strings of the `## Quick-reply phrases` table in `ac.md`, same order, no trimming, no edits. Index = table number - 1 (Skip phrase `ขอโหวต Skip รอบนี้` = index 12; last = index 22).
- Invariants (asserted by `app/test/quick-replies.js`): length 23; all unique; every entry is a non-empty string equal to its own `.trim()`; no entry is in `EMOJIS`; after stripping `EMOJIS` the code-point count is `<= PURGE_LEN`; entry max is 29 today.
- Client use: `index.html` already loads `/data.js` before its inline script, so `QUICK_REPLIES` is a global there. `mod.html`, `mod3d.html`, `gallery.html` also load `data.js` and do not use it (no clash, grep-checked).

## Socket payload

`p:chat` request stays `{ text: string }` (see `endpoints/p-chat.md`). Ack stays `{ ok: true }` or `{ ok: false, error: string }`. Feed entry stays `{ kind:'chat', who, name, text, ts }`. `state` fields used by the UI are unchanged: `S.chatLimit = { msgs, len }` (only under Purge), `S.me.chatLeft` (only under Purge), `S.me.silenced`, `S.phase`, `S.me.alive`.

## Client-only state (FE, `index.html` inline script; names pinned so nothing collides)

| Var / fn | Meaning |
|---|---|
| `chatDraft` (exists) | Single source of truth for the `#chatIn` value. `render()` must never restore a DOM value for `#chatIn` |
| `chatBusy` (new, bool) | A `p:chat` send is in flight; `sendChat` and `quick` return early while true |
| `qrOpen` (new, bool) | Quick-reply panel open; default `false`; survives `render()` (FE may reset it on a new morning) |
| `qrScroll` (new, number) | `.qr-panel` scrollTop, saved before and restored after `render()` (a tap re-renders on every state push) |
| `quick(i)` (new fn) | Tap handler: `const t = QUICK_REPLIES[i]`; emits `{ text: t }`; never reads or writes `chatDraft` or `#chatIn` |
| `toggleQuick()` (new fn) | Flips `qrOpen`, `render()` |
| `chatErrText(er, len)` (new helper) | The existing error mapping lifted out of `sendChat` (over-30 and quota texts), shared by `sendChat` and `quick` |

DOM ids/classes pinned for tests: `#chatIn`, `#chatSend` (new, `type="submit"`, label `ส่ง`, `aria-label="ส่งข้อความ"`), `#chatErr` (`role="alert"` on the inner hint), `.qr-toggle` (`aria-expanded`, `aria-controls="qrPanel"`), `#qrPanel.qr-panel`, `.btn.qr` per phrase with `data-qi="<index>"` and `onclick="quick(<index>)"` (never inline phrase text in the attribute). CSS per `design.md` "New CSS".
