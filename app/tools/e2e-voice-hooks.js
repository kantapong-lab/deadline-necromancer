// Page-side test hooks for tools/e2e-pw-voice.js, injected with ctx.addInitScript(voiceHook, opts).
// voiceHook is serialized by Playwright: it must stay self-contained (no closure variables, no require).
// It wraps RTCPeerConnection + getUserMedia (fake mic = speech buffer + pilot OscillatorNode per seat) and measures every remote
// track on its own AudioContext, so the product code (public/voice.js, public/mod3d/voice.js) is never changed.
// Every hook body is try/catch; failures go to window.__dn.errors, never to console.error.
const HOOK_DEFAULTS = {
  role: 'player', seat: null, rx: false, recorder: false, markers: null,
  speech: null, speechGain: 1, pilotGain: 0.007, pilotBase: 4000, pilotStep: 150, toneBase: 220, toneStep: 40, fft: 8192, sampleRate: 48000, tickMs: 100,
};

function voiceHook(opts) {
  if (window.__dn) return;
  const o = opts || {};
  const dn = window.__dn = { errors: [], pcs: [], streamIds: [], toneLog: [], rx: [], samples: [], seat: o.seat, freq: null, recStartT: 0 };
  const guard = (tag, fn) => { try { return fn(); } catch (e) { dn.errors.push(tag + ': ' + (e && e.message || e)); } };
  const AC = window.AudioContext || window.webkitAudioContext;

  // 1. RTCPeerConnection wrapper (all pages)
  guard('pcwrap', () => {
    const Orig = window.RTCPeerConnection;
    if (!Orig) return;
    const W = function (...a) { const pc = new Orig(...a); guard('register', () => register(pc)); return pc; };
    W.prototype = Orig.prototype;
    Object.setPrototypeOf(W, Orig);
    window.RTCPeerConnection = W;
  });
  dn.connected = () => {
    let i = 0, out = 0;
    for (const pc of dn.pcs) {
      if (pc.connectionState !== 'connected') continue;
      if (pc.getSenders().some(s => s.track)) out++; else i++;
    }
    return { in: i, out, all: i + out };
  };

  // 2. Fake microphone (players): speech (AudioBufferSourceNode, looped while "on") + a quiet per-seat ID pilot tone
  // (OscillatorNode at pilotBase + pilotStep*seat Hz). o.speech = base64 wav; without it the speech is a sine at toneBase+toneStep*seat.
  if (o.role === 'player' && AC) guard('fakemic', () => {
    const ctx = new AC({ sampleRate: o.sampleRate, sinkId: { type: 'none' } });
    dn.freq = o.pilotBase + o.pilotStep * o.seat;
    const pil = ctx.createOscillator(), pg = ctx.createGain(), sg = ctx.createGain(), out = ctx.createGain();
    pil.type = 'sine'; pil.frequency.value = dn.freq; pg.gain.value = 0; sg.gain.value = 0;
    pil.connect(pg); pg.connect(out); sg.connect(out); pil.start();
    let buf = null, src = null, lastDest = null;
    if (o.speech) {
      const bin = atob(o.speech), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      ctx.decodeAudioData(u8.buffer).then(b => { buf = b; dn.speechS = b.duration; }, e => dn.errors.push('decode: ' + (e && e.message || e)));
    } else {
      const f = o.toneBase + o.toneStep * o.seat, n = o.sampleRate;
      buf = ctx.createBuffer(1, n, o.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = 0.5 * Math.sin(2 * Math.PI * f * i / n);
    }
    ctx.resume().catch(() => {});
    dn.tone = on => guard('tone', () => {
      const now = ctx.currentTime;
      if (src) { try { src.stop(now + 0.02); } catch (e) { /* already stopped */ } src = null; }
      if (on) {
        if (!buf) { dn.errors.push('tone before speech buffer ready'); return; }
        src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(sg); src.start(now);
      }
      sg.gain.setValueAtTime(on ? o.speechGain : 0, now);
      pg.gain.setValueAtTime(on ? o.pilotGain : 0, now);
      dn.toneLog.push({ t: Date.now(), on: !!on });
    });
    const md = navigator.mediaDevices;
    if (md) md.getUserMedia = async () => {
      if (ctx.state !== 'running') await ctx.resume().catch(() => {});
      if (lastDest) { try { out.disconnect(lastDest); } catch (e) { /* already gone */ } }
      const dest = ctx.createMediaStreamDestination();
      out.connect(dest); lastDest = dest;
      dn.streamIds.push(dest.stream.id);
      return dest.stream;
    };
  });

  // 3. Receive side (rx pages): own AudioContext, one analyser per remote stream, sampled every tickMs into
  // dn.blocks[sid] = [{t, rms, bin, p}] and dn.mixBlocks = [{t, rms, tone:[dB x12]}] (rms over the last fft samples,
  // bin = dominant FFT bin inside the pilot band only, p = its dB, tone[k] = max dB of the mix around pilot k).
  // sinkId 'none': Chromium headless stops playing out remote audio (inbound totalSamplesReceived stays 0) once a page
  // holds 12 remote streams plus real audio outputs, so the measuring contexts open no audio output at all.
  const fft = o.fft;
  const hz = k => o.pilotBase + o.pilotStep * k;
  const bandLo = Math.floor((o.pilotBase - 200) * fft / o.sampleRate), bandHi = Math.ceil((o.pilotBase + o.pilotStep * 11 + 200) * fft / o.sampleRate);
  const db = v => (v > -200 ? v : -200);
  dn.blocks = {}; dn.mixBlocks = [];
  let rctx = null, mix = null, mixAn = null, mixDest = null;
  if (o.rx && AC) guard('rxinit', () => {
    rctx = new AC({ sampleRate: o.sampleRate, sinkId: { type: 'none' } });
    rctx.resume().catch(() => {});
    mix = rctx.createGain();
    mixAn = rctx.createAnalyser(); mixAn.fftSize = fft; mixAn.smoothingTimeConstant = 0;
    mixDest = rctx.createMediaStreamDestination();
    mix.connect(mixAn); mix.connect(mixDest);
    // a suspended context (autoplay) would freeze the sampler: keep resuming
    setInterval(() => { if (rctx.state !== 'running') rctx.resume().catch(() => {}); }, 500);
  });
  function register(pc) {
    dn.pcs.push(pc);
    if (!o.rx || !rctx) return;
    pc.addEventListener('track', ev => guard('track', () => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      const src = rctx.createMediaStreamSource(stream);
      const an = rctx.createAnalyser(); an.fftSize = fft; an.smoothingTimeConstant = 0;
      src.connect(an); src.connect(mix);
      dn.rx.push({ sid: stream.id, track: ev.track, an, pc });
    }));
  }
  const tbuf = new Float32Array(fft), fbuf = new Float32Array(fft / 2);
  const rmsOf = an => { an.getFloatTimeDomainData(tbuf); let s = 0; for (let i = 0; i < tbuf.length; i++) s += tbuf[i] * tbuf[i]; return Math.sqrt(s / tbuf.length); };
  dn.state = () => ({ rctx: rctx && rctx.state, streams: Object.keys(dn.blocks).length });
  dn.info = () => ({ sampleRate: rctx ? rctx.sampleRate : o.sampleRate, binHz: (rctx ? rctx.sampleRate : o.sampleRate) / fft, fft });
  if (o.rx && rctx) setInterval(() => guard('sample', () => {
    const t = Date.now();
    for (const e of dn.rx) {
      if (e.track.readyState !== 'live') continue;
      const rms = rmsOf(e.an);
      e.an.getFloatFrequencyData(fbuf);
      let bin = bandLo; for (let i = bandLo + 1; i <= bandHi; i++) if (fbuf[i] > fbuf[bin]) bin = i;
      (dn.blocks[e.sid] = dn.blocks[e.sid] || []).push({ t, rms, bin, p: db(fbuf[bin]) });
    }
    const rms = rmsOf(mixAn);
    mixAn.getFloatFrequencyData(fbuf);
    const tone = [];
    for (let k = 0; k < 12; k++) {
      const b = Math.round(hz(k) * fft / rctx.sampleRate); let m = -Infinity;
      for (let i = b - 1; i <= b + 1; i++) if (fbuf[i] > m) m = fbuf[i];
      tone.push(db(m));
    }
    dn.mixBlocks.push({ t, rms, tone });
  }), o.tickMs);

  // 4. Speaking markers: sampled every tick, plus (mod3d) a MutationObserver on every desk so a marker set by the
  // product's own (starved) timer is stamped when it changes.
  dn.mkEvents = [];
  const watched = new Set();
  const observe = () => {
    const ds = window.__mod3d && window.__mod3d.desks;
    if (!ds) return;
    ds.forEach((d, p) => {
      if (!d || !d.el || watched.has(p)) return; watched.add(p);
      new MutationObserver(() => dn.mkEvents.push({ t: Date.now(), pid: p, on: d.el.dataset.spk === '1' })).observe(d.el, { attributes: true, attributeFilter: ['data-spk'] });
    });
  };
  if (o.rx && o.markers) setInterval(() => guard('sample', () => {
    const mk = [];
    if (o.markers === 'mod') {
      observe();
      const ds = window.__mod3d && window.__mod3d.desks;
      if (ds) ds.forEach((d, p) => { if (d && d.el && d.el.dataset.spk === '1') mk.push(p); });
    } else if (o.markers === 'player') {
      const pl = (typeof S !== 'undefined' && S && S.players) || [];
      document.querySelectorAll('.sec-players .pl').forEach((row, i) => { if (row.dataset.speaking === '1' && pl[i]) mk.push(pl[i].id); });
    }
    dn.samples.push({ t: Date.now(), mk });
  }), o.tickMs);

  // 5. Recorder of the received mix
  if (o.recorder && mixDest) guard('recorder', () => {
    const rec = new MediaRecorder(mixDest.stream, { mimeType: 'audio/webm;codecs=opus' });
    const chunks = [];
    rec.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    rec.onstart = () => { dn.recStartT = Date.now(); };
    rec.start(1000);
    dn.stopRecorder = () => new Promise(res => {
      const fin = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fr = new FileReader();
        fr.onload = () => res({ startT: dn.recStartT, mime: rec.mimeType, b64: String(fr.result).split(',')[1] || '' });
        fr.readAsDataURL(blob);
      };
      if (rec.state === 'inactive') return fin();
      rec.onstop = fin; rec.stop();
    });
  });
}

module.exports = { voiceHook, HOOK_DEFAULTS };
