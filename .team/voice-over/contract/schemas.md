# Schemas, state shape, numbers

No database, no migrations (rooms are in-memory `Map`, ADR 0001). No new engine state and no new fields in any `state` view.

## Engine (BE) `app/src/engine/chat.js`
Added to the exported object (mixed into `Game`; the mixin throws on a duplicate name, grep shows none today):
```
canSpeak(pid, opts)  // -> boolean, pure, no mutation, no RNG
  const p = this.P(pid);
  !!p && p.alive && (this.phase === 'MORNING' || this.phase === 'VOTE_INTERIM') && !this.paused && (opts?.publicOnly || !p.silenced)
```
`canSpeak(pid)` is the rule from `ac.md` (single source). `canSpeak(pid, {publicOnly:true})` ignores ONLY the silenced term; it is the "public speak flag" that receiver-facing events use (alive, phase, paused are all in `common()`/`pubPlayers` already). Bad/unknown pid -> `false`. `OVER`, `LOBBY`, `NIGHT`, `VOTE`, `VOTE_RESULT`, EVENT phases -> `false`.

## Server state (BE), all lazily created, never serialised into a view
- member: `m.voice = null | { sock: string, gen: number, pid: number|null, can: boolean, pub: boolean }`. `sock` = the one registered voice socket (must be in `m.sockets`); `pid`/`can`/`pub` = cache from the last sync (`pid` cached so a seat reshuffle on new game is treated as the old pid's public flag turning false).
- room: `room.voice = { gen: number, mod: null | {sock: string, gen: number}, links: Set<string>, peersKey: string, game: Game|null }`, created (lazily, at the first `voice:on`) with `game` set to the CURRENT `r.game` (never left null/undefined, else the first sync would wipe live links). `links` entries are `"<fromPid>><to>"` where `to` is a pid or `'mod'` (offer was relayed). `room.voice.gen` is the room-wide counter; each registration takes `++gen`.
- socket closure (per `registerVoice(socket, deps)` call): rate bucket `{start:number, n:number}`.

## Payload validation (`v:sig`), applied before any lookup
| Field | Rule |
|---|---|
| data | plain object (not null/array), else ignore |
| `to` | integer `0 <= to < MAX_PLAYERS` (12) or the string `'mod'`; else ignore |
| `kind` | exactly `'offer'`, `'answer'` or `'ice'` |
| `sdp` (offer/answer) | string, `1 <= length <= 10000`; absent/other type -> ignore |
| `cand` (ice) | `null`, or object with `candidate` string `<= 512`, `sdpMid` string `<= 64` or null, `sdpMLineIndex` integer `0..64` or null, `usernameFragment` string `<= 64` or absent; else ignore |
| extra fields | dropped; the relayed object is rebuilt from the whitelist (`{from, kind, sdp}` or `{from, kind, cand}`), never the client object |
Rate limit: per socket, fixed window 1000 ms, max **600** `v:sig` (an ICE burst from one speaker opening 12 connections is about 100-120); the 601st+ in the window are dropped silently. `voice:on`: same bucket type, max 20 per window. Constants live at the top of `voice.js` so tests can read them. Socket.IO `maxHttpBufferSize` stays default; field caps above bound work per message.

## Relay link rules (server-side truth; client fields are never trusted)
- `offer` S->R: sender is a player pid, `g.canSpeak(S)` live, R registered and connected. Records link `S>R`.
- `answer` R->S: link `S>R` must exist.
- `ice` X->Y: allowed if (link `X>Y` exists AND `g.canSpeak(X)` live; X is then a pid, `'mod'` never offers) OR link `Y>X` exists (X is the answerer: not gated, a muted listener may still hear).
- Links are deleted: when the speaker's public flag turns false or `can` is false at sync; when either end unregisters, disconnects, or re-registers (`gen` bump); on game replaced/reset.

## Env parsing result
`iceServers`: array of `{urls: string|string[], username?: string, credential?: string}`, max 8, computed once in `voice.js` at module load, same object returned in every `voice:on` ack.

## AC-11 invariant (what "identical" means)
Every event delivered to a non-owner socket (other players, the full 3D socket), except `v:sig` itself, is a pure function of: registration set, `gen`s, `alive`, `phase`, `paused` (public fields). `silenced` is read only by `canSpeak(pid)` for (a) the owner's `voice:permit`/ack and (b) the `v:sig` gate. Test: [tests.md](../tests.md).
