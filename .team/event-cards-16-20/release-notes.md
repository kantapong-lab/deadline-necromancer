# Release notes: event-cards-16-20

## What changed (user-facing)
Event deck grows from 15 to 20 cards. Five new Daily Rule cards, drawn Tue-Fri, one per day (4 per game):

| # | Card | Rule |
|---|---|---|
| 16 | Meeting Purge (ล้างประชุมประจำ) | Public chat limited to 3 messages of at most 30 characters; emoji do not count; over-length is rejected, not cut, and costs no quota; dark night chat unlimited |
| 17 | More Hands on Deck (ทีมเสริมมาช่วย) | k = max(1, floor(alive/4)) random alive players named publicly; their vote weight is 0 for the day |
| 18 | UAT Too Late (ทดสอบก่อนส่งงานไม่กี่วัน) | After the vote closes, 3 random alive players named with "at least 1 dark" or "no dark"; always true |
| 19 | Client Redesign (ลูกค้าขอแก้ดีไซน์) | Two vote rounds. Round 1 closes into new phase VOTE_INTERIM (counts only, no voter names, nobody ejected). Moderator action `openRound2` starts round 2, which is the real result |
| 20 | Status Page Down (หน้าสถานะล่มไปด้วย) | Public sees only Burnout names; one random alive on-call engineer privately gets the full night report; moderator sees it; Mana bar stays visible |

Also: `/gallery` and card info show #16-#20 with art; docs updated (event cards, player rules, design, ideas, READMEs); golden-master re-recorded with 40 seeds per room size.

## API / protocol
No new socket event names. New `mod:do` action `openRound2`; new phase `VOTE_INTERIM`; `p:chat` also accepted in `VOTE_INTERIM`. New view fields (omitted when the card is inactive): `me.chatLeft`, `interim`, `event.extra`, moderator `statusReport`.

## Breaking changes
None for non-card days (golden stage A proves byte-identical output). A moderator client that does not know `openRound2` cannot advance a #19 day; the bundled `/mod` page is updated.

## Tests
`npm test` and `node test/qa/qa-cards.js` (QA report: 4/4). Balance before/after (AC-39) was not run; not rebalanced.

## Rollback
Revert the merge of `feature/event-cards-16-20`; rooms are in memory, so restart clears all state.

## Deploy hand-off
- Branch: `feature/event-cards-16-20` (merge to `main`).
- Migrations: none (no datastore).
- New env vars / config: none.
- Order: merge, then `cd app && npm test` (must pass), then restart the server (`npm start`); running rooms are lost on restart.
- After merge: the Orchestrator re-records `app/test/http-parity.json` because it hashes `docs/deadline_necromancer_design.md`, which changed in this release; until then http-parity fails.
- Check after deploy: open `/gallery` (20 event cards with images); start a game and confirm no regression on a normal day.
