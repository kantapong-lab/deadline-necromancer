# Design: change-chat-quick-replies

Canvas URL: none, local file canvas/chatbar-mockup.html (artifact publish denied; user approved from browser pane 2026-11-16)
Design system: none in repo (`docs/design-system/` absent). Scope is a change to an existing screen: reuse `app/public/style.css` tokens and classes (`--panel`, `--panel2`, `--line`, `--mut`, `--bad`, `--light`, `.btn`, `.btn.primary`, `.btn.emo`, `.chips`, `.chip`, `.hint`). No intake, no new tokens.
Screen map: none needed (one bar on one existing screen).
Platform: web, mobile-first (375px).

## Persona and journey
Player in a phone browser, in the morning meeting, wants to needle others fast (Among-Us-style) without typing Thai on a small keyboard.
Journey: read feed -> tap a quick line (1 tap) or type + press ส่ง/Enter -> see line in feed.
Drop-off risks, each with a designed state: (1) 23 chips bury the input -> collapsed panel (S1); (2) cannot tell why buttons are dead -> note inside panel + chip/placeholder (S3, S5); (3) typed text lost on error -> kept (S6); (4) tap eats quota unexpectedly -> hint under toggle (S4).

## Before / after
Before: one row = input + 3 emoji, no send button (Enter only). After: row 1 = input + **ส่ง**; row 2 = emoji; row 3 = toggle **💬 ข้อความด่วน (23)**; row 4 = panel (when open).

## Decisions
- **Collapsible toggle panel, closed by default** (not a horizontal scroll strip). A strip hides 20 of 23 phrases behind a hidden gesture (TOUCH-5, poor discoverability); phrases are 12-29 chars, so a strip would show about 2 at a time. The panel shows ~8 wrapped pills in a 176px vertical-scroll box: no horizontal scroll at 375px (LAYOUT-2), input and send always visible above it.
- Panel stays open after a tap (players fire several lines) and its open state survives `render()` (client var, like `chatDraft`). The Orchestrator/FE may default to closed on each new morning.
- Panel sits BELOW the input/emoji so opening it never moves the input.
- Send button: `.btn.primary`, label "ส่ง", `type="submit"` in the same form so Enter and click share `sendChat`. Right of the input on row 1 (input `flex:1 1 0; min-width:0`). Replaces the mobile `.chatbar input{flex:1 1 100%}` rule so send fits next to it.
- Quick-reply pills: `.btn.qr` (new modifier: `background:var(--panel); font-size:14px; border-radius:99px; padding:8px 12px`), min-height 44px (existing mobile `.btn`), gap 8px (TOUCH-1/2).
- Toggle is NOT disabled in S3/S5 (so the player sees why); only the pills are.
- Quick reply never touches `#chatIn` or `chatDraft` (AC-6).

## New CSS (FE spec, tokens only)
```
.qr-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:8px}
.qr-panel{margin-top:6px;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--panel2);max-height:176px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:8px}
.qr-note{flex:1 1 100%;margin:0}
.btn.qr{background:var(--panel);border-radius:99px;font-size:14px;padding:8px 12px}
@media(max-width:..existing mobile query){.chatbar input{flex:1 1 0;min-width:0}}
```
Disabled uses existing `.btn:disabled` (opacity .35).

## Final copy
Toggle: `💬 ข้อความด่วน (23)` with `▾` closed / `▴` open. Send: `ส่ง` (aria-label `ส่งข้อความ`). Pills: the 23 phrases from ac.md, in table order. Notes in panel when pills are disabled: Silence = `🤐 ถูกปิดปาก — ข้อความด่วนใช้ไม่ได้ ส่งได้แค่อีโมจิ`; quota 0 = `โควตาหมดแล้ว — ข้อความด่วนใช้ไม่ได้ ส่งได้แค่อีโมจิ`. Purge hint under toggle (quota left, panel closed or open): `กดข้อความด่วน = นับ 1 ข้อความ (ทุกข้อความ ≤ 30 ตัวอักษร)`. Existing chips, placeholders, errors unchanged.

## States (artboards in `canvas/chatbar-mockup.html`)
| Artboard | State | Input | ส่ง | Pills | Emoji |
|---|---|---|---|---|---|
| S1 | normal, panel closed | on | on | hidden (closed) | on |
| S2 | normal, panel open, draft "abc" | on, kept | on | on, 23 | on |
| S3 | NDA Silence | disabled | disabled | disabled + note | on |
| S4 | Purge, quota 2/3 | on (max 30) | on | on (all <= 30) + hint | on |
| S5 | Purge, quota 0 | disabled | disabled | disabled + note | on |
| S6 | send rejected | keeps text | on | n/a | on, error in `#chatErr` |
| S7 | dead / other phase | whole bar hidden | | | |
Pill with chatCount > 30 under Purge (AC-10, future-proof): same disabled style, no note.

## AC id -> artboard
| AC | Artboard / spec |
|---|---|
| AC-1 | S2 (input clears after send; spec: `render()` must not restore old value) |
| AC-2 | S6 |
| AC-3 | S1/S2 (button in same form as input) |
| AC-4 | S3, S5 (send disabled with input); empty send: enabled, server error shows in `#chatErr` |
| AC-5 | S2 (23 pills, table order); S7 hidden |
| AC-6 | S2 (draft "abc" untouched) |
| AC-7 | S4 (chip counts down, hint) |
| AC-8 | S5 |
| AC-9 | S3 |
| AC-10 | S4 + disabled-pill rule |
| AC-11 | logic only, no visual (typed path, D-3) |
| AC-12 | logic only, no visual |
| AC-14 | logic only, no visual (shared data.js list) |
| AC-13 | S1/S2 at 375px: no horizontal scroll, panel scrolls vertically |

## Interaction
Pill tap: sends at once, focus stays on pill (keyboard: Tab, Enter/Space). Toggle: `aria-expanded`, `aria-controls`; Enter/Space. Input and send: tab order input, ส่ง, emoji, toggle, pills. Disabled pills use `disabled` (not focusable); the note has `role="status"`. Error `#chatErr` gets `role="alert"`. No new animation (reduced motion n/a).

## A11y
Targets >= 44px, gaps 8px/6px. Focus ring `outline:2px solid var(--light)` (add if absent). Text colors reuse existing pairs (`--txt` on `--panel`/`--panel2`, ~12:1). Disabled opacity is exempt. Input font-size 16px (no iOS zoom).

## Deviations (record, MEDIUM/LOW)
- STYLE-3 (no emoji icons): toggle uses 💬 and the app uses emoji everywhere (emoji chips, ✂️); no icon family exists. Kept to match the app and the Orchestrator's label.
- Dark mode only (app is dark-only); landscape not separately checked.
- No `docs/design-system/` to update; no Changelog entry. `.qr-*` classes live in style.css.

## Data the UI needs
Phrase list from one shared module (AC-14); `me().silenced`, `me().chatLeft`, `S.chatLimit` as today. Phrase tap sends the exact phrase string as a quick-reply (server validates, AC-11).

## Quality checks
Not blocking: canvas URL pending (3b/3c). The `.dc.html`/`canvas.json` format check is not met: the Orchestrator asked for a self-contained HTML mockup, so none exists. All else: pass. Contrast, 44px target, 375px no horizontal scroll, final copy, states per AC: pass.
