# AC: change-vote-result-phase-ui (ui-only, retroactive)

Request: ย้ายและเปลี่ยนการแสดงคำว่า "ประกาศผลโหวต" ใน `app/public/mod3d.html` (ชื่อเฟสเดิมเป็นข้อความเล็กที่มุมซ้ายของแถบกลาง). Chosen from 8 mockups: title card + stepper + caption (the "แนะนำ" combo). Look only: no engine, API or rule change.
Written after the work was done (commit `5100bad` on `main`); the ACs describe what was built and how it was observed.

## Stories
- US-1 (P0): As the moderator watching the 3D screen, I see the vote result announced on the stage when the result phase starts.
- US-2 (P0): As the moderator, I can still read the result after the card is gone, until the night starts.
- US-3 (P1): As anyone looking at the band, I see where the game is: morning, vote, result, night.

## Acceptance criteria
| id | one-line | detail |
|---|---|---|
| AC-1.1 | Entering `VOTE_RESULT` plays a red title card "ประกาศผลโหวต" with a scales seal | [AC-1.1] |
| AC-1.2 | The card's second line is `voteResult.text` (fallback "ผลการโหวต") | [AC-1.2] |
| AC-1.3 | The card is queued before the vote fx (fire / stamp) | [AC-1.3] |
| AC-2.1 | After the card, a caption bar shows the same text and stays until the phase leaves `VOTE_RESULT` | [AC-2.1] |
| AC-2.2 | Opening the page mid-result shows the caption straight away, no card | [AC-2.2] |
| AC-2.3 | With reduced motion: no card, a toast plus the caption | [AC-2.3] |
| AC-3.1 | `#phase` renders a 4-step stepper; steps before the current one show a check, the current one is highlighted | [AC-3.1] |
| AC-3.2 | `VOTE` and `VOTE_INTERIM` share step 2; the interim label reads "พักโหวต" | [AC-3.2] |
| AC-3.3 | `OVER` shows one chip "🏁 จบเกม" instead of the stepper | [AC-3.3] |
| AC-3.4 | The full phase name stays in `#phase` `aria-label` and `data-phase`; the e2e check reads `aria-label` | [AC-3.4] |

## Out of scope
Engine, API and vote rules; the moderator panel script (`mod-view.js`); other ideas from the mockups (floating banner, chips, dock).

[AC-1.1]: ac/AC-1.1.md
[AC-1.2]: ac/AC-1.2.md
[AC-1.3]: ac/AC-1.3.md
[AC-2.1]: ac/AC-2.1.md
[AC-2.2]: ac/AC-2.2.md
[AC-2.3]: ac/AC-2.3.md
[AC-3.1]: ac/AC-3.1.md
[AC-3.2]: ac/AC-3.2.md
[AC-3.3]: ac/AC-3.3.md
[AC-3.4]: ac/AC-3.4.md
