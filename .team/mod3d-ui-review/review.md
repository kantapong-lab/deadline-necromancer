# Mod3D UI review (mod3d.html + mod3d/director.js)

Method: read all CSS/JS + 2 screenshots (1052x700). Overflow numbers below are computed from the code (rem, canvas = 72vh, ppu = canvasH/20, pitch 3.05u), not measured in a browser. Secrecy: no fix below leaks factions while hidden.
Notation: M = mod3d.html, D = director.js.

## P0 (breaks)

1. Caption `#cap` covers faction row 3 (M:96). It sits at `bottom: chatH + .8rem`, 46rem wide, z 700. The gap between row 3 and the chat panel is only ~38px at 1052x700, so the 70px caption hides the Severance cards and names. On game over it stays 20s (M:659), on the winning row. Visible in screenshot 1.
   Fix: for `OVER` (and for ms>8000) render the caption as a centred overlay over the band instead (`top:var(--bandY)`), or dim and centre it like `.dbig`. For the other captions cap it to one line: `#cap{padding:.35rem .9rem;width:min(40rem,60vw)}` and `#cap div{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}`. Also add `body.modopen #cap{left:calc(50% - 9.5rem)}` so it does not cover the open mod panel (z 700 > 8).

2. 7+ cards in one row run under the names column and off screen (M:376-377). `x0 = -hw + 12.5rem/ppu + 1.6` and a fixed pitch of 3.05u. Nothing reserves the right 13rem, nothing clamps. By calculation: 1052x700 fits ~8 cards, 800x600 only ~6, 4:3 or portrait fewer. A faction with 7+ players (12-player game, all in revealed mode) overlaps `.rowR` at narrow aspect. At <=900px the side columns are `display:none` (M:119) but x0 still reserves 12.5rem.
   Fix in `rowAssign`: `const L=12.5*rem/ppu+1.6, R=13*rem/ppu+.8, maxN=Math.max(1,...rows.map(r=>r.length)); const pitch=Math.min(3.05,(2*hw-L-R)/Math.max(1,maxN-.2));` and use `x0 + k*pitch` (cards 1.9*1.32u wide overlap slightly below pitch ~2.6; below 2.4 shrink `worker.scale` as well, or fall back to two sub-rows). Cache `rem` on resize, `rowAssign` calls `getComputedStyle` every frame (M:376, via `frame()` M:723). Drop the 12.5rem reservation when `innerWidth<=900`.

3. Band overflows below ~1100px (M:18-33, 119). `.bandL` (phase 1.15rem nowrap + 5 day chips + waitTxt) and `.bandR` (secbadge + 3-item nowrap legend + mana min 8rem) both exceed their `1fr` cells; `min-width:0` without `overflow` makes them spill into the centre column and the altar. At 1052 the badge already starts at x=390 (inside the altar cell) and the mana bar is squeezed to ~120px (screenshot 1). At <=900px (cells 1fr 5rem 1fr) it overlaps outright.
   Fix: the legend duplicates the coloured row headers, so remove it (`#legend` and M:448), or at least `@media (max-width:1280px){.legend{display:none}}`. Also add `.bandL,.bandR{flex-wrap:wrap;row-gap:.2rem}` and let the band grow: `min-height:3.4rem;height:auto`. `.secbadge` can shorten to "👁 บทบาท" under 1100px.

4. `#modTab` (z 9, right:0, 2.2rem wide) sits on top of the band's right edge and clips the mana bar and its right padding (both screenshots, bar cut at x≈1028). It is visible in the default laptop mode.
   Fix: `body:not(.tv) .band{padding-right:3rem}` (the tab is ~2.2rem), or move the tab to the bottom-right above the chat (`top:auto;bottom:calc(var(--chatH) + 1rem)`).

## P1 (should fix)

5. Phase band hides the altar/crystal. The background is 95% opaque dark across the empty 9rem centre column (M:18), so the crystal is half-cut (screenshot 1, y≈300-360).
   Fix: punch the middle out: `background:linear-gradient(90deg,#0b0916f2 0,#17112cd9 calc(50% - 5.5rem),transparent calc(50% - 5rem),transparent calc(50% + 5rem),#17112cd9 calc(50% + 5.5rem),#0b0916f2 100%)`, and project the band at crystal height (`tmpP.set(0,1.3,0)` in `updateSides`, M:542).

7. Team headers too small for TV (M:37). `.hd` is .72rem (~12px at 1052) with letter-spacing .12em; in a Dota-style layout the team name is a primary element. The phase text (1.15rem) is also barely bigger than the chat text.
   Fix: `.rowL .hd{font-size:1.15rem;font-weight:800;letter-spacing:.06em;line-height:1.1}`, and show the count as a pill (`<small>`). `.phase{font-size:1.5rem}`. Bump `.legend/.day/.mana small/#waitTxt` from .75-.8rem to >=.95rem, and the mana count (key game number) to 1.1rem. Remove `letter-spacing` and `text-transform` on Thai strings (`.lh` M:54; Thai combining marks drift).

8. Right-hand name chips (M:39): no overflow handling. A long Thai name wraps and exceeds the row strip; with 6+ names the stack is taller than the strip (5 names already touch the strip edges in screenshot 1, strip = 5.6u = ~8.8rem at 1052; one chip ~1.35rem).
   Fix: `.rowR .p{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}` and when >5 names switch to 2 columns: `.rowR{flex-flow:column wrap;max-height:var(--rowH);width:auto;max-width:24rem}` with `--rowH` set from JS (`5.6*ppu+'px'`) in `updateSides`.
   `.rowR .p.out` uses `text-decoration:line-through` over the emoji prefix, so "🚪 บิ้นท์" is struck through and illegible (screenshot 1). Fix: wrap the name in a `<span>` and strike only it, or drop the strike and use `opacity:.7` + the icon.

9. Chat contrast on parchment: `#chatLog .nm small` (.7rem) and the empty-state text use `#7a6440` on `#e2d1a2` ≈ 3.7:1 (≈2.4:1 at the `#bfa468` edge); both fail AA at that size. Fix: `#5a4526` (≈6:1; edge `#4a3818`). Message text `#2e2010` is fine (~11:1) but 1rem is small for TV. Use `.tx{font-size:1.15rem}`, `.nm{font-size:.95rem}`, `.nm small{font-size:.8rem}`. The dashed separator `#8a6a3a55` is nearly invisible; raise to `#8a6a3a99`.

10. Chat height: `--chatH:28vh` leaves ~1.5 messages on a 500px-tall window and also eats canvas height. Fix: `--chatH:clamp(11rem,28vh,22rem)`. The `.lh` plaque (top:-1.05rem) is cut by the wood beam on short heights, so keep the `chatSec` top padding >= 1.4rem.

11. Chips `#chips` (M:101, right:14rem, top:.6rem, z600) float over row 1 cards when row 1 has >=6 cards (x spans 440-830 at 1052). They also overlap the open mod panel (right 14rem < panel 19rem). Fix: anchor them in the band: move the container into `.bandR` or position `top:calc(var(--bandY) - 4rem)`, and `body.modopen #chips{right:20rem}`.

12. Z-index map is messy and cross-file: `.tag` inline z up to 160 (> band 5, chatSec 6), `.dbub` inline 500 (> modPanel 8 / modTab 9, so ✓/✗ bubbles draw over the open panel), `#msg`/`#cap`/`.dstamp` all 700, `.dbig` 650, `.dtimer` 650, `#flash` no z-index (so flash is under the HUD; only the canvas flashes), `#lobby` 20 (under cap/dbig/msg 600+, so overlays can show over the lobby).
   Fix: tokens in `:root`: `--z-rows:4;--z-band:5;--z-chat:6;--z-mod:8;--z-bub:60;--z-dbig:650;--z-cap:660;--z-msg:670;--z-stamp:680;--z-lobby:900;--z-flash:950`. D:131 `.dbub` inline `zIndex=500` -> `var(--z-bub)`. `#msg` (top:30%) and `.dstamp` (top:40% of viewport, not canvas) overlap at heights <=700; put the stamp on the band's Y (`top:var(--bandY,40%)`).

13. Short/very wide viewports. VIEW_H=10 fixes world height so card px height = ~0.167*canvasH (130px at 1080p, 84px at 1052x700): small for TV and the strip/band rem sizes do not follow. 21:9/32:9: cards stay 3.05u pitch left-aligned while names sit at the right edge, leaving a huge void; hidden mode already has a ~200px empty left gutter (screenshot 2).
   Fix: scale card pitch/scale with the available width up to a max (`CSC` 1.9 -> up to 2.3 when `2*hw>40`), or centre the card block between the two columns. Make rem aware of height: `html{font-size:clamp(16px,min(.55vw + 10px,1.1vh + 8px),28px)}` so 1920x600 does not get 20px chrome around a 360px canvas.

14. Perf/DOM churn per frame: `rowAssign()` (M:723 and getComputedStyle), `drawBoard(day)` redraws a hidden canvas on every `renderHud()` (M:469; `boardMesh0.visible=false`), `layoutLabels` for empty tags. Cache and remove (see dead code).

15. Mod panel keyboard/ARIA: the closed panel is only `translateX(105%)`, so its buttons stay in the tab order (and are announced) off-screen. Fix: `#modPanel{visibility:hidden;transition:transform .3s,visibility 0s .3s}` `body.modopen #modPanel{visibility:visible;transition-delay:0s}`; set `aria-expanded`/`aria-controls` on `#modTab` in `toggleMod`, focus the first button on open, and give the panel `role="dialog" aria-label`. `#modTab{opacity:.45}` puts the label ~2.5:1; use opacity .75 and `:focus-visible{opacity:1}`.

16. Focus ring: `.btn:focus-visible{outline:none}` leaves only a 1px border colour change (M:87). Fix: `.btn:focus-visible,#modTab:focus-visible{outline:.18rem solid var(--light);outline-offset:.15rem}`. Also add `aria-live="polite"` to `#chatLog` and `role="status"` to `#cap`.

17. prefers-reduced-motion is not handled anywhere (M, D): `chatIn`, `pop`, `dbigIn` (rotateY 180 + scale .3), `dstamp` (scale 2.8), card flights (`layoutT`, M:725), camera `punchAt` push-in, mod panel slide, full-screen `flash()` (black .55 / white .25, M:457-461).
   Fix (CSS, in M and in D's injected style at D:46): `@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}`. JS: `const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;` then `if(RM)` skip `punchAt`, set `layoutT` so cards snap (`snap()` already exists), and cap `flash` alpha at .15.

## P2 (polish)

18. Alignment: band padding is 1.4rem but `.rowL` left/`.rowR` right are .9rem, so the phase text (x=22) and mana bar edge do not line up with the team headers (x=14) and name column. Fix: `.band{padding:0 .9rem}` (+ the 3rem tab clearance of #4). Use a shared `--edge:.9rem`.

19. Fixed-px sizes in D:36-40 (`.dstamp` 54px, `.dbub` 12px, `.dtimer` 300px) ignore the rem scale: the ✓/✗ bubbles are tiny on a 4K TV (rem 28 vs 16). Fix: `.dstamp{font-size:3.2rem;border-width:.4rem}`, `.dbub{font-size:.9rem}`, `.dtimer{width:18rem;height:.9rem}`.

20. Theme tokens: `--dark` is purple (UI accent) while the Cult faction is `--cult` red and `--light` is gold while the Team faction is `--team` blue; easy to misuse (`.day.now` uses `--dark`). Rename `--dark`->`--accent`, `--light`->`--gold`. The wood palette is ~25 raw hexes (`#3a2414 #6b4423 #5a3b1c #8a6a3a ...`): define `--wood-1..4`, `--parch-1..3`, `--ink`. Mod panel/nlog header/lobby remain purple glass next to brown wood; give `#nlog .lh` the wood plaque gradient and `#modPanel` a `border-left:.18rem solid #5a3b1c`. The mana bar is always blue/violet while the 3D crystal shifts red->violet->cyan; tint the `.fill` by percentage (JS: `fill.style.background`) or use the crystal colours.

21. Chat details: Thai glyph fallback for the serif stack depends on installed fonts (`Noto Serif Thai` rarely present on Windows -> mixed Palatino/Leelawadee). Use `"Sarabun","Noto Serif Thai"` first or ship a webfont. `.av` uses the first character; Thai combining marks (leading vowel + consonant) can render an odd glyph: use `Array.from(name.normalize())[0]` plus a fallback. `.m` re-renders the whole list on any new message (only newest animate - good).

22. Game-over/`#cap` text sizes: `#cap b` 1.1rem and `div` .95rem are small for a 20s winner message. Use 1.6rem/1.15rem for the `OVER` variant.

23. `window.__mod3d` exposes every player's role (M:662) to anyone with devtools on the TV laptop, and `mod:join{full:true}` always sends roles to this client (the secrecy rule is visual only). Gate the hook behind `?debug=1`/e2e flag; note the risk if the TV page is ever loaded on a second device.

24. Reveal feedback: `punchAt(0,0,ROWZ[1])` zooms the camera while the HTML columns fade in on a separate timer (`transition:opacity .4s`, but `replaceChildren` swaps instantly). Add `.rowR .p{animation:pop .3s}` per chip for the reveal, or crossfade by faction colour on `border-left`.

## Dead code to remove (verified by reading M, no matching element/usage)
- CSS: `.brand` (M:22), `.rowL .o` (38; nothing creates it), `.bub`/`.bub.y/.n` (105-106; D uses `.dbub`), `#lab` + `.lr` (108-109; no `#lab` element), `select.btn` (107), `.tag*` rules and `--tagW`, `.mana .bar` duplicated min rules at M:26, `.legend` display toggled by JS only.
- HTML: `#legacy` buttons are still wired (`data-p/fire/burn/mp/mm/next/reroll/secret`); keep only what JS references, or delete the handlers (M:464-500) together.
- JS: `labelsEl`/`.tag` elements + `layoutLabels` + `d.lbl/cardTop/anchor` (only `cardTop`/`labelPos` still used by bubbles in D), `refreshLabel` (does nothing visible), `boardMesh0`/`drawBoard`/`boardCv`, `skyDay/skyNight/winMat`, `torchLights`, `showAura = ... && false`, desk lectern/candle/grimoire meshes built then `visible=false` (M:381-395, 407), `holo` update per frame (M:756, `d.anim`), `envelope()`, `pageTex`, `expireTrap`, `PRESET` fields unused (`mon`, `r`, `h`, `sky`).

## Verified OK
- Hidden mode: 3-row id%3 grid, no text/colour under cards, names list neutral, legend/badge hidden: no leak found.
- `.btn:hover`, `#cap`/`.dbig` do not collide at 1080p (dbig bottom ~53vh vs cap top ~64vh).
- Chat text/ink contrast (`#2e2010` on parchment) and legend contrast pass AA; sizes are the issue (see #7, #9).
