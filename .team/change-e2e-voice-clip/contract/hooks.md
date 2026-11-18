# Page hooks: `app/tools/e2e-voice-hooks.js`

Exports `voiceHook(opts)` (a self-contained function: no closure variables, serialized by Playwright `ctx.addInitScript(voiceHook, opts)`) and `HOOK_DEFAULTS`. Runs before any page script, so product code sees the wrapped globals. Guard `if (window.__dn) return`. Every hook body is try/catch; a caught error goes to `__dn.errors[]` (never `console.error`, never rethrown into the product).

`opts` = `{role:'player'|'mod', seat:int|null, rx:bool, recorder:bool, markers:'player'|'mod'|null, toneGain, toneBase, toneStep, fft, sampleRate, tickMs}` with defaults from the constants in timeline.md.

| Page | role | seat | rx | recorder | markers |
|---|---|---|---|---|---|
| P02..P12 | player | 1..11 | false | false | null |
| P01 | player | 0 | true | true | player |
| mod3d | mod | null | true | true | mod |

## 1. RTCPeerConnection wrapper (all pages)
`window.RTCPeerConnection = function(...a){const pc = new Orig(...a); register(pc); return pc;}` with `prototype = Orig.prototype` and `Object.setPrototypeOf(W, Orig)`. `__dn.pcs` keeps every pc ever created (never pruned). Direction is derived lazily: `out` = `pc.getSenders().some(s => s.track)`, else `in`.
`__dn.connected()` returns `{in, out, all}` = counts of pcs with `connectionState === 'connected'`.

## 2. Fake microphone (players)
`navigator.mediaDevices.getUserMedia` is replaced by an async function that ignores constraints and returns `dest.stream` of a per-page graph built once: `AudioContext({sampleRate})` -> `Oscillator(sine, toneBase + toneStep*seat)` -> `GainNode(0)` -> `MediaStreamAudioDestinationNode`. The context is resumed (autoplay flag makes this work without a gesture). Each call makes a fresh destination (the product's `stopMic` stops tracks), same osc/gain. The returned stream's `id` is pushed to `__dn.streamIds`.
- `__dn.tone(on)`: `gain.setValueAtTime(on ? toneGain : 0, now)`; appends `{t: Date.now(), on}` to `__dn.toneLog`. The track stays live and unmuted, so silence is a zero-amplitude signal, never an ended track.
- `__dn.seat`, `__dn.freq` set at init. Product call `Voice.toggle()` is unchanged; it gets this stream (`V.track.enabled` untouched).

## 3. Receive side (rx pages: mod3d, P01)
Own `AudioContext({sampleRate})` named `rctx`, independent of the product's context; resumed at init. Built once: `mix` Gain -> `mixAn` Analyser; `mix` -> `mixDest` MediaStreamDestination (recorder source); `mix` -> Gain(0) -> `rctx.destination` (keepalive so Chromium keeps pulling the graph).
In the wrapper, `pc.addEventListener('track', ev => ...)` (coexists with the product's `pc.ontrack`):
1. `stream = ev.streams[0] || new MediaStream([ev.track])`, `sid = stream.id`.
2. Hidden muted `<audio>` sink with `srcObject = stream`, `play()` (Chromium only feeds a remote stream into WebAudio while it is attached to a media element; the product also does this, the extra sink is a safety net).
3. `src = rctx.createMediaStreamSource(stream)`; `an = Analyser(fftSize = fft, smoothingTimeConstant = 0)`; `src -> an`, `src -> mix`.
4. Push `{sid, track: ev.track, an, pc}` to `__dn.rx`.

## 4. Sampler (rx pages; `setInterval(tickMs)`, `Date.now()` timestamps comparable across pages)
Per tick pushes to `__dn.samples`:
`{t, per: {<sid>: {rms, bin}}, mixRms, mixTone: [dB x12], mk: [pid...]}`
- `per`: for each `sid`, among `rx` entries whose `track.readyState === 'live'` take the loudest one (several pcs can share a sid after a reconnect). `rms` = sqrt(mean(x^2)) of `getFloatTimeDomainData` over `fft` samples; `bin` = argmax index >= 1 of `getFloatFrequencyData`. No live track for a sid -> key absent (analysis reads absent as rms 0).
- `mixRms` = same RMS on `mixAn`. `mixTone[k]` = max dB of `mixAn` over bins `[b_k-1, b_k+1]`, `b_k = round((toneBase+toneStep*k) * fft / sampleRate)`, k = 0..11.
- `mk` (markers on): mod = pids `p` where `__mod3d.desks[p].el.dataset.spk === '1'`; player = `S.players[i].id` for each `.sec-players .pl` row i whose `dataset.speaking === '1'`. Read-only DOM reads.
- `__dn.info()` returns `{sampleRate: rctx.sampleRate, binHz: sampleRate / fft, fft}`.

## 5. Recorder (recorder on)
`MediaRecorder(mixDest.stream, {mimeType: 'audio/webm;codecs=opus'})`, `start(1000)` at init so it starts before any slot; `__dn.recStartT = Date.now()` in `onstart`. `await __dn.stopRecorder()` stops it and resolves `{startT, mime, b64}` (all chunks as one Blob read to base64). The runner decodes and writes `raw/mod3d-audio.webm` / `raw/p01-audio.webm`. The mix is the raw received audio of all senders, summed, no panning.

## 6. Mapping a remote track to its sender seat
The sender's `pc.addTrack(V.track, V.stream)` puts `V.stream.id` (our fake-mic stream id) in the offer's `a=msid`; the receiver's `ev.streams[0].id` equals it (Chromium keeps the msid stream id). So `sid -> seat` is built by the runner from the 12 players' `__dn.streamIds`. No product bookkeeping or signalling is read, the server's pid numbering is irrelevant to the audio path (pid only enters via the marker check: `seat -> pid` from the engine player list).
- Gap policy: if a received sid maps to no seat the run FAILs (`AC-2 every inbound stream maps to a seat`), it never guesses.
- Fallback if the smoke run shows msid ids differ `[verify]`: map by ICE ufrag, `receiver pc.remoteDescription.sdp a=ice-ufrag` == `sender pc.localDescription.sdp a=ice-ufrag` (sender pcs are in the sender page's `__dn.pcs`). Same sample shape; only the key of `per` changes. Still no product change.

## Product-side hook gaps
None found: `window.RTCPeerConnection` and `navigator.mediaDevices.getUserMedia` are read at call time by `voice.js` and `mod3d/voice.js`; `window.__mod3d.desks[pid].el` and `Voice.status()/toggle()` already exist; the `#sgBtn` click registers the mod socket. No blocker.
