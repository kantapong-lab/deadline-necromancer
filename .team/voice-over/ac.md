# AC: voice-over (in-game WebRTC voice)
Baseline red; code is truth. [assumed] = PM default, not user-confirmed.

## Stories
- US-1 As a player, I talk by mic during MORNING / VOTE_INTERIM so the table hears me.
- US-2 As Mod3D (TV), I hear each player positioned at their seat.
- US-3 As a player, I hear other permitted speakers.
- US-4 As the game, I mute NDA-Silenced, Burnout, and dead players server-side, in every other phase, and while paused.
- US-5 As an NDA-Silenced player, I must not be exposed to others by voice signals.
- US-6 As a player on plain HTTP or with no mic, I still play, with a clear hint.

## Rule (single source) canSpeak(pid) = alive && phase in {MORNING, VOTE_INTERIM} && !silenced && !paused

## AC (Given/When/Then, one line each)
- AC-1 (P0) Given permitted player with mic granted, When they tap voice, Then mic captured (echoCancellation, noiseSuppression, AGC) and audio is offered to peers and Mod3D.
- AC-2 (P0) Given a permitted player speaking, When Mod3D is open and sound enabled, Then Mod3D plays that voice panned to the player's desk and it follows the desk when the desk moves.
- AC-3 (P0) Given a permitted speaker, When another player has voice on, Then that player hears them.
- AC-4 (P0) canSpeak is a pure engine fn beside chat.js; unit tests cover each term (alive, phase, silenced, paused) true and false.
- AC-5 (P0) Given NDA-Silenced alive player in MORNING, When they try to send offer/ICE, Then server refuses to relay; no peer or Mod3D receives their audio.
- AC-6 (P0) Given night-Burnout victim, Then muted same as AC-5 from the moment alive=false.
- AC-7 (P0) Given a voted-out (dead) player, Then muted same as AC-5.
- AC-8 (P0) Given phase NIGHT, VOTE, EVENT or any non-listed phase, Then every player is muted and outbound voice connections are torn down; they reopen only on MORNING / VOTE_INTERIM.
- AC-9 (P0) Given game paused, Then all voice muted; on resume only permitted players speak again.
- AC-10 (P0) Given a canSpeak true-to-false flip, Then server stops relaying that pid's signalling and receivers (players and Mod3D) drop that peer's audio within 1 s; a muted listener may still hear.
- AC-11 (P0) Given NDA-Silence, Then no event or payload to other players or Mod3D carries a per-pid silenced/mute reason: permit goes only to that player; broadcast is limited to what views.js already shows publicly (alive flag). Test asserts payload to others is identical silenced vs not.
- AC-12 (P0) Given server started with HTTPS_KEY/HTTPS_CERT, Then it serves https/wss and startup log prints the https URL; without them it serves plain HTTP and existing flows and tests are unchanged.
- AC-13 (P0) Given insecure context (navigator.mediaDevices undefined), mic denied, or no device, Then voice button is hidden or disabled with a Thai hint ("ต้องใช้ HTTPS" / permission / no mic), the game stays fully playable, and no exception reaches the console loop.
- AC-14 (P0) Given a player reconnects by token or has several sockets, Then voice keys on pid, the handshake reruns after state, and a disconnect closes that pid's voice.
- AC-15 (P0) Given Mod3D (fullSockets) reconnects, Then it re-handshakes with all permitted speakers.
- AC-16 (P0) Signalling hardening: relay only within socket.data.code room; client sends {to: pid|'mod'}, server stamps from=pid; 'mod' resolves only to fullSockets; null/garbage/oversized payload is ignored without throwing; rate limit per socket.
- AC-17 (P1) Given a player, Then a mute/unmute button for their own mic exists (courtesy; server gate is authoritative).
- AC-18 (P1) Given Mod3D loads, Then a "click to enable sound" overlay unlocks AudioContext before any voice plays.
- AC-19 (P1) Given a speaker is active, Then a speaking indicator shows (player UI and Mod3D) and only for currently permitted speakers.
- AC-20 (P1) Given VOICE_ICE_SERVERS env, Then clients receive it; default is no STUN on LAN [assumed].
- AC-21 (P2) Script generates a self-signed cert for the LAN IP; README documents HTTPS setup, tunnel alternative, and the mesh mute residual risk.
- AC-22 (P2) Given 12 players, Then voice works with outbound connections only while permitted (mesh cap ~12 documented).

## Traceability
| Story | AC |
|---|---|
| US-1 | 1, 17 |
| US-2 | 2, 18, 19 |
| US-3 | 3 |
| US-4 | 4-10, 14-16 |
| US-5 | 11 |
| US-6 | 12, 13, 20, 21 |

## Assumptions / accepted risks
- [assumed] Silenced-alive hears-as-silence tell is accepted (no noise parity).
- [assumed] Co-located echo: voice is for remote play; players near the TV use the AC-17 mute. No echo handling beyond getUserMedia constraints.
- [assumed] Self-signed HTTPS accepted; tunnel is a documented alternative.
- [assumed] Mesh mute is gate + receiver drop + teardown; a hostile modified client is accepted residual risk.

## Out of scope
Recording, dark-faction night voice, push-to-talk settings beyond a mute button, TURN hosting, SFU, text-chat changes.
