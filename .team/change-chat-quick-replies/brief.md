# Brief: change-chat-quick-replies (L1)

Summary: 10 Thai quick-reply phrases (all <=25 chars) by intent; ship 10, 5 optional extras.

## Context
- `app/src/engine/chat.js:16,26`: Meeting Purge limit uses `chatCount(s) = Array.from(s).length` (code points; Thai vowel/tone marks each count 1). Over-limit message is rejected without spending quota.
- `app/public/index.html:154-158` `chatBar()`: only in MORNING / VOTE_INTERIM, only if alive; limit defaults 3 msgs / 30 chars (`S.chatLimit`). Quick replies fit here as a button row above the input.
- Rules doc: NDA Silence blocks chat (so hide/disable buttons); Status Page Down hides Mana all day; Monday has no vote; Skip has a penalty (2 in a row = -1 Mana).

## From the second brain
None relevant found (no prior chat tasks read).

## Options
Reference pattern: Among Us Quick Chat uses fixed templates in 7 categories (Accusation, Crew, Systems, Location, Statements, Question, Response). Fixed phrases cut typing, avoid leaking via custom text, and are moderation-safe. Take the intent categories, drop map-specific ones.
A: flat list of 10 buttons (recommended: simple, mobile-friendly).
B: category tabs like Among Us (more clicks; overkill for 10).
Counts below are code points via the Array.from rule, hand-counted (no script available); FE should assert `chatCount <= 30` in a test.

| Intent | Phrase | Chars |
|---|---|---|
| Ask for claims | ใครเป็นสายสืบ ขอเคลมหน่อย | 24 |
| Ask for info | ขอดูว่าใครโหวตใคร | 17 |
| Accuse | คนนี้น่าสงสัย | 13 |
| Vote call | ขอโหวตไล่คนนี้ออก | 17 |
| Vote call (skip) | ขอโหวต Skip รอบนี้ | 18 |
| Defend | ฉันไม่ใช่ฝ่ายมืด | 16 |
| Agree | เห็นด้วย โหวตตามนี้ | 19 |
| Disagree | ไม่เห็นด้วย ยังไม่มีหลักฐาน | 25 |
| Stall | ใจเย็นก่อน อย่าเพิ่งไล่ | 22 |
| Stall | ขอคิดก่อนโหวต | 13 |

Optional extras (not shipped): ขอเวลาอธิบายแป๊บ (16), ขอเช็กโหวตก่อน (14), Mana เหลือเท่าไหร่? (19; useless on Status Page Down day), ใครโดน NDA ปิดปาก? (18; leaks/bluff risk, NDA'd player cannot reply), ฝั่ง-claim lines.

Recommendation: ship all 10 above (within 8-12). Covers accuse, defend, claim request, vote calls, agree/disagree, stall. Game vocabulary: สายสืบ, ฝ่ายมืด, โหวต, Skip. No role self-claims (a fixed "I am X" button would be an unverifiable shortcut and reduces bluff depth).

## Must-not-miss requirements
- Each tap = 1 chat message against quota; server must validate text is in the allowed list (do not trust client text) and still apply the 30-char Purge check.
- Hidden/disabled under NDA Silence and outside MORNING/VOTE_INTERIM or when dead.
- Skip button text should not imply the vote is cast (chat only).

## References
- https://among-us.fandom.com/wiki/Quick_Chat
- https://www.thegamer.com/among-us-adds-quickchat-feature/
- https://www.gamesradar.com/among-us-gets-quickchat-wheel-on-all-platforms
- Not found: Town of Salem, Werewolf Online, mobile Mafia quick-chat sources (not searched beyond one query).

## Level reached
L1. Stopped: intent taxonomy from Among Us is enough for 10 short phrases. Open: playtest wording with Thai players; Mafia/Town of Salem not verified.
