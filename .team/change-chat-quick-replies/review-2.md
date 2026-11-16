# Review 2: B-1 fix (diff-2.patch)

Verdict: Approve. No blockers. Read only.

## Blockers
none

## Checks
- 5s ack timeout resolves {ok:false}; chatBusy reset in sendChat/quick, on connect and disconnect.
- Late success after timeout: message posted and shown via state push; client shows error and keeps draft; retry may duplicate (acceptable, AC-2 kept).
- socket.connect() on io server disconnect does not fight kick (kick only emits; no server-side disconnect in app/src); no reconnect loop today.

## Suggestions
- S-5: stale in-flight chatEmit from before a reconnect can show a spurious error for 4s (cosmetic).
- S-6: softer timeout text, e.g. "อาจส่งแล้ว ตรวจในแชทก่อนส่งซ้ำ".
