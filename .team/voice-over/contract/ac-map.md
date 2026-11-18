# AC -> contract map

| AC | Home | Owner | Test |
|---|---|---|---|
| AC-1 | [client.md](client.md) Capture, Outbound; [endpoints/voice.md](endpoints/voice.md) `voice:on`, `v:sig` | FE (+BE relay) | T4, manual |
| AC-2 | client.md Mod3D (PannerNode from `deskPos`, `update(camera)`) | FE | manual / e2e |
| AC-3 | client.md Inbound; endpoints handshake 3-6 | FE (+BE relay) | T4 |
| AC-4 | [schemas.md](schemas.md) `canSpeak` in `engine/chat.js` | BE | T1 |
| AC-5 | [server.md](server.md) Relay gate; schemas.md link rules | BE | T2 |
| AC-6 | server.md syncVoice; live `canSpeak` in relay | BE | T3 |
| AC-7 | same as 6 (`!p.alive`) | BE | T3 |
| AC-8 | server.md syncVoice (public flag false -> links deleted, drop); client.md `voice:permit {false}` closes all | BE + FE | T1, T5 |
| AC-9 | `canSpeak` `!paused`; syncVoice runs on the pause push | BE | T1, T5 |
| AC-10 | syncVoice drop <= same push; relay gate live; client.md `voice:drop` handling | BE + FE | T5 |
| AC-11 | schemas.md AC-11 invariant; permit private (endpoints); no new `state` field | BE | T6 |
| AC-12 | server.md HTTPS; stack.md env vars | BE | T10 |
| AC-13 | client.md Feature detect + Thai hints | FE | manual |
| AC-14 | server.md voice:on / Disconnect; client.md Reconnect; keyed on pid, `gen` | BE + FE | T7 |
| AC-15 | endpoints handshake 2 and 8; client.md `rehandshake()` | BE + FE | T4, T7 |
| AC-16 | schemas.md validation + rate limit; server.md Relay steps 1-4 | BE | T8 |
| AC-17 | client.md Mute button | FE | manual |
| AC-18 | client.md Click to enable sound | FE | manual |
| AC-19 | client.md Speaking indicator (player and Mod3D) | FE | manual |
| AC-20 | stack.md `VOICE_ICE_SERVERS`; `iceServers` in `voice:on` ack | BE (+FE uses it) | T9 |
| AC-21 | server.md Cert script and docs | BE | run script; README review |
| AC-22 | schemas.md links; server.md (outbound only while permitted); stack.md mesh cap | BE + FE | T11 |

Error/status codes: socket acks use `{ok:false, error:<Thai string>}` listed per event in endpoints/voice.md; `v:sig` has no error channel by design (no leak of refusal reason). Process exit code 1 only for the HTTPS misconfiguration at startup.
