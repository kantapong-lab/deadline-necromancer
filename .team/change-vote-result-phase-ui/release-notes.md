# Release notes: change-vote-result-phase-ui

Commit `5100bad` on `main` (not pushed). Files: `app/public/mod3d.html`, `app/tools/e2e-3d-check.js`.
Mockups: phase label ideas https://claude.ai/artifact/8nRRKzCGyDaiPZhxjCwNV1

## Changes
- The vote result is announced with a full-stage title card: red veil, scales seal, "ประกาศผลโหวต" and the result text underneath. It uses the existing `#phaseFx` (same as morning, night and game over) and plays before the fire / stamp fx.
- The result then stays in the caption bar under the stage (red border) until the night begins.
- The phase name on the band is now a stepper: ประชุมเช้า → โหวต → ประกาศผล → กลางคืน. Finished steps show a check, the current step is highlighted (gold, red for the result, violet for night). The interim vote shows "พักโหวต". The end of the game shows a "🏁 จบเกม" chip.
- `#phase` keeps the full phase name in `aria-label` and `data-phase`. `tools/e2e-3d-check.js` reads the label from `aria-label`.

## Verification
- Demo room with 9 bots, e2e check run to day 3 with no failures and no JS errors.
- Observed in the page: card → caption → night card on day 2 (DOM observer), stepper in a screenshot.
- Not verified: full e2e run to game over, reduced motion, narrow screens, a very long result text on the card.

## Notes
- The result text comes from the engine (`voteResult.text`) and names the fired player's role. It was already read aloud by the moderator panel, so no new information is shown, but the 3D screen now shows it even while secrets are hidden.
