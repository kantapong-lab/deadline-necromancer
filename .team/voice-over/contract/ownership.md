# File ownership (one owner per row; no overlaps)

| Path | Owner | Change |
|---|---|---|
| `app/public/**` | FE | new `voice.js`, new `mod3d/voice.js`, edit `index.html` (button, mute, hint, indicator, script tag), edit `mod3d.html` (overlay, import, deskPos, indicator, rehandshake). Must NOT edit `common.js`, `mod.html`, `gallery.html`, `card-info.js` (http-parity hashes) |
| `app/src/**` | BE | `engine/chat.js` (`canSpeak`), new `server/handlers/voice.js`, `server/rooms.js` (call `syncVoice`), `server/index.js` (HTTPS, register voice). Nothing else under `app/src` (no `http.js`, `session.js`, `views.js`, `mod-view.js` changes) |
| `app/test/**` | BE | new `test/voice.js`, new `test/fixtures/voice-test.key` + `voice-test.crt` (test-only self-signed pair), re-record `test/http-parity.json` after FE's `index.html` merges |
| `app/tools/**` | BE | new `tools/gen-cert.js` |
| `app/package.json` | BE | append `&& node test/voice.js` to `scripts.test`; no dependency changes |
| `app/README.md` | BE | Voice section (HTTPS, tunnel, `VOICE_ICE_SERVERS`, mesh cap and residual risk) |
| `.gitignore` | BE | add `app/.certs/` |
Untouched by FE and BE: `docs/adr/0003-voice-mesh-webrtc.md` (PM, product ADR), `docs/architecture/**` (no diagrams this task), `app/src/server/http.js`.

Shared-surface rules: the Socket.IO event names and payloads in [endpoints/voice.md](endpoints/voice.md) are the FE/BE interface; neither side changes them without the Architect. `app/public/mod3d/director.js` is FE-owned but not edited. BE and FE can build in parallel from the contract; the FE can develop against a stub that emits `voice:permit` / `voice:peers` / `v:sig`. Merge order: BE first (events exist), FE second, then BE re-records http-parity.
