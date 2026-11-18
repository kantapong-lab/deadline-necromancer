# 0003. In-game voice: mesh WebRTC with server-gated signalling

Status: Proposed
Kind: product
Date: 2026-11-18

## Context
Players need voice in MORNING and VOTE_INTERIM; Mod3D must hear each seat. Mute must be server-enforced for NDA-Silence, Burnout, dead. NDA-Silence is secret (views.js). Phones need a secure context for the mic.

## Decision
- Mesh P2P WebRTC, signalling over existing Socket.IO, zero new deps; Mod3D is recvonly.
- canSpeak(pid) = alive && MORNING|VOTE_INTERIM && !silenced && !paused; silenced means fully muted.
- Enforcement: server refuses relay from non-permitted pids; outbound connections exist only while permitted; receivers drop on flip. Residual risk (hostile client) accepted and documented.
- Permit sent privately; no per-pid mute broadcast (no NDA-Silence leak). Silent-alive tell accepted [assumed].
- HTTPS via optional cert env (self-signed); plain HTTP keeps working with voice hidden.

## Consequences
- New handler, engine fn, HTTPS option; no-leak and gate tests needed.
- Mesh caps near 12-15 players; no TURN, so cross-NAT play can fail.

## Alternatives considered
- SFU: true media mute but heavy dependency.
- Opus relay over Socket.IO: hard mute but latency and server load; fallback if hard enforcement becomes mandatory.
- Broadcast mute events: leaks NDA-Silence.
