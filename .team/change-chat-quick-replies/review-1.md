# Review 1: change-chat-quick-replies (FE+BE combined, diff-1.patch)

Verdict: Approve. No blockers. Reviewer read only (no shell): tests and browser not run by the reviewer.

## Blockers
none

## Checks
- XSS: pass. Pill labels rendered with esc(); onclick carries only the numeric index quick(i); list is a server constant.
- render() focus restore / Enter bug: pass. #chatIn always built from chatDraft, only focus+caret restored; sendChat re-queries #chatIn after the await (pushState arrives before ack).
- chatBusy double-send guard: pass (set synchronously, shared by sendChat and quick).
- Dark-chat form: pass. Mobile rule scoped to #chatIn; .chatbar input rule unchanged for #darkIn and mod announce.

## AC map
AC-1..AC-14 traced to index.html, data.js, quick-replies.js; AC-7/11/12 via unchanged chat.js plus engine tests; AC-13 needs manual M-10 at 375px.

## Suggestions (non-blocking)
- S-1: chatBusy can stick if the p:chat ack is lost on a socket drop (emit has no timeout); reset on connect/disconnect or race with a ~5s timeout.
- S-2: after clicking ส่ง focus stays on the button; optionally refocus #chatIn on success.
- S-3: pill tap during an in-flight typed send is dropped silently (ms window).
- S-4: quick-reply panel stays open across mornings (design allowed resetting).

## Integration
http-parity.json must be re-recorded after merge; only /data.js, /style.css, /, /?room=ABCD, /index.html may change.
