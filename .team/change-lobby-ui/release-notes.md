# Release notes: change-lobby-ui

Branch: `feature/change-lobby-ui` (nothing merged, nothing pushed). Scope: player-side join and lobby screens only, look only.
Changed files: `app/public/index.html` (`joinHTML`, `lobbyHTML`), `app/public/style.css` (new `.jn` / `.lb` scoped rules, appended at the end).

## Changes

### Join screen
- Dark necromancer look: card on the theme panel colour, title in the light gold accent with a soft glow, 14px helper text.
- Inputs are full width and 48px tall. The room code input shows 20px, uppercase, letter-spaced text. The name input is 16px, so iOS does not zoom on focus.
- The join button is full width, 48px tall, with a press (scale) effect.
- The error banner sits above the inputs, same text as before, 14px, with `role="alert"`.
- Room code prefilled from the URL (`?room=XXXX`) still fills `#jcode` (max 4 characters). Name max is still 14 characters.

### Lobby screen
- Title "🪑 ล็อบบี้ห้อง" on its own line. The room code moves into a gold-bordered code badge under it (`.code` class kept): 36px up to 1000px wide, 44px on desktop.
- Wait line "รอ Moderator เริ่มเกม (ต้องมีผู้เล่น min–max คน)" with a green status dot, then a count chip "ผู้เล่นตอนนี้ N คน".
- Player list is one column. Each row shows an avatar initial and the name. Long names are cut with an ellipsis instead of overflowing.
- Your own row has a gold border and tint and keeps the "(คุณ)" label.
- Offline rows keep the "(ออฟไลน์)" label, use muted text, a greyscale avatar and a darker background.
- All lobby text is 14px or larger.

### Motion (CSS only)
- Code badge glow loops (2.4s). Status dot pulses (1.6s).
- A player row that appears for the first time slides in (240ms). Existing rows do not re-animate on a state push.
- `prefers-reduced-motion: reduce` turns off all new animations. The badge keeps a static glow.

### Ornaments
- 🕯️ emoji before the helper text on the join screen and before the "รหัสห้อง" label in the lobby (CSS `::before`, decorative, no image assets).

No change to server, socket events, API, state shape, game rules or other screens (game phase screens are unchanged).

## Breaking changes

None. Element ids `jcode` and `jname`, the `join()` call, the `.code` class and all Thai copy are unchanged.

## Migrations

None. No database, data or stored-state change.

## Rollback

Revert the change commits on `feature/change-lobby-ui` that touch `app/public/index.html` and `app/public/style.css`, then redeploy the static files. There is no data to undo.

## Known issues (non-blocking, from QA)

- The join button text is hard-coded `#fff` on `#7c3aed` (not a theme token). Contrast is 5.7:1, so it passes AC-1.3. Consider a token later.
- Every state push re-renders `#app`, so the code badge glow and status dot restart on each push. Rows do not flicker. Most visible on join/leave.
- `lobbySeen` is never cleared when a player leaves the lobby. If the same name rejoins in the same tab, its row does not get the entrance animation. Cosmetic only.

## Deploy hand-off

- **Branch and commit:** `feature/change-lobby-ui`. Head at the time of writing is `d0f2f6c`. The deploy commit is whatever the owner merges into `main`. Nothing is merged or pushed yet.
- **Migrations to run:** none.
- **Rollback of migrations:** not applicable.
- **New env vars or config:** none. No new dependencies, fonts or assets.
- **Order:**
  1. Owner reviews and merges `feature/change-lobby-ui` into `main`.
  2. Deploy the static files `app/public/index.html` and `app/public/style.css`. No server code changed, so the diff does not require a server change.
  3. After merge, the owner re-records the parity baseline with `node test/http-parity.js --record` on a known-good build. This is required (see below).
- **Known pre-existing failure (not caused by this change):** `app/test/http-parity.js` fails with 7 DIFFs on `main` too. The cause is a stale `app/test/http-parity.json`. The DIFFs include `/` and `/style.css`, which this change edits, so the re-record is expected after merge. Do not treat the failing parity check as a regression from this change.
- **Check after deploy:**
  - Join screen at 360x640: no horizontal scroll; code and name inputs and the button are full width and 48px tall.
  - `/?room=XXXX` prefills the code and shows it uppercase.
  - Lobby at 360x640 with 6 players: the wait line and count are visible without scrolling.
  - Long names (14 characters) truncate and do not overflow.
  - Reduced motion (OS setting on): no badge glow, dot pulse or row entrance.
  - Desktop 1280x720: join card centred at 520px; lobby centred.
  - Game screens (after the game starts) still render at 360px with no horizontal scroll.

## Sources

- `.team/change-lobby-ui/ac.md`: AC-1.1 to AC-4.1 (scope, sizes, contrast targets, motion rules).
- `.team/change-lobby-ui/design.md`: layout, tokens, row states, motion, responsive breakpoints.
- `.team/change-lobby-ui/qa-report.md`: 16 of 16 AC pass, 360x640 and 1280x720 checks, N-1 to N-3 notes, `?room=` prefill, the `http-parity` pre-existing failure.
- `app/public/index.html` diff (`joinHTML`, `lobbyHTML`, `lobbySeen`).
- `app/public/style.css` diff (lines after 218: `.jn`, `.lb`, keyframes, media queries).
- `app/README.md`: checked, does not describe the lobby or join look, so not edited.
