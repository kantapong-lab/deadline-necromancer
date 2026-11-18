# Socket events: voice (no REST endpoints; static files only)

All events ride the existing Socket.IO connection. Server handler: `app/src/server/handlers/voice.js`. Every handler uses `data || {}`-style guards and never throws. Payload schemas, caps and numbers: [schemas.md](../schemas.md). Server logic: [server.md](../server.md).

Topology rule: **the speaker is always the offerer** and the receiver (player or Mod3D) always the answerer, so there is no glare. One RTCPeerConnection is one-way (speaker -> receiver). It exists only while the speaker is permitted and has voice on.

## Client -> server
### `voice:on` {on: boolean}, ack
Registers (`on:true`) or unregisters (`on:false`) THIS socket as the voice socket of its seat (player) or of the 3D screen (full socket). Idempotent for the same socket (no new `gen`). Client calls it: after tapping the voice button (player) / the sound overlay (Mod3D); again after every socket reconnect once `player:join` (token) / `mod:join` acked ok; again when `state.youId` changes (new game).
Ack, player: `{ok:true, iceServers:[...], permit:boolean, gen:number, peers:[{to,gen}]}`. Ack, 3D screen: `{ok:true, iceServers:[...], gen:number}`.
Errors (ack `{ok:false, error}`, HTTP-style: n/a): `ยังไม่ได้เริ่มเกม` (player, no game / `pid == null`), `ไม่ใช่หน้าจอ 3D` (mod socket not in `fullSockets`), `ไม่ได้อยู่ในห้อง` (`ctx()` empty). `permit` is the caller's own live `canSpeak`: private, in the caller's ack only.

### `v:sig` (no ack; silent drop on any refusal)
`{to: pid|'mod', kind: 'offer'|'answer'|'ice', sdp?: string, cand?: {candidate, sdpMid, sdpMLineIndex, usernameFragment}|null}`. `offer`/`answer` carry `sdp`; `ice` carries `cand` (`null` = end of candidates). Never a socket id. Validation + relay gate: [server.md](../server.md) section Relay.

## Server -> client
### `v:sig` (relay)
`{from: pid|'mod', kind, sdp?|cand?}`: freshly built from whitelisted fields, `from` stamped by the server. Sent only to the target's registered voice socket, only within `socket.data.code`'s room.

### `voice:permit` {permit: boolean} (PRIVATE)
Sent only to the sockets of the pid whose `canSpeak` flipped (both directions). Never to anyone else, never broadcast. Also in the `voice:on` ack (initial value). The client opens outbound connections on `true`, tears them all down on `false`.

### `voice:peers` {peers: [{to: pid|'mod', gen: number}]}
Registered receivers a speaker should offer to: every other registered player (any alive state) and `'mod'` if a 3D screen is registered. Sorted: pids ascending, `'mod'` last; the recipient's own pid is omitted. `gen` bumps whenever that endpoint (re)registers, so a speaker re-offers when the gen differs from its open connection. Sent to registered player sockets when the list changes (also on disconnect, unregister, game reset). Derived only from registration, never from `canSpeak`/silenced.

### `voice:drop` {pid: number}
Receivers (registered player sockets except `pid`'s own, plus the registered 3D socket) must close their inbound connection from `pid` and stop its audio and indicator, within 1 s (AC-10). Sent when `pid`'s PUBLIC speak flag turns false (dead, phase left MORNING/VOTE_INTERIM, paused, game ended/reset), when `pid` unregisters, or disconnects. Never carries a reason. Silence-only flips emit nothing (cannot happen mid-phase; see server.md).

## Handshake sequence (numbered)
1. Player taps voice: `getUserMedia` OK -> `voice:on {on:true}` -> ack `{iceServers, permit, peers}`.
2. Mod3D click-to-enable -> `voice:on {on:true}` -> all registered speakers get `voice:peers` containing `{to:'mod', gen}`.
3. Permitted speaker S with mic on, for each peer R without a matching open connection: `new RTCPeerConnection({iceServers})`, add mic track, `v:sig {to:R, kind:'offer', sdp}`.
4. Server: rate limit, validate, `canSpeak(S)` live, record link `S>R`, relay `{from:S, kind:'offer'}` to R.
5. R: new recvonly connection, `v:sig {to:S, kind:'answer'}`; both sides trickle `kind:'ice'`; server relays when link `S>R` exists (S's ICE also needs `canSpeak(S)`).
6. R `ontrack`: attach stream (players: hidden `<audio>`; Mod3D: muted `<audio>` + `MediaStreamSource -> PannerNode`).
7. Any `pushState`: server re-evaluates; flip true->false of S: `voice:permit {false}` to S, links `S>*` deleted, `voice:drop {S}` to receivers. S closes outbound, receivers close inbound. Flip false->true (MORNING): `voice:permit {true}` to S only; S re-runs step 3 (receivers hear nothing about it until audio arrives).
8. Reconnect (player token / Mod3D `mod:join`): new socket -> step 1/2 again; the old socket's disconnect emits `voice:drop` + `voice:peers`.
