# Design: voice-over (AC-1,2,3,13,17,18,19)

Source of truth: app/public/index.html, style.css tokens (--bg #0f0d1a, --panel #181528, --panel2 #201c36, --line #33294f, --txt #ebe7f7, --mut #9a92b8, --good #5fe39a, --bad #ff5c7a, --light #f5c451, --dark #b05cff). No docs/design-system; reuse `.btn`, `.chip`, `.hint`, `.pl`/`.av`/`.nm`. All copy Thai. Canvas: `canvas/voice-spec.html` (text/CSS spec page, static states).

## Privacy rule (AC-11, governs every state)
- Others never see a mute/silence/burnout/pause marker for any player. A non-speaking player looks identical whether muted by game, silent by choice, or has no mic. Speaking indicator = presence only; absence carries no meaning.
- The player's OWN button has one generic "game-muted" state, identical for phase/pause/dead/silenced/burnout. Cause is never in the button or its aria-label.
- Only the silenced player is told privately, inside the existing silence notice (chat placeholder + vote card text), by appending a sentence. No new toast, no broadcast.
- Self speaking ring shows only when permitted AND mic live; never when game-muted (no self-reveal tell, no local-only glitch).

## Screen 1: Player voice control (AC-1, 13, 17) in index.html
Placement: a `.voicebar` row directly above `.chatbar`, shown in every in-game phase (stays visible so nothing shifts when phases change). Not shown in lobby/join. Two controls: main voice button (`.btn.vc`) + mute toggle (`.btn.vm`, 44px min touch target, both).

Main button states (`data-vs`):
| State | Visual | Label (Thai) | Behaviour |
|---|---|---|---|
| unavailable-insecure | `.btn` disabled, dashed --line border, 🎙️ with slash | ไมค์ใช้ไม่ได้ | disabled; hint below: "ต้องใช้ HTTPS ถึงจะเปิดไมค์ได้ — ยังเล่นเกมต่อได้ตามปกติ" |
| unavailable-nomic | same | ไม่พบไมโครโฟน | hint: "ไม่พบไมโครโฟนในอุปกรณ์นี้ — ยังเล่นเกมต่อได้ตามปกติ" |
| denied | same, --bad text | ไมค์ถูกบล็อก | hint: "เบราว์เซอร์ไม่อนุญาตให้ใช้ไมค์ — เปิดสิทธิ์ที่ไอคอนแม่กุญแจ แล้วกดลองใหม่" + `ลองใหม่` btn (re-request) |
| off (available) | `.btn`, --mut icon 🎙️ | เปิดไมค์ | click requests getUserMedia; button shows `aria-busy` + "กำลังขอสิทธิ์ไมค์…" until resolved |
| on (idle) | `.btn.on` gradient, --good dot | ไมค์เปิดอยู่ · กดเพื่อปิด | click turns off, stops tracks |
| speaking | on + pulsing --good ring (2 concentric, 1.2s, motion-reduced: static ring) | กำลังพูด | derived from local level meter, only if permitted and not self-muted |
| game-muted (generic) | `.btn` disabled-look, 🎙️ with pause bar, --mut | ตอนนี้ยังพูดไม่ได้ | no tooltip of cause; permitted again -> returns to prior on/off state automatically (mic stays granted) |

Hints use existing `.hint` (aria-live polite), max one visible. Unavailable states never open an error dialog, never throw to the console loop.

Silenced private note (only to that player): the existing silence texts gain a sentence.
- chat placeholder: `🤐 ถูกปิดปาก — ส่งได้แค่อีโมจิ และพูดทางไมค์ไม่ได้`
- vote card: `🤐 คุณถูก NDA Silence — โหวตไม่ได้ และพูดทางไมค์ไม่ได้ในรอบนี้`
The voice button itself still shows the generic game-muted state.

Mute toggle (AC-17): `.btn.vm`, visible only when voice is on (hidden when off/unavailable; space reserved to avoid layout jump). Labels: `ปิดเสียงตัวเอง` (mic live) / `เปิดเสียงตัวเอง` (self-muted, --bad outline, 🔇). `aria-pressed` reflects self-muted. Self-mute is local courtesy: stops sending audio, keeps connection. Self-muted wins over speaking ring. Keyboard: Tab order button -> mute -> chat; Space/Enter toggle; focus-visible ring 2px --light.

## Screen 2: Player list speaking indicator (AC-3, 19) in `.pl` rows
Add `<span class="vi" aria-hidden="true">` inside `.pl` after `.nm`, right-aligned: three equalizer bars (--good), animate only when `data-speaking="1"`; otherwise element is present but `visibility:hidden` (no layout shift, no tell). `.av` also gets a 2px --good ring while speaking. Row gets `aria-label` suffix ` กำลังพูด` via a visually-hidden `.sr` span with aria-live=off (not announced per-speaker to avoid chatter). Reduced motion: bars static at full height, no animation.
States: not speaking (hidden) | speaking (bars + ring) | self row speaking (same; only if permitted) | offline row (`.off`, never shows indicator) | dead player (never shows indicator, same as muted: absent). Speaking holds ~300ms after last audio to avoid flicker; hides at once on permit loss (AC-10 within 1s). No indicator when the receiver has locally ignored that audio.
Lobby `.lb-row` does not show it (voice is not open in lobby).

## Screen 3: Mod3D sound overlay (AC-18) in mod3d.html
Full-screen overlay `#soundGate`, z above scene, 70% --bg scrim, centered card (.panel style, border --line, radius .8rem):
- 🔊 (3rem), title "คลิกเพื่อเปิดเสียง" (1.5rem 800 --light), sub "เบราว์เซอร์ต้องการให้คลิกก่อน จึงจะได้ยินเสียงผู้เล่น" (--mut), primary `.btn.on` "เปิดเสียง".
- Whole overlay clickable, also Enter/Space on the focused button (autofocus). Click resumes AudioContext, then fades out 200ms and is removed; stays removed unless context is later suspended (then it reappears).
- States: waiting (shown) | enabling (button disabled "กำลังเปิดเสียง…") | enabled (gone; small `#soundBadge` 🔊 top-right corner, 60% opacity, click toggles TV mute) | failed (stays, hint "เปิดเสียงไม่สำเร็จ — คลิกอีกครั้ง").
- Overlay must not block game state; it is visual only, scene keeps rendering behind it. Reduced motion: no fade.
- Players who speak before unlock: no sound, no queue replay; overlay stays visible until click.

## Screen 4: Mod3D desk speaking indicator (AC-2, 19)
Per desk, a billboard sprite above the desk nameplate (not on the player model, so desk movement carries it): a ring of 3 sound-wave arcs, --good (#5fe39a) on dark, 1.6rem equivalent size, emissive so it reads on the TV from distance.
- Speaking: arcs pulse outward (scale 1 -> 1.25, opacity .9 -> .3, 0.9s loop), plus the nameplate gets a --good underline.
- Not speaking / muted / dead / absent: sprite not rendered at all (no "muted" icon, ever).
- Hidden instantly on permit loss; 300ms hold after audio stops otherwise.
- Follows desk position per frame (same transform as the audio panner, AC-2), so visuals and sound stay colocated.
- Reduced-motion (prefers-reduced-motion): static arcs, no pulse.
- Contrast: --good against nameplate/dark desk >= 4.5:1; never colour-only, shape (arcs) carries the meaning. Many simultaneous speakers: up to 12 indicators, each independent; no cap needed.

## Component specs
- `.voicebar{display:flex;gap:.5rem;align-items:center;margin:.4rem 0}`; buttons min-height 44px.
- `.vc[data-vs]` state classes: `un`, `off`, `on`, `spk`, `gm`. `.vm[aria-pressed=true]` = self-muted.
- `.pl .vi` 1.2rem equalizer; `@keyframes eq` 3 bars staggered .15s; `@media (prefers-reduced-motion:reduce)` no animation.
- Tokens only from existing :root; no new colours.
- Mod3D `#soundGate`, `#soundBadge`, desk `speakSprite` (three.js Sprite or CSS2D, FE choice).

## Cross-screen states matrix
| Condition | Own button | Others' list/desk | Private note |
|---|---|---|---|
| permitted + speaking | spk | indicator | - |
| permitted, silent | on | none | - |
| self-muted | on + 🔇 | none | - |
| NIGHT/VOTE/EVENT/paused/dead/burnout | gm (generic) | none | - |
| NDA-silenced | gm (generic) | none | extra sentence in silence notice only |
| insecure/no mic/denied | un (+hint) | none | - |

## Decisions
See hand-off JSON.

Canvas: https://claude.ai/artifact/6Si4UJcQbKa4GDq44pkb6v

## AC id -> artboard
| AC | Artboard |
|---|---|
| AC-1 | Screen 1: player voice control |
| AC-2 | Screen 4: Mod3D desk indicator |
| AC-3 | Screen 2: player list speaking indicator |
| AC-4 | n/a no UI (server/ops/docs) |
| AC-5 | n/a no UI (server); generic game-muted state, cross-screen matrix |
| AC-6 | n/a no UI (server); generic game-muted state, cross-screen matrix |
| AC-7 | n/a no UI (server); generic game-muted state, cross-screen matrix |
| AC-8 | n/a no UI (server); generic game-muted state, cross-screen matrix |
| AC-9 | n/a no UI (server); generic game-muted state, cross-screen matrix |
| AC-10 | n/a no UI (server); generic game-muted state, cross-screen matrix |
| AC-11 | n/a no UI (server); generic game-muted state, cross-screen matrix |
| AC-12 | n/a no UI (server/ops/docs) |
| AC-13 | Screen 1: unavailable states |
| AC-14 | n/a no UI (server); generic game-muted state, cross-screen matrix |
| AC-15 | n/a no UI (server); generic game-muted state, cross-screen matrix |
| AC-16 | n/a no UI (server/ops/docs) |
| AC-17 | Screen 1: mute toggle |
| AC-18 | Screen 3: Mod3D sound overlay |
| AC-19 | Screens 2 and 4: speaking indicators |
| AC-20 | n/a no UI (server/ops/docs) |
| AC-21 | n/a no UI (server/ops/docs) |
| AC-22 | n/a no UI (server/ops/docs) |
