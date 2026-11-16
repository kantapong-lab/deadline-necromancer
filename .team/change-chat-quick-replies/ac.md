# AC: change-chat-quick-replies (change lane, ui+logic)

Scope: player morning chat only (`chatBar()` in app/public/index.html, `chat()` in app/src/engine/chat.js). Phrase list = `## Quick-reply phrases` below (replaces brief.md's 10, round 2 user feedback: Among-Us-style needling; gate 2b user picked the 23 social-needling lines below). No docs/plan phase, no product ADR.

## Quick-reply phrases

23 phrases, user-approved at gate 2b, all chatCount <= 29: [ac/phrases.md](ac/phrases.md).

## Acceptance criteria

| ID | Pri | Observable result | How checked |
|---|---|---|---|
| AC-1 | P0 | Press Enter with text in `#chatIn`, send accepted: message appears in the feed and the input is empty afterwards (also after a state push arrives during the send; `render()` must not restore the old value). | UI test / manual: type, Enter, assert input value "" and draft cleared |
| AC-2 | P0 | Send rejected (over 30 under Purge, quota out, error): input keeps the text and the error shows in `#chatErr`, so the player can edit. | UI test: Purge, 31 chars, Enter, assert text kept + error shown |
| AC-3 | P0 | A visible send button in the chat bar submits the same way as Enter: same validation, same errors, input clears on success. | UI test: click send vs Enter, same feed + input result |
| AC-4 | P1 | Send button is disabled when the input is disabled (NDA Silence, quota out). Empty input send does nothing new (server still returns "ข้อความว่าง"). | UI test per state |
| AC-5 | P0 | A set of 23 quick-reply buttons (the Quick-reply phrases table, in table order) shows in the chat bar in MORNING / VOTE_INTERIM for an alive player; never shown in other phases or when dead (same rule as `chatBar()`). | UI test per phase/alive |
| AC-6 | P0 | Tapping a quick reply posts that exact phrase to the feed in one tap (no send step) and does not change the typed draft in `#chatIn`. | UI test: draft "abc", tap, feed has phrase, input still "abc" |
| AC-7 | P0 | A quick reply counts as 1 chat message: under Meeting Purge it uses 1 of the 3 quota (`chatLeft` drops by 1, chip updates); with no Purge it is unlimited like typed text. | engine test: `chatUsed` +1 under purge; 0 change otherwise |
| AC-8 | P0 | When quota is 0 under Purge, quick-reply buttons are disabled (emoji still work) and a tap is rejected with the quota error. | UI test + engine test |
| AC-9 | P0 | Player with `silenced` (NDA Silence): all quick-reply buttons are disabled (not selectable); emoji stay allowed as today. Server rejects a quick-reply text from a silenced player ("คุณถูก NDA Silence"). | UI test + engine test: silenced + phrase text rejected |
| AC-10 | P0 | Under Meeting Purge only phrases with `chatCount <= 30` are selectable; others render disabled. Today all 23 qualify (max 29), so all stay enabled. | unit test: for each phrase `chatCount <= PURGE_LEN`; UI test with a >30 phrase injected is disabled |
| AC-11 | P0 | Server accepts quick-reply text only if it is exactly one of the allowed phrases, and still applies the Purge 30-char/quota checks. Free text sent as a quick reply is not trusted as one. | engine test: phrase ok; altered phrase goes through the normal typed path |
| AC-12 | P1 | Skip phrase "ขอโหวต Skip รอบนี้" is chat only; it casts no vote, changes no Mana, adds no Skip penalty. | engine test: phrase leaves votes/mana unchanged |
| AC-13 | P1 | Quick-reply set (23 buttons) is usable on a mobile width without pushing the input off screen (scroll strip or collapsible panel, buttons tappable, input and send button stay visible). | manual at 375px |
| AC-14 | P1 | Phrase list has one source of truth shared by client render and server validation (no drifting copies). | code review |

## Traceability

| Brief must-not-miss | AC |
|---|---|
| Each tap = 1 chat message against quota; server must validate text is in the allowed list (do not trust client text) and still apply the 30-char Purge check. | AC-7, AC-8, AC-10, AC-11 |
| Hidden/disabled under NDA Silence and outside MORNING/VOTE_INTERIM or when dead. | AC-5, AC-9 |
| Skip button text should not imply the vote is cast (chat only). | AC-12 |

## Unchanged

- Emoji buttons (`QUICK_EMO`) and their rules: allowed under NDA Silence, exempt from Purge quota.
- Dark faction night chat (`darkSay`, dark tab) untouched.
- Chat only in MORNING / VOTE_INTERIM and for alive players; 200-char slice; Purge 3 msgs / 30 chars and its messages and chip text.
- Feed format and order; moderator view; vote, Mana, Skip penalty, and every other rule.
- No role self-claim phrases (brief decision).
