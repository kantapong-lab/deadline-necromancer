# Checkpoint: voice-over
Updated: step 6 · round 1

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
canvas: https://claude.ai/artifact/6Si4UJcQbKa4GDq44pkb6v
base: main
scope confirmed: mic + WebRTC P2P voice (signalling via Socket.IO), Mod3D spatial playback + speaking indicator, server-enforced mute (burnout/silence/voted-out), phases MORNING+VOTE_INTERIM. Out: recording, dark night voice, PTT settings, TURN hosting.
next: 4 · frontend-dev ∥ backend-dev · build
gate 2b passed · user: "Approve (Recommended)" · 2026-11-18
gate 3c passed · user: "Approve (Recommended)" · 2026-11-18

## Decisions in force
none yet

## Loop counters
6:code-reviewer 1/3

## Open blockers
- B-1 · app/src/server/handlers/voice.js:66 · BE · rounds open 1
- B-2 · app/test/voice.js:1 · BE · rounds open 1
- B-3 · app/public/voice.js:1 · FE · rounds open 1
- V-1 · - · FE · rounds open 1
- V-2 · - · BE · rounds open 1

## History
- step 1 r1: L1 brief: mesh WebRTC, HTTPS needed, NDA leak risk [1-r1]
- step 6 r1: Reject: comment-only B-1..B-3 [6-r1]

[1-r1]: rounds/1-r1.md
[6-r1]: rounds/6-r1.md
