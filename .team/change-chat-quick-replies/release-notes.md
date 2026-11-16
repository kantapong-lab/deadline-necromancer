# Release notes: change-chat-quick-replies

Scope: player morning chat only (MORNING / VOTE_INTERIM, alive players).

## Changes

- Chat bar has a visible send button (ส่ง). It submits like Enter: same validation, same errors.
- After a successful send the input and draft are cleared, also when a state push arrives mid-send. A rejected send (over 30 under Purge, quota out, error) keeps the text and shows the error in `#chatErr`.
- 23 quick-reply buttons (`QUICK_REPLIES` in `app/src/shared/data.js`, served by `/data.js`). One tap posts the exact phrase; the typed draft is untouched.
- A quick reply is plain `p:chat` text, so it counts as 1 message under Meeting Purge (3 messages, 30 code points). Unlimited without Purge.
- Quick replies are disabled under NDA Silence and when Purge quota is 0, and a phrase longer than 30 under Purge renders disabled. Emoji unchanged.
- The Skip phrase ("ขอโหวต Skip รอบนี้") is chat only: no vote, no Mana change, no Skip penalty.
- `p:chat` ack is raced against a 5s timeout so a lost ack cannot leave the bar stuck; the draft is kept on timeout.
- Player rules doc: chat note added (`docs/deadline_necromancer_player_rules.md`).

## Breaking changes

None. `p:chat` payload and state shape unchanged; no engine or server edits.

## Migrations

None (no DB).

## Rollback

Revert the merge commit. No data to undo.

## Deploy hand-off

- Branch: `feature/change-chat-quick-replies` (QA round 3 pass at 3889601, `npm test` exit 0).
- Migrations: none. New env vars or config: none. New dependencies: none.
- Changed: static files (`app/public/index.html`, `app/public/style.css`), `app/src/shared/data.js`, tests, `app/test/http-parity.json` (re-recorded).
- Order: merge, restart/redeploy the app as usual.
- Cache: `/data.js` is served no-cache, so clients pick up `QUICK_REPLIES` on reload. A stale `index.html` tab can show old UI until refreshed.
- Check after: open a room, MORNING as an alive player: send button and 23 quick replies show; tap one and it appears in the feed; under Purge the chip drops by 1; under NDA Silence the buttons are disabled.
- Not verified by QA: real touch device, iOS Safari, landscape.
- Announcement: none (user opted out).

## Sources

23 phrases: `app/src/shared/data.js` lines 82-105. 30 chars: `PURGE_LEN` and 3 messages `PURGE_MSGS` in `app/src/engine/constants.js`. 5s timeout: `app/public/index.html:100`. Results: `qa-report.md`.
