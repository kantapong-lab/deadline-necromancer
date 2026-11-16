# AC: change-lobby-ui (ui-only)

Request: ปรับ UI หน้า lobby. Goals: game theme, easier to read, lively. Mobile first.
Targets: `joinHTML` + `lobbyHTML` in `app/public/index.html`, styles in `app/public/style.css`. Look only.

## Stories
- US-1 (P0): As a player on a phone, I see a join screen that feels like the game (dark necromancer theme) and is easy to fill in.
- US-2 (P0): As a player in the lobby, I read the room code, player count and who is in at a glance.
- US-3 (P1): As a player, the lobby feels lively (motion, status cues) while I wait.
- US-4 (P2): Decorative extras (candle/ghost flourish, theme sound-free ornaments).

## Acceptance criteria

### US-1 Join screen (P0)
- AC-1.1: Given the join screen at 360px width, then no horizontal scroll, and code and name inputs each are full width with height >= 44px.
- AC-1.2: Given the join screen, then title, helper text, labels and the join button use the existing theme tokens (`--bg`, `--panel`, `--dark`, `--light`) with no new hard-coded off-palette colors for text.
- AC-1.3: Given text on the join screen, then contrast between text and its background is >= 4.5:1 (body) and >= 3:1 (large title).
- AC-1.4: Given an `error`, then the warning banner shows above the inputs and stays readable (same text as before).
- AC-1.5: Given a code prefilled from the URL, then `#jcode` keeps the value, uppercase display, maxlength 4; `#jname` keeps maxlength 14; the join button still calls `join()`.

### US-2 Lobby readability (P0)
- AC-2.1: Given the lobby, then the room code is the largest element after the title, shown in a distinct code badge, letter-spaced, with the `.code` class kept.
- AC-2.2: Given N players, then each row shows avatar initial and name; the row of the current user is visually distinct and still labelled "(คุณ)".
- AC-2.3: Given a player with `connected` false, then the row shows "(ออฟไลน์)" and is dimmed compared with online rows.
- AC-2.4: Given the lobby, then a count line shows `S.players.length` of `S.min`-`S.max` and the wait message "รอ Moderator เริ่มเกม" remains visible without scrolling at 360x640 with up to 6 players.
- AC-2.5: Given long names (14 chars, Thai or Latin), then names do not overflow the row (ellipsis or wrap).
- AC-2.6: Given any lobby text, then font size >= 14px and tap targets >= 44px.

### US-3 Liveliness (P1)
- AC-3.1: Given the lobby is shown, then at least one subtle looping animation runs (e.g. waiting pulse or glow on the code badge) using only CSS.
- AC-3.2: Given a new player row appears, then it uses a short entrance animation (<= 300ms).
- AC-3.3: Given `prefers-reduced-motion: reduce`, then all new animations are off.
- AC-3.4: Given a lobby re-render (state push), then animation does not restart or flicker the whole list for existing rows, and input focus on the join screen is kept.

### US-4 Extras (P2)
- AC-4.1: Given spare effort, then add ornament only (emoji or CSS), with no new image assets and no extra requests.

## Unchanged
- No change to server, socket events, API, state shape (`S`), game rules or other phases/screens (`gameHTML` and later).
- Same Thai copy meaning; element ids `jcode`, `jname` and the `join()` call stay; `render()` focus-restore keeps working.
- No new dependencies, fonts or assets; desktop layout still works.
- Existing classes used by other screens (`.setup`, `.btn`, `.card`, `.plist`, `.pl`, `.av`, `.chip`) keep their look elsewhere. Scope new styles to the lobby/join or add new classes.

## Verify
- Manual at 360x640 and 1280x720, plus a reduced-motion check; `app/src` and server files show no diff.
- Existing tests, if any, pass unchanged.

## Out of scope
- Moderator/spectator screens, start-game control, kick/ready features, sound, new copy or languages.
