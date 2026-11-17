# AC: change-card-grid-2x2x3 (ui-only, retroactive)

Request: เปลี่ยนการแสดงผล role card เป็น 2 แถว (บน/ล่าง) และ 2 คอลัมน์ (ซ้าย/ขวา) คอลัมน์ละ 3 ใบ รวมสูงสุด 12 ใบ; then "เพิ่มขนาด role card ให้ใหญ่ขึ้น". Target: `rowAssign()` and the stage geometry in `app/public/mod3d.html`. Look only: no engine, API or rule change.
Written after the work was done; the changes are in the working tree of `main`, not committed. The user chose "อยู่ที่เดิม" for the reveal; the packing question was not answered, so the recommended default (outer edge) was used.

## Stories
- US-1 (P0): As the moderator, I see up to 12 players as two rows of two blocks of three cards, around the rune circle and phase band.
- US-2 (P0): Revealing roles only flips the cards; nobody changes place.
- US-3 (P1): The cards are bigger and easier to read than before.
- US-4 (P2): After the reveal I still see how many players each team has.

## Acceptance criteria
| id | one-line | detail |
|---|---|---|
| AC-1.1 | Two rows (top, bottom), each with a left and a right block of at most 3 cards | [AC-1.1] |
| AC-1.2 | Cells fill top-left, top-right, bottom-left, bottom-right in id order; counts per N as in the table | [AC-1.2] |
| AC-1.3 | A cell with fewer than 3 cards packs to the outer edge | [AC-1.3] |
| AC-1.4 | The blocks are mirrored around the rune circle and keep clear of it | [AC-1.4] |
| AC-2.1 | Positions do not depend on faction or on whether roles are shown | [AC-2.1] |
| AC-3.1 | Cards are about 26% larger (scale 2.4, was 1.9) and shrink only when the width runs out (minimum 55%) | [AC-3.1] |
| AC-3.2 | Rows sit at z ±7.2 and the camera is centred on the band so the stage stays balanced | [AC-3.2] |
| AC-4.1 | With roles shown, a team legend (emblem + count) sits in the top-left corner; hidden at 900px and below | [AC-4.1] |

Cards per cell (TL · TR · BL · BR): 6 → 2·1·2·1, 7 → 2·2·2·1, 8 → 2·2·2·2, 9 → 3·2·2·2, 10 → 3·2·3·2, 11 → 3·3·3·2, 12 → 3·3·3·3.

## Out of scope
Fired-player and burnout visuals, name-tag and bubble logic (`layoutLabels`), fx, and the engine.

[AC-1.1]: ac/AC-1.1.md
[AC-1.2]: ac/AC-1.2.md
[AC-1.3]: ac/AC-1.3.md
[AC-1.4]: ac/AC-1.4.md
[AC-2.1]: ac/AC-2.1.md
[AC-3.1]: ac/AC-3.1.md
[AC-3.2]: ac/AC-3.2.md
[AC-4.1]: ac/AC-4.1.md
