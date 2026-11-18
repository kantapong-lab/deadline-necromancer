(function () {
  'use strict';
  const HOLD_MS = 300, LEVEL = 0.02, TICK_MS = 100, ACK_MS = 8000, MAX_TRIES = 3;
  const T = {
    insecure: 'ต้องใช้ HTTPS ถึงจะเปิดไมค์ได้ — ยังเล่นเกมต่อได้ตามปกติ',
    nomic: 'ไม่พบไมโครโฟนในอุปกรณ์นี้ — ยังเล่นเกมต่อได้ตามปกติ',
    denied: 'เบราว์เซอร์ไม่อนุญาตให้ใช้ไมค์ — เปิดสิทธิ์ที่ไอคอนแม่กุญแจ แล้วกดลองใหม่',
    busy: 'กำลังขอสิทธิ์ไมค์…',
    fail: 'เปิดไมค์ไม่สำเร็จ — ลองใหม่อีกครั้ง',
  };
  const LABEL = { off: '🎙️ เปิดไมค์', on: 'ไมค์เปิดอยู่ · กดเพื่อปิด', spk: 'กำลังพูด', gm: '🎙️ ตอนนี้ยังพูดไม่ได้' };
  const UNLABEL = { insecure: '🎙️ ไมค์ใช้ไม่ได้', nomic: '🎙️ ไม่พบไมโครโฟน', denied: '🎙️ ไมค์ถูกบล็อก' };

  const V = {
    sock: null, getState: () => null,
    unavail: null,
    hint: '', busy: false,
    wantOn: false,
    on: false,
    muted: false, permit: false,
    stream: null, track: null, ice: [], peers: [],
    out: new Map(),
    inn: new Map(),
    lastLoud: new Map(),
    speakSig: '', barSig: '', timer: null, ctx: null, self: null,
    lastYou: undefined, wasLobby: false, retry: new Map(),
  };

  const supported = () => !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection);
  const safe = fn => { try { return fn(); } catch (e) { return undefined; } };
  const emitAck = (ev, data) => new Promise(res => {
    let done = false; const f = r => { if (!done) { done = true; res(r || { ok: false }); } };
    try { V.sock.emit(ev, data, f); } catch { f({ ok: false }); }
    setTimeout(() => f({ ok: false, error: 'timeout' }), ACK_MS);
  });
  const sig = (to, kind, extra) => safe(() => V.sock && V.sock.emit('v:sig', Object.assign({ to, kind }, extra)));
  const candJSON = c => c ? { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex, usernameFragment: c.usernameFragment || undefined } : null;
  const closePc = pc => safe(() => { pc.onicecandidate = pc.ontrack = pc.onconnectionstatechange = null; pc.close(); });
  const ufragOf = sdp => { const m = /a=ice-ufrag:(\S+)/.exec(sdp || ''); return m ? m[1] : null; };
  const candFits = (pc, cand) => { const uf = cand && cand.usernameFragment, rd = pc.remoteDescription; return !uf || !rd || ufragOf(rd.sdp) === uf; };

  function vs() {
    if (V.unavail) return 'un';
    if (!V.on) return 'off';
    if (!V.permit) return 'gm';
    return V.lastLoud.has('self') && Date.now() - V.lastLoud.get('self') < HOLD_MS && !V.muted ? 'spk' : 'on';
  }
  function speakingMap() {
    const now = Date.now(), m = {}, you = V.getState() && V.getState().youId;
    V.inn.forEach((e, pid) => { if (now - (V.lastLoud.get(pid) || 0) < HOLD_MS) m[pid] = true; });
    if (V.permit && !V.muted && you != null && now - (V.lastLoud.get('self') || 0) < HOLD_MS) m[you] = true;
    return m;
  }
  function status() { return { supported: supported(), hint: V.hint, on: V.on, muted: V.muted, permit: V.permit, busy: V.busy, vs: vs(), speaking: speakingMap() }; }

  async function toggle() {
    if (V.busy) return;
    if (V.wantOn) return stop();
    return start();
  }
  function start() {
    if (!supported()) { V.unavail = 'insecure'; V.hint = T.insecure; return paint(); }
    V.busy = true; V.hint = T.busy; paint();
    let gum;
    try { gum = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { gum = Promise.reject({ name: 'NotFoundError' }); }
    safe(() => { ensureCtx(); if (V.ctx && V.ctx.state === 'suspended') V.ctx.resume().catch(() => {}); });
    return gum.then(async stream => {
      V.stream = stream; V.track = stream.getAudioTracks()[0];
      if (!V.track) throw { name: 'NotFoundError' };
      V.track.enabled = !V.muted;
      V.unavail = null; V.wantOn = true;
      const r = await sendOn();
      V.busy = false;
      if (!r) { stopMic(); V.wantOn = false; V.hint = T.fail; }
      else V.hint = '';
      paint();
    }).catch(e => {
      V.busy = false; stopMic(); V.wantOn = false;
      const n = e && e.name;
      if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') { V.unavail = 'denied'; V.hint = T.denied; }
      else if (n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError') { V.unavail = 'nomic'; V.hint = T.nomic; }
      else { V.hint = T.fail; }
      paint();
    });
  }
  function stopMic() { safe(() => { if (V.stream) V.stream.getTracks().forEach(t => t.stop()); }); V.stream = V.track = null; if (V.self) { safe(() => V.self.src.disconnect()); V.self = null; } V.lastLoud.delete('self'); }
  function stop() {
    V.wantOn = false; V.on = false; V.permit = false;
    closeAll(); stopMic();
    if (V.sock) safe(() => V.sock.emit('voice:on', { on: false }, () => {}));
    V.hint = ''; paint();
  }
  // Registers this socket for voice and applies the ack; resolves true when ok.
  async function sendOn() {
    const r = await emitAck('voice:on', { on: true });
    if (!r || !r.ok || !V.wantOn) { V.on = false; return false; }
    V.on = true; V.ice = Array.isArray(r.iceServers) ? r.iceServers : []; V.permit = !!r.permit; V.peers = Array.isArray(r.peers) ? r.peers : [];
    reconcile(); startTimer(); return true;
  }
  function toggleMute() { V.muted = !V.muted; if (V.track) V.track.enabled = !V.muted; if (V.muted) V.lastLoud.delete('self'); paint(); }

  function closeAllOut() { V.out.forEach(e => closePc(e.pc)); V.out.clear(); }
  function reconcile() {
    if (!(V.on && V.permit && V.track)) { closeAllOut(); return; }
    const want = new Map(); (V.peers || []).forEach(p => { if (p && (p.to === 'mod' || Number.isInteger(p.to))) want.set(p.to, p.gen); });
    V.out.forEach((e, to) => { if (!want.has(to) || want.get(to) !== e.gen || /failed|closed/.test(e.pc.connectionState)) { closePc(e.pc); V.out.delete(to); } });
    want.forEach((gen, to) => { if (!V.out.has(to)) offerTo(to, gen); });
  }
  async function offerTo(to, gen) {
    const e = { pc: null, gen, queue: [], tries: (V.retry.get(to) || 0) };
    try {
      const pc = new RTCPeerConnection({ iceServers: V.ice }); e.pc = pc; V.out.set(to, e);
      pc.addTrack(V.track, V.stream);
      pc.onicecandidate = ev => sig(to, 'ice', { cand: candJSON(ev.candidate) });
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') V.retry.delete(to);
        if (pc.connectionState === 'failed' && V.out.get(to) === e) {
          closePc(pc); V.out.delete(to);
          const n = (V.retry.get(to) || 0) + 1; V.retry.set(to, n);
          if (n <= MAX_TRIES) setTimeout(() => safe(reconcile), 1500 * n);
        }
      };
      const offer = await pc.createOffer();
      if (V.out.get(to) !== e) return;
      await pc.setLocalDescription(offer);
      if (V.out.get(to) !== e) return;
      sig(to, 'offer', { sdp: offer.sdp });
    } catch { if (e.pc && V.out.get(to) === e) { closePc(e.pc); V.out.delete(to); } }
  }
  async function onAnswer(from, sdp) {
    const e = V.out.get(from); if (!e || typeof sdp !== 'string' || e.pc.remoteDescription) return;
    try {
      await e.pc.setRemoteDescription({ type: 'answer', sdp });
      const q = e.queue.splice(0); for (const c of q) if (candFits(e.pc, c)) await e.pc.addIceCandidate(c).catch(() => {});
    } catch { closePc(e.pc); if (V.out.get(from) === e) V.out.delete(from); }
  }

  function ensureCtx() {
    if (V.ctx) return V.ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    V.ctx = new AC(); return V.ctx;
  }
  function dropInn(pid) {
    const e = V.inn.get(pid); if (!e) return;
    V.inn.delete(pid); V.lastLoud.delete(pid);
    closePc(e.pc);
    safe(() => e.src && e.src.disconnect()); safe(() => { e.audio.pause(); e.audio.srcObject = null; e.audio.remove(); });
    updateSpeaking();
  }
  function closeAll() { closeAllOut(); Array.from(V.inn.keys()).forEach(dropInn); V.retry.clear(); }
  async function onOffer(from, sdp) {
    if (!V.on || !Number.isInteger(from) || typeof sdp !== 'string') return;
    dropInn(from);
    const e = { pc: null, audio: null, src: null, an: null, buf: null, queue: [], remote: false };
    try {
      const pc = new RTCPeerConnection({ iceServers: V.ice }); e.pc = pc; V.inn.set(from, e);
      pc.onicecandidate = ev => sig(from, 'ice', { cand: candJSON(ev.candidate) });
      pc.onconnectionstatechange = () => { if (/failed|closed/.test(pc.connectionState) && V.inn.get(from) === e) dropInn(from); };
      pc.ontrack = ev => safe(() => attach(from, e, ev.streams[0] || new MediaStream([ev.track])));
      await pc.setRemoteDescription({ type: 'offer', sdp });
      e.remote = true;
      const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
      if (V.inn.get(from) !== e) return;
      sig(from, 'answer', { sdp: ans.sdp });
      const q = e.queue.splice(0); for (const c of q) if (candFits(pc, c)) await pc.addIceCandidate(c).catch(() => {});
    } catch { if (V.inn.get(from) === e) dropInn(from); }
  }
  function attach(pid, e, stream) {
    if (V.inn.get(pid) !== e) return;
    const a = document.createElement('audio'); a.autoplay = true; a.setAttribute('playsinline', ''); a.hidden = true; a.srcObject = stream;
    document.body.appendChild(a); e.audio = a; a.play().catch(() => {});
    const ctx = ensureCtx();
    if (ctx) { e.src = ctx.createMediaStreamSource(stream); e.an = ctx.createAnalyser(); e.an.fftSize = 512; e.buf = new Uint8Array(e.an.fftSize); e.src.connect(e.an); }
    startTimer();
  }
  function onIce(from, cand) {
    if (!cand || typeof cand.candidate !== 'string') return;
    const i = V.inn.get(from), o = V.out.get(from), c = { candidate: cand.candidate, sdpMid: cand.sdpMid, sdpMLineIndex: cand.sdpMLineIndex, usernameFragment: cand.usernameFragment };
    const uf = c.usernameFragment, toOut = !!(o && uf && o.pc.remoteDescription && ufragOf(o.pc.remoteDescription.sdp) === uf);
    if (i && !i.remote && !toOut) { i.queue.push(c); return; }
    if (i && candFits(i.pc, c) && (c.usernameFragment || !o)) { i.pc.addIceCandidate(c).catch(() => {}); return; }
    if (o) { if (!o.pc.remoteDescription) o.queue.push(c); else if (candFits(o.pc, c)) o.pc.addIceCandidate(c).catch(() => {}); }
  }

  const loud = (an, buf) => { an.getByteTimeDomainData(buf); let s = 0; for (let k = 0; k < buf.length; k++) { const d = (buf[k] - 128) / 128; s += d * d; } return Math.sqrt(s / buf.length) > LEVEL; };
  function startTimer() {
    if (V.timer) return;
    V.timer = setInterval(() => safe(() => {
      const now = Date.now();
      V.inn.forEach((e, pid) => { if (e.an && loud(e.an, e.buf)) V.lastLoud.set(pid, now); });
      if (V.track && V.permit && !V.muted && V.ctx) {
        if (!V.self) { const src = V.ctx.createMediaStreamSource(new MediaStream([V.track])), an = V.ctx.createAnalyser(); an.fftSize = 512; src.connect(an); V.self = { src, an, buf: new Uint8Array(512) }; }
        if (loud(V.self.an, V.self.buf)) V.lastLoud.set('self', now);
      }
      updateSpeaking();
      if (!V.inn.size && !V.on) { clearInterval(V.timer); V.timer = null; }
    }), TICK_MS);
  }
  function updateSpeaking() {
    const m = speakingMap(), s = Object.keys(m).sort().join(',') + '|' + vs();
    if (s !== V.speakSig) { V.speakSig = s; paint(); }
  }

  function barHTML() {
    const st = status(), s = st.vs;
    const un = s === 'un', label = un ? UNLABEL[V.unavail] : LABEL[s], dis = un || s === 'gm';
    const retry = un && V.unavail !== 'insecure' ? '<button type="button" id="vrBtn" class="btn vr" onclick="Voice.toggle()">ลองใหม่</button>' : '';
    const mute = V.on && !V.unavail;
    return `<div class="voicewrap" data-sig="${sigOf()}"><div id="voicebar" class="voicebar" role="group" aria-label="ไมโครโฟน">`
      + `<button type="button" id="vcBtn" class="btn vc" data-vs="${s}" ${un ? `data-why="${V.unavail}"` : ''} ${dis ? 'disabled' : ''} ${V.busy ? 'aria-busy="true" disabled' : ''} onclick="Voice.toggle()">${V.busy ? 'กำลังขอสิทธิ์ไมค์…' : label}</button>${V.busy ? '' : retry}`
      + `<button type="button" id="vmBtn" class="btn vm ${mute ? 'show' : ''}" aria-pressed="${V.muted ? 'true' : 'false'}" ${mute ? '' : 'tabindex="-1" aria-hidden="true"'} onclick="Voice.toggleMute()">${V.muted ? '🔇 เปิดเสียงตัวเอง' : 'ปิดเสียงตัวเอง'}</button></div>`
      + `<p id="voiceHint" class="hint" aria-live="polite">${V.hint}</p></div>`;
  }
  const sigOf = () => [vs(), V.unavail, V.busy, V.muted, V.on, V.hint].join('|');
  function paintBar() {
    const w = document.querySelector('.voicewrap'); if (!w) return;
    const sig2 = sigOf();
    if (w.dataset.sig === sig2) return;
    const fid = document.activeElement && document.activeElement.id;
    const t = document.createElement('div'); t.innerHTML = barHTML();
    w.replaceWith(t.firstChild);
    if (fid) { const el = document.getElementById(fid); if (el && !el.disabled) el.focus(); }
  }
  function paintList() {
    const S = V.getState(); if (!S || !S.players) return;
    const sp = speakingMap(), rows = document.querySelectorAll('.sec-players .pl');
    rows.forEach((row, i) => {
      const p = S.players[i]; if (!p) return;
      if (!row.querySelector('.vi')) {
        const vi = document.createElement('span'); vi.className = 'vi'; vi.setAttribute('aria-hidden', 'true'); vi.innerHTML = '<i></i><i></i><i></i>'; row.appendChild(vi);
        const sr = document.createElement('span'); sr.className = 'sr'; row.appendChild(sr);
      }
      const on = !!sp[p.id] && p.alive && p.connected !== false;
      row.dataset.speaking = on ? '1' : '0';
      const sr = row.querySelector('.sr'); if (sr) sr.textContent = on ? 'กำลังพูด' : '';
    });
  }
  function paint() { safe(paintBar); safe(paintList); }

  function init(o) {
    V.sock = o.socket; V.getState = o.getState || V.getState;
    if (!supported()) { V.unavail = 'insecure'; V.hint = T.insecure; }
    const s = V.sock;
    s.on('voice:permit', d => safe(() => {
      V.permit = !!(d && d.permit);
      if (!V.permit) { closeAllOut(); V.lastLoud.delete('self'); } else reconcile();
      updateSpeaking(); paint();
    }));
    s.on('voice:peers', d => safe(() => { V.peers = d && Array.isArray(d.peers) ? d.peers : []; reconcile(); }));
    s.on('voice:drop', d => safe(() => { if (d && Number.isInteger(d.pid)) dropInn(d.pid); }));
    s.on('v:sig', d => safe(() => {
      if (!d || typeof d !== 'object' || d.from == null || !(d.from === 'mod' || Number.isInteger(d.from))) return;
      if (d.kind === 'offer') onOffer(d.from, d.sdp).catch(() => {});
      else if (d.kind === 'answer') onAnswer(d.from, d.sdp).catch(() => {});
      else if (d.kind === 'ice') onIce(d.from, d.cand);
    }));
    s.on('disconnect', () => safe(() => { closeAll(); V.on = false; V.permit = false; paint(); }));
  }
  // Re-register after the player:join ack on every (re)connect.
  function onJoined() { safe(() => { closeAll(); if (V.wantOn) sendOn().then(paint).catch(() => {}); }); }
  function onState(st) {
    safe(() => {
      const lob = !st || st.phase === 'LOBBY', you = st && st.youId;
      if (V.wantOn && (V.lastYou !== undefined && V.lastYou !== you || (V.wasLobby && !lob))) { closeAll(); V.permit = false; sendOn().then(paint).catch(() => {}); }
      else if (V.on && lob) { closeAll(); }
      V.lastYou = you; V.wasLobby = lob;
    });
  }
  window.Voice = { init, onState, onJoined, toggle, toggleMute, status, barHTML, paint, supported };
})();
