# Requirements (user answers, Orchestrator-written)
Request: add voice over — player can talk by voice; moderator 3D can hear players' voice; if player is burnout or silenced they cannot talk.
- Audience: Mod3D screen AND all other players hear a speaker (peer-to-peer WebRTC; Mod3D plays each voice positioned at that player's seat).
- When: same as chat — MORNING and VOTE_INTERIM only. Muted at NIGHT / VOTE / EVENT phases. No dark-faction night voice (night chat stays text).
- Muted (server-enforced): NDA-Silenced players (alive, that day), night-Burnout victims, and voted-out players (all dead players).
- Out of scope: recording, dark-faction night voice, push-to-talk settings beyond a mute button, TURN server hosting.
- Existing: Node + Socket.IO game in app/ (engine/chat.js enforces chat rule: p.alive, phase MORNING|VOTE_INTERIM, p.silenced emoji-only). Mod3D = app/public/mod3d.html + mod3d/director.js.
- Baseline red: user chose continue anyway (code is the only truth).
