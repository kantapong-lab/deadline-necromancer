# Plan: voice-over
ADR: docs/adr/0003-voice-mesh-webrtc.md. Brief: .team/voice-over/brief.md. AC: .team/voice-over/ac.md.

## Phase 1 (P0): gated mesh voice MVP
Goal: players talk, Mod3D and players hear, mute enforced server-side. value high / cost M / risk M (mobile mic, mesh).
Tasks:
1. canSpeak in engine beside chat.js + tests [AC-4]
2. HTTPS option in server/index.js + feature-detect fallback [AC-12, 13]
3. server/handlers/voice.js: guarded relay, pid addressing, hardening [AC-5, 16]
4. permit recompute on pushState, private permit, teardown on flip, pause, disconnect [AC-6-11, 14]
5. player client: mic, mesh, receive/drop [AC-1, 3, 10]
6. Mod3D: recvonly + PannerNode on desk group + reconnect [AC-2, 15]
Depends: none. Exit: all P0 AC pass; unit tests for canSpeak and relay refusal; no-leak payload test.

## Phase 2 (P1): usability
value med / cost S / risk low. Tasks: own mute button [AC-17], Mod3D sound overlay [AC-18], speaking indicator [AC-19], ICE config [AC-20]. Depends: Phase 1. Exit: P1 AC pass.

## Phase 3 (P2): ops and docs
value low-med / cost S / risk low. Cert script, README (HTTPS, tunnel, residual risk), 12-player check [AC-21, 22]. Depends: Phase 1.
