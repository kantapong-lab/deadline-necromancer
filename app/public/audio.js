// Audio manager — BGM + SFX ตามเฟสของเกม
// - สังเคราะห์เสียงด้วย WebAudio (ไม่ต้องมีไฟล์) ใช้ได้ทันที
// - อยากใช้ไฟล์จริงแทน: ใส่ไฟล์ไว้ใน app/public/audio/ แล้วระบุชื่อใน DNAudio.FILES (ดูท้ายไฟล์)
// - เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้แตะหน้าจอ → เริ่ม AudioContext ตอน gesture แรก
const DNAudio = (() => {
  const LS = 'dn-audio';
  // เพลงจาก Pixabay (Pixabay Content License — ใช้ฟรี ไม่ต้องใส่เครดิต) ที่มา:
  //  night=Dark Drone/bearstockmusic · lobby=Chill Background (Fresh Office Silences)/Strawberry_Candy · morning=Lofi Study & Focus/DavidsGrove
  //  vote=Tension Countdown/leberch · win_light=Victory Music/PaulYudin · win_dark=Dark Villain/The_Mountain
  // ถ้าโหลดไฟล์ไม่ได้ จะ fallback ไปเสียงสังเคราะห์ใน SCENES อัตโนมัติ
  const FILES = { lobby: '/audio/lobby.mp3', morning: '/audio/morning.mp3', vote: '/audio/vote.mp3', night: '/audio/night.mp3', win_light: '/audio/win_light.mp3', win_dark: '/audio/win_dark.mp3' };
  const FILE_VOL = { morning: 0.35, lobby: 0.8, vote: 0.8, night: 0.9 };   // ปรับความดังรายแทร็ก (morning เบาไว้ไม่ให้กลบเสียงคุย)
  let ctx = null, master = null, musicBus = null, sfxBus = null;
  let cfg = { muted: false, vol: 0.5 };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(LS) || '{}')); } catch {}
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch {} };

  let current = null;          // { name, stop() }
  let wanted = null;           // scene ที่ควรเล่น (เผื่อ ctx ยังไม่พร้อม)
  let lastKey = '', lastEvent = null, lastTick = -1;

  // ---------- core ----------
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = cfg.muted ? 0 : cfg.vol; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.6; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    return ctx;
  }
  function unlock() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (wanted && !current) play(wanted);
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, unlock, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (ctx) document.hidden ? ctx.suspend() : (!cfg.muted && ctx.resume()); });

  // ---------- synth helpers ----------
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function tone(bus, { f, t = ctx.currentTime, dur = 1, type = 'sine', vol = 0.2, a = 0.02, r = 0.3, lp, detune = 0, slide }) {
    const o = ctx.createOscillator(), g = ctx.createGain(); let out = o;
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); out = fl; }
    out.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur - r)); g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noiseBuf(sec = 1) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  function click(bus, t, { vol = 0.15, f = 1800, dur = 0.04 } = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf(0.1);
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 6;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
  }
  // loop ด้วย timer แบบ lookahead — fn(t, step) วางโน้ตที่เวลา t
  function sequencer(stepSec, fn) {
    let step = 0, next = ctx.currentTime + 0.05;
    const id = setInterval(() => { while (next < ctx.currentTime + 0.3) { fn(next, step++); next += typeof stepSec === 'function' ? stepSec() : stepSec; } }, 100);
    return () => clearInterval(id);
  }
  // สร้าง bus ย่อยของ scene เพื่อ fade in/out
  function sceneBus(fadeIn = 1.2) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeIn); g.connect(musicBus);
    return { g, end(fadeOut = 1) { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setValueAtTime(g.gain.value, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + fadeOut); setTimeout(() => g.disconnect(), fadeOut * 1000 + 200); } };
  }

  // ---------- looped scenes ----------
  const SCENES = {
    // ล็อบบี้: pad อุ่น ๆ + arpeggio เบา (Am–F–C–G)
    lobby(bus) {
      const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
      const stop = sequencer(0.5, (t, s) => {
        const ch = prog[Math.floor(s / 8) % 4];
        if (s % 8 === 0) ch.forEach(m => tone(bus, { f: hz(m - 12), t, dur: 4.2, type: 'sine', vol: 0.07, a: 0.8, r: 1.2 }));
        tone(bus, { f: hz(ch[s % 3] + 12), t, dur: 0.6, type: 'triangle', vol: 0.05, a: 0.01, r: 0.5, lp: 2200 });
      });
      return stop;
    },
    // ห้องประชุมเช้า: ambient เบามาก (ไม่กลบเสียงคุย)
    morning(bus) {
      const stop = sequencer(4, (t, s) => {
        const root = [45, 43, 41, 43][s % 4];
        [root, root + 7].forEach(m => tone(bus, { f: hz(m), t, dur: 5, type: 'sine', vol: 0.035, a: 1.5, r: 2 }));
      });
      bus.gain.value = 0.7; return stop;
    },
    // โหวต: นาฬิกาเดิน — เร่งจังหวะ + heartbeat ใน 10 วินาทีสุดท้าย
    vote(bus) {
      let beat = 0;
      const stop = sequencer(() => lowTime() ? 0.5 : 1, (t) => {
        click(bus, t, { vol: lowTime() ? 0.22 : 0.14, f: beat++ % 2 ? 1500 : 2100 });
        if (lowTime()) { tone(bus, { f: 55, t, dur: 0.25, type: 'sine', vol: 0.25, a: 0.005, r: 0.2, slide: 40 }); }
      });
      tone(bus, { f: hz(33), dur: 600, type: 'sine', vol: 0.05, a: 2, r: 1 });   // drone ใต้ tick
      return stop;
    },
    // กลางคืน: necro drone + เสียงระฆังต่ำนาน ๆ ครั้ง (ฝ่ายมืดได้โทนแตกต่างเล็กน้อย)
    night(bus, dark) {
      const nodes = [];
      [[33, -7], [33, 7], [40, 0]].forEach(([m, d]) => nodes.push(tone(bus, { f: hz(m), dur: 3600, type: 'sawtooth', vol: 0.045, a: 3, r: 1, lp: 260, detune: d })));
      if (dark) nodes.push(tone(bus, { f: hz(34), dur: 3600, type: 'sine', vol: 0.03, a: 4, r: 1 }));   // ไมเนอร์เซคันด์ ตึง ๆ
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.02; lfo.connect(lg); lg.connect(bus.gain); lfo.start();
      const stop = sequencer(2, (t, s) => {
        if (Math.random() < 0.28) { const m = [57, 60, 63, 56][Math.floor(Math.random() * 4)]; tone(bus, { f: hz(m), t, dur: 3, type: 'sine', vol: 0.06, a: 0.01, r: 2.8 }); tone(bus, { f: hz(m + 12.1), t, dur: 2, type: 'sine', vol: 0.02, a: 0.01, r: 1.8 }); }
      });
      return () => { stop(); nodes.forEach(n => { try { n.stop(); } catch {} }); try { lfo.stop(); } catch {} };
    },
    // จบเกม: ฝ่ายแสง = โปร่ง/สว่าง, ฝ่ายมืด = ต่ำ/อึมครึม
    win_light(bus) {
      const prog = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]];
      return sequencer(0.4, (t, s) => { const ch = prog[Math.floor(s / 8) % 4]; if (s % 8 === 0) ch.forEach(m => tone(bus, { f: hz(m - 12), t, dur: 3.4, type: 'triangle', vol: 0.06, a: 0.2, r: 1.2 })); tone(bus, { f: hz(ch[s % 3] + 12), t, dur: 0.5, type: 'sine', vol: 0.07, a: 0.01, r: 0.4 }); });
    },
    win_dark(bus) {
      const prog = [[45, 48, 51], [44, 47, 50], [41, 44, 47], [40, 43, 46]];
      return sequencer(0.6, (t, s) => { const ch = prog[Math.floor(s / 6) % 4]; if (s % 6 === 0) ch.forEach(m => tone(bus, { f: hz(m - 12), t, dur: 4, type: 'sawtooth', vol: 0.03, a: 1, r: 1.5, lp: 500 })); if (s % 3 === 0) tone(bus, { f: hz(ch[(s / 3) % 3 | 0] + 12), t, dur: 1.2, type: 'sine', vol: 0.05, a: 0.01, r: 1 }); });
    },
  };
  function lowTime() { try { return timerState && Math.ceil((timerState.endsAt - Date.now()) / 1000) <= 10; } catch { return false; } }

  // ---------- one-shot stingers / sfx ----------
  const STINGERS = {
    reveal() { [57, 60, 64, 69].forEach((m, i) => tone(sfxBus, { f: hz(m), t: ctx.currentTime + i * 0.12, dur: 2.2, type: 'triangle', vol: 0.09, a: 0.02, r: 1.8, lp: 3000 })); },
    morning() { const t = ctx.currentTime; [72, 76, 79].forEach((m, i) => { tone(sfxBus, { f: hz(m), t: t + i * 0.18, dur: 1.8, type: 'sine', vol: 0.1, a: 0.005, r: 1.6 }); tone(sfxBus, { f: hz(m) * 2.76, t: t + i * 0.18, dur: 0.6, type: 'sine', vol: 0.02, a: 0.005, r: 0.5 }); }); },
    event() { const t = ctx.currentTime; for (let i = 0; i < 2; i++) tone(sfxBus, { f: 880, t: t + i * 0.22, dur: 0.18, type: 'square', vol: 0.05, a: 0.005, r: 0.1, lp: 3000 }); },
    siren() { const t = ctx.currentTime; for (let i = 0; i < 3; i++) tone(sfxBus, { f: 600, t: t + i * 0.8, dur: 0.8, type: 'sawtooth', vol: 0.06, a: 0.05, r: 0.2, lp: 1800, slide: 950 }); },
    result() { const t = ctx.currentTime; tone(sfxBus, { f: 70, t, dur: 1.2, type: 'sine', vol: 0.3, a: 0.005, r: 1, slide: 38 }); click(sfxBus, t, { vol: 0.2, f: 700, dur: 0.12 }); },
    night() { const t = ctx.currentTime; tone(sfxBus, { f: hz(45), t, dur: 2.5, type: 'sawtooth', vol: 0.06, a: 0.05, r: 2.2, lp: 400, slide: hz(33) }); },
    ping() { tone(sfxBus, { f: 1320, dur: 0.15, type: 'sine', vol: 0.08, a: 0.005, r: 0.1 }); },
  };

  // ---------- playback ----------
  const bufCache = {};
  async function playFile(name, url, bus) {
    const r = await fetch(url); if (!r.ok) throw new Error(r.status);
    const buf = bufCache[name] || (bufCache[name] = await ctx.decodeAudioData(await r.arrayBuffer()));
    const g = ctx.createGain(); g.gain.value = FILE_VOL[name] ?? 1; g.connect(bus);
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(g); s.start();
    return () => { try { s.stop(); } catch {} };
  }
  function play(name, opt) {
    wanted = name ? [name, opt] : null;
    if (!ensure() || ctx.state === 'suspended') { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); if (ctx?.state === 'suspended') return; }
    const nm = Array.isArray(name) ? name[0] : name;
    if (current && current.name === nm + (opt ? '*' : '')) return;
    stopCurrent();
    if (!nm) return;
    const b = sceneBus(), tag = nm + (opt ? '*' : '');
    let stopFn = () => {}, dead = false;
    const set = f => { if (dead) setTimeout(f, 1300); else stopFn = f; };   // แทร็กโหลดเสร็จหลังถูกสั่งหยุดแล้ว → หยุดทันที
    if (FILES[nm]) playFile(nm, FILES[nm], b.g).then(set).catch(() => { if (SCENES[nm]) set(SCENES[nm](b.g, opt)); });
    else if (SCENES[nm]) stopFn = SCENES[nm](b.g, opt);
    current = { name: tag, stop() { dead = true; b.end(1.2); setTimeout(() => stopFn(), 1300); } };
  }
  function stopCurrent() { if (current) { current.stop(); current = null; } }
  function sfx(name) { if (!ensure() || ctx.state === 'suspended' || cfg.muted) return; STINGERS[name]?.(); }

  // ---------- state → audio ----------
  // เรียกทุกครั้งที่ได้ state ใหม่ (idempotent — เปลี่ยนเสียงเฉพาะตอน day:phase เปลี่ยน)
  function onState(S) {
    if (!S) return;
    const key = S.day + ':' + S.phase, changed = key !== lastKey; lastKey = key;
    const dark = S.me?.faction === 'dark' && S.me?.alive !== false;
    if (S.phase === 'LOBBY') play('lobby');
    else if (S.phase === 'MORNING') play('morning');
    else if (S.phase === 'VOTE' || S.phase === 'VOTE_INTERIM') play('vote');
    else if (S.phase === 'VOTE_RESULT') stopCurrent();
    else if (S.phase === 'NIGHT') play('night', dark);
    else if (S.phase === 'OVER') play(S.over?.side === 'light' ? 'win_light' : 'win_dark');
    if (changed) {
      if (S.phase === 'MORNING') sfx(S.day === 1 ? 'reveal' : 'morning');
      else if (S.phase === 'VOTE_RESULT') sfx('result');
      else if (S.phase === 'NIGHT') sfx('night');
    }
    // Event Card ใหม่ → SFX (Production Crisis #13 ใช้ไซเรน)
    const en = S.event ? S.event.n : null;
    if (en !== lastEvent) { if (en != null) setTimeout(() => sfx(en === 13 ? 'siren' : 'event'), changed && S.phase === 'MORNING' ? 900 : 0); lastEvent = en; }
  }

  // ---------- controls ----------
  function apply() { if (master) master.gain.setTargetAtTime(cfg.muted ? 0 : cfg.vol, ctx.currentTime, 0.05); save(); refreshUI(); }
  function setMuted(m) { cfg.muted = !!m; unlock(); apply(); }
  function setVol(v) { cfg.vol = Math.min(1, Math.max(0, +v)); if (cfg.vol > 0) cfg.muted = false; unlock(); apply(); }
  function refreshUI() { document.querySelectorAll('.audioctl').forEach(el => { el.querySelector('button').textContent = cfg.muted || !cfg.vol ? '🔇' : '🔊'; el.querySelector('input').value = cfg.muted ? 0 : cfg.vol; }); }
  // HTML ของปุ่มปิดเสียง + slider (ใส่ใน topbar)
  function controlHTML() {
    return `<span class="audioctl"><button class="btn" title="เปิด/ปิดเพลงประกอบ" onclick="DNAudio.setMuted(!DNAudio.cfg().muted)">${cfg.muted || !cfg.vol ? '🔇' : '🔊'}</button><input type="range" min="0" max="1" step="0.05" value="${cfg.muted ? 0 : cfg.vol}" oninput="DNAudio.setVol(this.value)" aria-label="ระดับเสียง"></span>`;
  }
  return { onState, play, sfx, setMuted, setVol, controlHTML, cfg: () => cfg, FILES };
})();
