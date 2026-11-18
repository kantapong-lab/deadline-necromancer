# Checkpoint: voice-over
Updated: step 1 · round 1

## Goal
add voice over

* player can talk voice over
* moderator 3d can hear players voice 
* if player burnout or silence cannot talk

## Run profile
lane: feature · skipped none

## Status
route: full flow · intake: 3 asked
baseline: red (user: continue anyway)
base: main
scope confirmed: mic + WebRTC P2P voice (signalling via Socket.IO), Mod3D spatial playback + speaking indicator, server-enforced mute (burnout/silence/voted-out), phases MORNING+VOTE_INTERIM. Out: recording, dark night voice, PTT settings, TURN hosting.
next: 1 · researcher · brief.md
gate 2b passed · user: "Approve (Recommended)" · 2026-11-18

## Decisions in force
none yet

## Loop counters
None.

## Open blockers
None.

## History
- step 1 r1: L1 brief: mesh WebRTC, HTTPS needed, NDA leak risk [1-r1]

[1-r1]: rounds/1-r1.md
