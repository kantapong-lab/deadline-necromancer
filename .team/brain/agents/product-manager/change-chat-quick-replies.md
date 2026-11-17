# PM note: change-chat-quick-replies
- ac.md written, 14 AC (9 P0, 5 P1) + Unchanged.
- Silenced players: quick replies disabled, emoji kept (matches server rule in chat.js:11).
- Quick reply = 1 message under Purge; server validates phrase against allowed list.
- Known cause of Enter bug (render restores focused input value) recorded in AC-1 only.
- R2: user wanted Among-Us-style needling; phrase list now inline in ac.md (12, max chatCount 21).
