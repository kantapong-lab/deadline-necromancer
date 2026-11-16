# Design: change-lobby-ui (ui-only, mobile first)

Canvas: https://claude.ai/artifact/XzytptgJkYCcsBEU1u5Kyn

Scope: `joinHTML` + `lobbyHTML` (`app/public/index.html`), new scoped CSS in `app/public/style.css`. Visual mockup published (see Canvas). No `docs/design-system/`; tokens derived from `style.css` `:root`. No new tokens, fonts, assets.

## Tokens used (existing)
`--bg #0f0d1a` `--panel #181528` `--panel2 #201c36` `--line #33294f` `--txt #ebe7f7` `--mut #9a92b8` `--light #f5c451` `--dark #b05cff` `--bad #ff5c7a` `--good #5fe39a`.
Contrast (computed): txt on panel ~14:1; mut on panel ~6:1, on panel2 ~5.4:1 (>=4.5 ok); light on panel ~10:1; bad on `#3a1a28` ~5:1. Off-palette hex allowed only for surfaces/gradients already in file (`#2f2750`, `#3a3216`, `#7c3aed`), never for text.

## Scoping
Root wrappers get new classes so shared `.setup/.plist/.pl/.av` stay untouched elsewhere:
- join: `<div class="setup jn">`; lobby: `<div class="setup lb">`. All new rules prefixed `.jn` / `.lb`.

## BEFORE (current)
- Join: `.setup` card, h1 28px, muted `p`, 13px labels, inputs with inline style (10px padding, ~40px high), small `.btn.primary`.
- Lobby: h1 with inline 28px code beside title, 12px count hint at bottom, plain rows in `.plist` (2-col grid <=1000px, 1-col <=420px), self row = gold border only, offline = muted text only.

## AFTER

### Join screen (US-1)
Layout (360px, single column, card margin 12px, padding 20px):
1. Title `h1` "🧙 Deadline Necromancer": 26px, color `--light`, text-shadow glow `0 0 18px` using `--dark` at low alpha (decorative). Large text, contrast >=3:1 (light/panel ~10:1).
2. Helper `p`: 14px `--mut`, line-height 1.5 (same copy).
3. Error banner (when `error`): existing `.banner.warn` placed directly after helper, before inputs; full width, 14px, `--txt` on `#3a1a28`, border `--bad`, icon-free, same text. `role="alert"` optional (markup-only).
4. Field group "รหัสห้อง": label 14px `--txt` (up from 13px muted); `#jcode` full width, min-height 48px, 20px font, letter-spacing 6px, centered, uppercase (`text-transform`), maxlength 4, prefill kept.
5. Field group "ชื่อของคุณ": label same; `#jname` full width, min-height 48px, 16px font (prevents iOS zoom), maxlength 14.
6. Button "เข้าห้อง": `.btn.primary` full width, min-height 48px, 16px, margin-top 20px, `onclick="join()"` unchanged.
Inline `style=` on inputs moved to `.jn .input` class (keep `class="input"`; add `inputmode`/`autocomplete="off"` optional).

Desktop >=1000px: card stays max-width 520px centered; same internals.

States (join):
| State | Look |
|---|---|
| default | input bg `--panel2`, border `--line`, placeholder `--mut` |
| focus | border `--light`, `box-shadow:0 0 0 3px` light @ ~25% alpha, outline none replaced by that ring (visible) |
| prefilled code (from URL) | value kept, uppercase, same as default; name input is the next empty field |
| error | banner above inputs; inputs unchanged |
| button hover (pointer only) | existing `.btn.primary` brightness; `:active` scale .98 |
| button disabled | not used (no behavior change) |
| loading | not designed: join() has no pending UI; out of scope |
Focus is kept across re-render by existing `render()` logic; no animation on join inputs.

### Lobby (US-2)
Order top to bottom:
1. Title row: "🪑 ล็อบบี้ห้อง" `h1` 22px `--txt` (code no longer inline in h1; keep text same).
2. Code badge (`.code` class kept, wrapped): `<div class="lb-codebox"><small>รหัสห้อง</small><span class="code">ABCD</span></div>`. The label reuses the existing join copy "รหัสห้อง" (no new meaning). Box: bg `--panel2`, 2px border `--light`, radius 14px, padding 10px 16px, centered, `.code` 44px (36px <=1000px per existing rule), letter-spacing 10px (6px mobile), color `--light`. Largest element after title. Small label 14px `--mut`.
3. Wait + count line: `p` 14px `--txt` "รอ Moderator เริ่มเกม (ต้องมีผู้เล่น {min}–{max} คน)" preceded by a status dot `.lb-dot` (CSS circle 8px `--good`, pulsing). Below/same block: count chip `.lb-count` "ผู้เล่นตอนนี้ {n} คน" 14px bold, pill (`--panel2`, border `--line`). Both sit above the list so they are visible at 360x640 with 6 players (budget: title 40 + code box 96 + wait text 44 + count 36 + card padding/margins ~60 = ~276px; list starts <300px; 6 rows x 52px + gaps 8 = ~350px; total ~626 < 640 incl. no scrolling needed for the wait message, which is at ~y=190).
4. Player list `.plist.lb-list`: always 1 column in lobby (override the 2-col mobile grid, scoped `.lb .plist`), gap 8px.
5. Row `.pl` (+ `.lb-row`): min-height 52px, padding 8px 12px, avatar 36px circle (`.av`, bg `#2f2750`, initial 16px bold `--txt`), name in `.nm` 15px/600, `min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap` (AC-2.5). Row whole is not tappable (no tap targets in lobby; rows >=44px anyway).

Row states:
| State | Look |
|---|---|
| online (default) | bg `--panel2`, border transparent |
| me | border `--light`, bg `#3a3216` tint (existing `.btn.sel` surface), avatar bg `--light` with `--bg` initial, name + " (คุณ)" suffix in `--light`; distinct without relying on color alone (suffix text + thicker border 2px) |
| offline | dimmed without row opacity (opacity would break text contrast): `.av` grayscale + reduced, `.nm` color `--mut`, row bg `--panel` (darker than online `--panel2`), tag "(ออฟไลน์)" `--mut` 14px (>=5.4:1) |
| me + offline | me styling, offline tag shown |
| enter (new row) | see motion |
| empty list | cannot occur (self always present); no state |
| long name | ellipsis, tag after name allowed to wrap onto the name line end; name 14 chars Thai/Latin fits 360px (avatar 36 + gaps 12 + padding 24 leaves ~250px) |

All lobby text >= 14px (count/hint raised from 12px, labels 14px).

### Motion (US-3, CSS only)
- Loop (AC-3.1): `.lb .code` badge glow `@keyframes lb-glow` 2.4s ease-in-out infinite alternate, `box-shadow` on `.lb-codebox` from `0 0 0 0` light@0 to `0 0 18px` light@35%. Also `.lb-dot` opacity pulse 1.6s. First/last keyframe equals rest state (rest = no glow), so a restart on innerHTML re-render is a visually negligible reset.
- Entrance (AC-3.2): `.lb-row.enter` `@keyframes lb-in` 240ms ease-out, `opacity 0 -> 1`, `translateY(8px) -> 0`, `both`.
- Re-render safety (AC-3.4): `render()` rebuilds innerHTML each push, so CSS alone would replay `enter` on every row. FE spec: module-level `const lobbySeen = new Set()`; in `lobbyHTML` add class `enter` only for a player name not yet in the set, then add it (reset set when leaving lobby optional). Existing rows render with no animation class. Pure look-state in client, no S change. Alternative rejected: always-animate with `animation-delay` (flickers whole list on every push).
- Reduced motion (AC-3.3): `@media (prefers-reduced-motion: reduce){ .lb *, .lb { animation:none !important; transition:none !important } }`. Glow then static: show a fixed subtle `box-shadow` so badge still stands out.
- Join screen: no animation (keeps focus stable).

### Extras (US-4, P2, ornament only, no assets)
- Join: 🕯️ flanking the helper text via `::before/::after` content (aria-hidden by CSS content), or decorative radial glow behind title (`radial-gradient` on `.jn`).
- Lobby: 👻 emoji next to "(ออฟไลน์)" not added (copy unchanged); instead 🕯️ pseudo-element left/right of code badge label, 18px, `opacity:.8`. Skip if time short.

## Responsive
- <=420px: card margin 12px, padding 18px, code 36px/6px spacing; list 1 col.
- 421-1000px: card max-width 520px, code 36px (existing rule), list 1 col in lobby.
- >1000px: card 520px centered, code 44px/10px, list 1 col (readable; 2-col rejected for short lobby lists).
- Touch: `@media(hover:none)` existing rule covers hover; new interactive elements only inputs/button.

## AC coverage
| AC | Covered by |
|---|---|
| 1.1 | Join step 4-6: full width, min-height 48px, no h-scroll (box-sizing border-box, card margin 12px) |
| 1.2 | Tokens table; text colors only `--txt/--mut/--light` |
| 1.3 | Contrast numbers above; title 26px light/panel ~10:1 |
| 1.4 | Join step 3, state table |
| 1.5 | Join steps 4-6, ids/maxlength/join() unchanged |
| 2.1 | Lobby step 2 (44px `.code`, badge box, letter-spacing) |
| 2.2 | Row states: avatar initial, name, me distinct + "(คุณ)" |
| 2.3 | Row state offline, tag text + dim |
| 2.4 | Lobby step 3 count + wait message above the list, height budget |
| 2.5 | Row long-name ellipsis |
| 2.6 | 14px minimum; rows/inputs/button >=44px |
| 3.1 | Glow loop + dot pulse |
| 3.2 | `lb-in` 240ms |
| 3.3 | reduced-motion media query |
| 3.4 | `lobbySeen` set; rest-state-equal keyframes; join has no animation |
| 4.1 | Extras section |

## FE notes
- Do not alter `S`, events, or ids `jcode`/`jname`; keep `.code` class and `join()`.
- Wrap-changes in `lobbyHTML` only: new wrappers, `enter` class logic, count chip, status dot. Keep texts "รอ Moderator เริ่มเกม", "(คุณ)", "(ออฟไลน์)", "ผู้เล่นตอนนี้ N คน" verbatim.
- Do not edit `.setup/.btn/.plist/.pl/.av` base rules; add `.jn`/`.lb` scoped overrides after line ~154 of style.css.
- Open: `.input` class has no matching rule seen in style.css (existing `.setup input[type=text]` doesn't match inputs without type); FE should style via `.jn .input, .jn input`. Verify at 360x640, 1280x720, reduced-motion.
