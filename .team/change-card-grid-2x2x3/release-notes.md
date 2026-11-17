# Release notes: change-card-grid-2x2x3

Working tree of `main` (not committed, not pushed). File: `app/public/mod3d.html`.
Mockup: https://claude.ai/artifact/ABQ6r96SkmAcyBbvnifFtw

## Changes
- Players are laid out as two rows (top and bottom, with the phase band between them) of two blocks (left and right of the rune circle), up to three cards per block, 12 in total. Fewer players fill the blocks in order and the short blocks sit at the outer edge.
- Cards are about a quarter larger. They shrink only when the window is too narrow, and never below 55%.
- Revealing the roles flips the cards in place. The team grouping (one row per team) and its flight animation are gone.
- The per-row team emblems are replaced by one legend in the top-left corner: emblem and head-count per team, shown with the roles and hidden on narrow screens.
- The camera is centred on the band and the rows moved to ±7.2, so the stage stays balanced with two rows.
- The reveal punch-in now aims at the centre of the stage.

## Verification
- Demo room with 12 bots: e2e check ran to day 3 with no failures before the cards were enlarged; after the change the layout was checked on screen (3 + 3 in both rows, names readable, cards clear of the rune circle).
- Not verified: e2e after the enlargement, fewer than 12 players, widths below 900px, the team legend after the enlargement, the reveal punch-in.

## Open choices
- Short blocks pack to the outer edge (the mockup default). "Pack to the centre" was offered and not answered.
- Reveal: "stay in place" was chosen; the "sort by team" alternative was dropped (7 light players do not fit one row of 6).
