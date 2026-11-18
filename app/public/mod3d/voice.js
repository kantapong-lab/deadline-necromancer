// voice-over: Mod3D (TV) receiver. ES module, native Web Audio, no THREE import. Listener only: never captures, never sends audio.
// Each speaker's stream is placed at its desk via a PannerNode. Dropped on voice:drop / connection failure.
const HOLD_MS = 300, LEVEL = 0.02, TICK_MS = 100, ACK_MS = 8000;

export function createModVoice({ socket, deskPos, onSpeaking }) {
  let ctx = null, master = null, on = false, enabled = false, ice = [], timer = null;
  const inn = new Map();                 // pid -> {pc, audio, src, an, pan, buf, queue, remote, loud, spk}
  const pos = { x: 0, y: 0, z: 0 };
  const safe = fn => { try { return fn(); } catch { /* never reach console.error */ } };
  const emitAck = (ev, data) => new Promise(res => {
    let done = false; const f = r => { if (!done) { done = true; res(r || { ok: false }); } };
    try { socket.emit(ev, data, f); } catch { f({ ok: false }); }
    setTimeout(() => f({ ok: false }), ACK_MS);
  });
  const sig = (to, kind, extra) => safe(() => socket.emit('v:sig', Object.assign({ to, kind }, extra)));
  const candJSON = c => c ? { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex, usernameFragment: c.usernameFragment || undefined } : null;
  const setSpk = (pid, e, v) => { if (e.spk !== v) { e.spk = v; safe(() => onSpeaking && onSpeaking(pid, v)); } };

  function drop(pid) {
    const e = inn.get(pid); if (!e) return;
    inn.delete(pid);
    safe(() => { e.pc.onicecandidate = e.pc.ontrack = e.pc.onconnectionstatechange = null; e.pc.close(); });
    safe(() => e.src && e.src.disconnect()); safe(() => e.pan && e.pan.disconnect()); safe(() => e.an && e.an.disconnect());
    safe(() => { e.audio.pause(); e.audio.srcObject = null; e.audio.remove(); });
    setSpk(pid, e, false);
  }
  const dropAll = () => Array.from(inn.keys()).forEach(drop);

  function attach(pid, e, stream) {
    if (inn.get(pid) !== e || !ctx) return;
    // Chromium only runs Web Audio on a remote stream once it is also attached to a media element; keep that element muted
    // so the sound is heard only through the panner.
    const a = document.createElement('audio'); a.muted = true; a.autoplay = true; a.setAttribute('playsinline', ''); a.hidden = true; a.srcObject = stream;
    document.body.appendChild(a); e.audio = a; a.play().catch(() => {});
    e.src = ctx.createMediaStreamSource(stream);
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'linear'; p.refDistance = 10; p.maxDistance = 200; p.rolloffFactor = 0.1;
    e.pan = p; e.an = ctx.createAnalyser(); e.an.fftSize = 512; e.buf = new Uint8Array(512);
    e.src.connect(p); p.connect(master || ctx.destination); e.src.connect(e.an);
    place(pid, e);
    startTimer();
  }
  function place(pid, e) {
    if (!e.pan || !deskPos(pid, pos)) return;
    const p = e.pan;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  }

  async function onOffer(from, sdp) {
    if (!enabled || !ctx || !Number.isInteger(from) || typeof sdp !== 'string') return;
    drop(from);
    const e = { pc: null, audio: null, src: null, an: null, pan: null, buf: null, queue: [], remote: false, loud: 0, spk: false };
    try {
      const pc = new RTCPeerConnection({ iceServers: ice }); e.pc = pc; inn.set(from, e);
      pc.onicecandidate = ev => sig(from, 'ice', { cand: candJSON(ev.candidate) });
      pc.onconnectionstatechange = () => { if (/failed|closed/.test(pc.connectionState) && inn.get(from) === e) drop(from); };
      pc.ontrack = ev => safe(() => attach(from, e, ev.streams[0] || new MediaStream([ev.track])));
      await pc.setRemoteDescription({ type: 'offer', sdp });
      e.remote = true;
      const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
      if (inn.get(from) !== e) return;
      sig(from, 'answer', { sdp: ans.sdp });
      for (const c of e.queue.splice(0)) await pc.addIceCandidate(c).catch(() => {});
    } catch { if (inn.get(from) === e) drop(from); }
  }
  function onIce(from, cand) {
    const e = inn.get(from); if (!e || !cand || typeof cand.candidate !== 'string') return;
    const c = { candidate: cand.candidate, sdpMid: cand.sdpMid, sdpMLineIndex: cand.sdpMLineIndex, usernameFragment: cand.usernameFragment };
    if (!e.remote) e.queue.push(c); else e.pc.addIceCandidate(c).catch(() => {});
  }

  function startTimer() {
    if (timer) return;
    timer = setInterval(() => safe(() => {
      const now = Date.now();
      inn.forEach((e, pid) => {
        if (e.an) { e.an.getByteTimeDomainData(e.buf); let s = 0; for (let k = 0; k < e.buf.length; k++) { const d = (e.buf[k] - 128) / 128; s += d * d; } if (Math.sqrt(s / e.buf.length) > LEVEL) e.loud = now; }
        setSpk(pid, e, now - e.loud < HOLD_MS);
      });
      if (ctx && ctx.state === 'suspended' && enabled) { ctx.resume().catch(() => {}); }
      if (!inn.size) { clearInterval(timer); timer = null; }
    }), TICK_MS);
  }

  async function register() {
    const r = await emitAck('voice:on', { on: true });
    if (r && r.ok) { on = true; ice = Array.isArray(r.iceServers) ? r.iceServers : []; return true; }
    return false;
  }
  // Called from the sound overlay click (a user gesture): unlocks the AudioContext, then registers for voice.
  async function enable() {
    try {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC || !window.RTCPeerConnection) return false; ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); }
      if (ctx.state !== 'running') await ctx.resume();
      if (ctx.state !== 'running') return false;
      enabled = true;
      return await register();
    } catch { return false; }
  }
  // After a socket reconnect (mod:join acked ok): re-send voice:on only if sound was enabled.
  function rehandshake() { safe(() => { dropAll(); on = false; if (enabled) register().catch(() => {}); }); }
  const isSuspended = () => !!ctx && ctx.state !== 'running' && enabled;
  function update(camera) {
    if (!ctx) return;
    safe(() => {
      camera.updateMatrixWorld();
      const L = ctx.listener, e = camera.matrixWorld.elements;
      const px = e[12], py = e[13], pz = e[14];
      // camera looks down -Z of its own frame; up is +Y
      const fx = -e[8], fy = -e[9], fz = -e[10], ux = e[4], uy = e[5], uz = e[6];
      if (L.positionX) { L.positionX.value = px; L.positionY.value = py; L.positionZ.value = pz; L.forwardX.value = fx; L.forwardY.value = fy; L.forwardZ.value = fz; L.upX.value = ux; L.upY.value = uy; L.upZ.value = uz; }
      else { L.setPosition(px, py, pz); L.setOrientation(fx, fy, fz, ux, uy, uz); }
      inn.forEach((en, pid) => place(pid, en));
    });
  }
  // TV-side mute (badge click): silences every panner at once; the connections stay up.
  function setMuted(m) { safe(() => { if (master) master.gain.value = m ? 0 : 1; }); }
  function dispose() { dropAll(); clearInterval(timer); timer = null; safe(() => ctx && ctx.close()); ctx = null; master = null; enabled = false; on = false; }

  socket.on('v:sig', d => safe(() => {
    if (!d || typeof d !== 'object' || !Number.isInteger(d.from)) return;
    if (d.kind === 'offer') onOffer(d.from, d.sdp).catch(() => {});
    else if (d.kind === 'ice') onIce(d.from, d.cand);
  }));
  socket.on('voice:drop', d => safe(() => { if (d && Number.isInteger(d.pid)) drop(d.pid); }));
  socket.on('voice:peers', () => {});
  socket.on('disconnect', () => safe(() => { dropAll(); on = false; }));

  return { enable, rehandshake, update, dispose, isSuspended, setMuted, state: () => ctx ? ctx.state : 'none' };
}
