// Playwright e2e for the WebRTC mesh voice (ADR 0003) with 12 players + the Moderator 3D screen, recorded as a clip.
//   PLAYWRIGHT_DIR=<node_modules dir with playwright-core> [CHROME=<chromium binary>] node tools/e2e-pw-voice.js
// Env: PLAYWRIGHT_DIR, CHROME, E2E_PORT (default 3341), E2E_HEADED=1 (all 12 tones then play out of the speakers),
//      FFMPEG (ffmpeg binary, default: ffmpeg on PATH; required, `brew install ffmpeg`).
// Each seat's microphone is an OscillatorNode at 220+40*seat Hz (page hook, tools/e2e-voice-hooks.js); seats talk in turn,
// then all together, then P05 is NDA-Silenced, then the Moderator leaves MORNING. The receivers (mod3d, P01) measure every
// remote track (RMS + dominant FFT bin) and sample the speaking markers. Product code is not changed.
// Output (gitignored): app/e2e-out/voice/{voice-e2e.mp4, report.json, raw/*}. Exit 0 = every check passed, 1 = any FAIL.
const path = require('path'), fs = require('fs'), { spawnSync } = require('child_process');
const C = require('./e2e-pw-common');
const { voiceHook, HOOK_DEFAULTS } = require('./e2e-voice-hooks');

// ---- constants (written to report.json params; tune here, not the rules) ----
const SR = 48000, FFT = 8192, TICK_MS = 100, TONE_GAIN = 0.5;
const SLOT_MS = 1500, SETTLE_MS = 700, ALL_MS = 3000, ALL_SETTLE_MS = 1000;
const T_ON = 0.10, T_OFF = 0.01, FLOOR_DB = -60, BIN_TOL = 1, MIN_SAMPLES = 4;
const MESH_WAIT_MS = 60000, SILENCE_WAIT_MS = 5000, RECONNECT_WAIT_MS = 15000, CUT_WAIT_MS = 10000;
const PREROLL_MS = 1000, TAIL_MS = 1000;
const N = C.N, sleep = C.sleep;
const BIN_HZ = SR / FFT;
const freq = s => 220 + 40 * s;
const binOf = s => Math.round(freq(s) * FFT / SR);
const nn = i => String(i).padStart(2, '0');
const VOICE_ARGS = ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required',
  '--disable-features=WebRtcHideLocalIpsWithMdns', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  // mod3d on software GL renders ~1 frame/s and starves the page's timers (and the 100 ms sampler); Metal keeps it at 60 fps
  ...(process.platform === 'darwin' ? ['--use-angle=metal', '--ignore-gpu-blocklist'] : [])];
const OUT = path.join(__dirname, '..', 'e2e-out', 'voice'), RAW = path.join(OUT, 'raw');
const LEAKS = /NDA|Silence|silenc|ปิดปาก|mute|Burnout/gi;

// ---- ffmpeg discovery (AC-7) ----
function findFfmpeg() {
  const bin = process.env.FFMPEG || 'ffmpeg';
  const v = spawnSync(bin, ['-version'], { encoding: 'utf8' });
  const enc = v.status === 0 ? spawnSync(bin, ['-encoders'], { encoding: 'utf8' }) : null;
  if (v.status === 0 && /ffmpeg version/.test(v.stdout) && enc && enc.status === 0 && /libx264/.test(enc.stdout) && /\baac\b/.test(enc.stdout)) {
    return { bin, version: v.stdout.split('\n')[0] };
  }
  console.log(`FAIL ffmpeg not found or unusable (${bin}): install it with "brew install ffmpeg" or set FFMPEG=/path/to/ffmpeg`);
  return null;
}

// ---- analysis of the in-page data ----
// rxd = {blocks: {sid: [{t, rms, bin}]}, mixBlocks: [{t, rms, tone[12]}], samples: [{t, mk}], mkEvents: [{t, pid, on}]}
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const inWin = (list, a, b) => list.filter(s => s.t >= a && s.t <= b);
function seatStats(rxd, a, b, sidSeat) {
  const mixW = inWin(rxd.mixBlocks, a, b), n = mixW.length, per = {};
  for (const sid of Object.keys(rxd.blocks)) {
    const seat = sidSeat[sid]; if (seat === undefined) continue;
    const m = per[seat] = per[seat] || new Map();
    for (const k of inWin(rxd.blocks[sid], a, b)) { const key = Math.round(k.t / 100), cur = m.get(key); if (!cur || cur.rms < k.rms) m.set(key, k); }
  }
  const out = { n, seats: {}, mixRms: Math.max(0, ...mixW.map(x => x.rms)), mixTone: Array.from({ length: N }, (_, k) => Math.max(-Infinity, ...mixW.map(x => x.tone[k]))) };
  for (const seat of Object.keys(per)) {
    const v = [...per[seat].values()], rms = v.map(x => x.rms), pad = Math.max(0, n - v.length);
    const bins = v.filter(x => x.rms >= T_OFF && x.bin).map(x => x.bin);
    out.seats[seat] = { rms: median(rms.concat(Array(pad).fill(0))), maxRms: Math.max(0, ...rms), bin: median(bins), n: v.length };
  }
  return out;
}
function heardOf(st, seat) {
  const s = st.seats[seat], ex = binOf(seat);
  const rms = s ? s.rms : 0, bin = s ? s.bin : 0;
  return { seat, rms: +rms.toFixed(4), peakHz: +(bin * BIN_HZ).toFixed(1), bin, expectedBin: ex, samples: st.n,
    ok: st.n >= MIN_SAMPLES && !!s && rms >= T_ON && Math.abs(bin - ex) <= BIN_TOL };
}
function quietOf(st, seats) {
  let max = 0, loud = null;
  for (const seat of seats) { const s = st.seats[seat]; if (s && s.maxRms > max) { max = s.maxRms; loud = +seat; } }
  return { ok: st.n >= MIN_SAMPLES && max < T_OFF, maxRms: +max.toFixed(4), loudestSeat: loud };
}
const seatList = (ex) => Array.from({ length: N }, (_, i) => i).filter(i => !ex.includes(i));

async function main() {
  const ff = findFfmpeg();
  if (!ff) return 1;
  C.initEnv('3341');
  const pw = C.loadPw();
  if (!pw) { console.log('SKIP playwright not found (npm i playwright-core elsewhere and set PLAYWRIGHT_DIR=<its node_modules>)'); return 0; }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(RAW, '.pw'), { recursive: true });

  const { results, check } = C.makeChecker();
  const errs = [];
  const room = await C.startRoom();
  console.log(`room ${room.code} · out ${OUT}`);
  const report = {
    task: 'change-e2e-voice-clip', generatedAt: new Date().toISOString(), ok: false, room: room.code, port: +process.env.PORT,
    params: { SR, FFT, binHz: BIN_HZ, TICK_MS, TONE_GAIN, SLOT_MS, SETTLE_MS, ALL_MS, ALL_SETTLE_MS, T_ON, T_OFF, FLOOR_DB, BIN_TOL, MIN_SAMPLES },
    seats: [], checks: results, timeline: [], pageErrors: errs, clip: { path: 'voice-e2e.mp4', ok: false, ffmpeg: ff.version },
  };
  const tl = [];            // raw timeline entries (evaluated after the drain)
  const t = { clipStart: 0, clipEnd: 0 };
  let browser = null, ctxs = [], pages = [], m3 = null, mctx = null, G = null, R = null, seat = null;
  const videos = {}, videoStart = {}, rec = {};
  let sidSeat = {}, data = {};

  const hookOpts = (role, seatNo, rx, recorder, markers) => ({ ...HOOK_DEFAULTS, role, seat: seatNo, rx, recorder, markers, toneGain: TONE_GAIN, fft: FFT, sampleRate: SR, tickMs: TICK_MS });
  const onPage = async (page, ctx, idx, t0) => {
    const name = idx === 'mod' ? 'mod3d' : 'p' + nn(idx + 1);
    videos[name] = page.video(); videoStart[name] = t0;
    const o = idx === 'mod' ? hookOpts('mod', null, true, true, 'mod')
      : idx === 0 ? hookOpts('player', 0, true, true, 'player') : hookOpts('player', idx, false, false, null);
    await ctx.addInitScript(voiceHook, o);
  };
  const ev = (page, fn, arg) => page.evaluate(fn, arg);
  const all13 = () => [...pages, m3];
  const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn().catch(() => false)) return true; await sleep(300); } return false; };
  const conn = p => ev(p, () => window.__dn.connected());
  const tone = (i, on) => ev(pages[i], on0 => window.__dn.tone(on0), on);
  const vs = p => ev(p, () => { const b = document.querySelector('#vcBtn'); return b ? b.dataset.vs : null; });
  const texts = ps => Promise.all(ps.map(p => ev(p, () => document.body.innerText)));
  const matches = s => s.match(LEAKS) || [];
  const subset = (after, before) => { const c = {}; before.forEach(x => c[x.toLowerCase()] = (c[x.toLowerCase()] || 0) + 1); return after.every(x => (c[x.toLowerCase()] = (c[x.toLowerCase()] || 0) - 1) >= 0); };

  try {
    browser = await C.launchBrowser(pw, VOICE_ARGS);
    const watch = C.makeWatch(errs);
    const dirs = { dir: path.join(RAW, '.pw') };
    const j = await C.joinPlayers(browser, room, {
      watch, onPage,
      contextOptions: { recordVideo: { ...dirs, size: { width: 390, height: 844 } }, permissions: ['microphone'] },
    });
    pages = j.pages; ctxs = j.ctxs;
    check('12 players joined through the join form', room.rooms.get(room.code).members.size >= N || pages.length === N);
    const o = await C.openMod3d(browser, room, {
      watch, onPage,
      contextOptions: { recordVideo: { ...dirs, size: { width: 1440, height: 900 } }, permissions: ['microphone'] },
    });
    m3 = o.m3; mctx = o.mctx; ctxs.push(mctx);
    const g = await C.startGame(room, m3, check);
    R = g.room; G = g.G; seat = g.seat;
    report.seats = Array.from({ length: N }, (_, i) => ({ seat: i, name: 'P' + nn(i + 1), pid: seat(i), freqHz: freq(i), bin: binOf(i) }));
    check('AC-2 game is in MORNING', G.phase === 'MORNING', G.phase);

    // 2. voice on for all 12, wait for the mesh
    const tMesh = Date.now();
    await Promise.all(pages.map(p => ev(p, () => Voice.toggle())));
    const meshUp = await until(async () => {
      const mc = await conn(m3); if (mc.in !== N) return false;
      for (const p of pages) { const c = await conn(p); if (c.in !== N - 1 || c.out !== N) return false; }
      return true;
    }, MESH_WAIT_MS);
    const mc0 = await conn(m3);
    check('AC-2 voice mesh up', meshUp, `${meshUp ? Math.round((Date.now() - tMesh) / 1000) + ' s' : 'timeout'} · mod3d in ${mc0.in}/${N}`);
    console.log(`mesh ${meshUp ? 'up' : 'NOT up'} after ${Math.round((Date.now() - tMesh) / 1000)} s`);
    await sleep(1000);
    t.clipStart = Date.now() - PREROLL_MS;

    // 3. AC-2 turns
    for (let k = 0; k < N; k++) {
      const t0 = Date.now();
      console.log(`slot ${nn(k + 1)} P${nn(k + 1)} ${freq(k)}Hz start`);
      await Promise.all([k > 0 ? tone(k - 1, false) : null, tone(k, true)].filter(Boolean));
      tl.push({ phase: 'turn', slot: k + 1, talkers: [k], tStart: t0, tEnd: t0 + SLOT_MS, window: [t0 + SETTLE_MS, t0 + SLOT_MS] });
      await sleep(Math.max(0, t0 + SLOT_MS - Date.now()));
    }
    await tone(N - 1, false); await sleep(500);

    // 4. AC-3 all twelve
    console.log('all 12 talking');
    { const t0 = Date.now();
      await Promise.all(pages.map((_, i) => tone(i, true)));
      tl.push({ phase: 'all', slot: null, talkers: seatList([]), tStart: t0, tEnd: t0 + ALL_MS, window: [t0 + ALL_SETTLE_MS, t0 + ALL_MS] });
      await sleep(Math.max(0, t0 + ALL_MS - Date.now()));
      await Promise.all(pages.map((_, i) => tone(i, false))); await sleep(700); }

    // 5. AC-4 NDA-Silence on P05 (seat 4)
    console.log('NDA-Silence P05');
    const others = seatList([4]).map(i => pages[i]);
    const before = await texts(others);
    G.players[seat(4)].silenced = true; room.pushState(R);
    const gm = await until(async () => (await vs(pages[4])) === 'gm', SILENCE_WAIT_MS);
    await sleep(1500);
    const vsOthers = await Promise.all(others.map(vs));
    check('AC-4 NDA-Silence applied: P05 game-muted, others still on/spk', gm && vsOthers.every(v => v === 'on' || v === 'spk'), `P05 ${gm ? 'gm' : await vs(pages[4])} · others ${[...new Set(vsOthers)].join(',')}`);
    { const t0 = Date.now(); await tone(4, true);
      tl.push({ phase: 'silenced', slot: null, talkers: [4], tStart: t0, tEnd: t0 + SLOT_MS, window: [t0 + SETTLE_MS, t0 + SLOT_MS] });
      await sleep(Math.max(0, t0 + SLOT_MS - Date.now())); await tone(4, false); }
    const after = await texts(others), vsAfter = await Promise.all(others.map(vs));
    const leaky = others.map((_, i) => ({ i, ok: subset(matches(after[i]), matches(before[i])) })).filter(x => !x.ok);
    check("AC-4 other players' UI shows no mute/silence text", !leaky.length && vsAfter.every(v => v === 'on' || v === 'spk'),
      leaky.length ? 'new text on ' + leaky.map(x => 'page ' + x.i).join(',') : 'no new NDA/Silence/mute matches');
    await sleep(500);

    // 6. unsilence
    console.log('unsilence P05');
    G.players[seat(4)].silenced = false; room.pushState(R);
    const back = await until(async () => (await conn(pages[4])).out === N, RECONNECT_WAIT_MS);
    check('AC-4 unsilenced: P05 reconnected', back, back ? 'out ' + N : 'timeout');
    await sleep(1500);
    { const t0 = Date.now(); await tone(4, true);
      tl.push({ phase: 'unsilenced', slot: null, talkers: [4], tStart: t0, tEnd: t0 + SLOT_MS, window: [t0 + SETTLE_MS, t0 + SLOT_MS] });
      await sleep(Math.max(0, t0 + SLOT_MS - Date.now())); await tone(4, false); }
    await sleep(500);

    // 7. AC-5 leave MORNING
    console.log('toVote: every peer cut off');
    await Promise.all(pages.map((_, i) => tone(i, true)));
    const rv = await room.act('toVote');
    // day 1 has no vote (engine skips to VOTE_RESULT); any phase other than MORNING counts as leaving it
    check('AC-5 toVote accepted, MORNING left (day 1: VOTE_RESULT)', rv && rv.ok && G.phase !== 'MORNING', (rv && rv.error) || G.phase);
    const cut = await until(async () => (await Promise.all(all13().map(conn))).every(c => c.all === 0), CUT_WAIT_MS);
    const tz = Date.now();
    check('AC-5 toVote: no connected peers on any of 13 pages', cut, cut ? 'all 0' : JSON.stringify(await Promise.all(all13().map(async p => (await conn(p)).all))));
    tl.push({ phase: 'toVote', slot: null, talkers: seatList([]), tStart: tz, tEnd: tz + 1500, window: [tz + 300, tz + 1500] });
    await sleep(Math.max(0, tz + 1500 - Date.now()));
    await Promise.all(pages.map((_, i) => tone(i, false)));
    t.clipEnd = Date.now() + TAIL_MS;
    await sleep(TAIL_MS);
  } catch (e) {
    console.error('SCRIPT-ERR ' + (e && e.stack || e));
    results.push({ name: 'script error', ok: false, detail: String(e && e.message || e) });
    process.exitCode = 1;
  } finally {
    await finish().catch(e => { console.error('SCRIPT-ERR ' + (e && e.stack || e)); results.push({ name: 'finish error', ok: false, detail: String(e && e.message || e) }); });
  }

  // ---- drain, evaluate, mux, report ----
  async function finish() {
    const names = ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10', 'p11', 'p12', 'mod3d'];
    const pageOf = n => (n === 'mod3d' ? m3 : pages[+n.slice(1) - 1]);
    const dnErrors = [];
    for (const n of names) { const p = pageOf(n); if (!p) continue; await ev(p, () => window.__dn.errors).then(e => e.forEach(x => dnErrors.push(n + ': ' + x)), () => {}); }
    for (const n of ['mod3d', 'p01']) {
      const p = pageOf(n); if (!p) continue;
      try {
        data[n] = await ev(p, () => ({ blocks: window.__dn.blocks, mixBlocks: window.__dn.mixBlocks, samples: window.__dn.samples, mkEvents: window.__dn.mkEvents, info: window.__dn.info() }));
        const r = await ev(p, () => window.__dn.stopRecorder());
        rec[n] = r; fs.writeFileSync(path.join(RAW, n + '-audio.webm'), Buffer.from(r.b64, 'base64'));
        fs.writeFileSync(path.join(RAW, 'samples-' + n + '.json'), JSON.stringify(data[n]));
      } catch (e) { console.log(`drain ${n} failed: ${e.message}`); }
    }
    sidSeat = {};
    for (let i = 0; i < pages.length; i++) { try { (await ev(pages[i], () => window.__dn.streamIds)).forEach(s => { sidSeat[s] = i; }); } catch (e) { /* page gone */ } }

    if (data.mod3d && data.p01 && tl.length) evaluate();
    else check('AC-2 samples drained from mod3d and P01', false, 'missing data');

    // close contexts -> videos are flushed
    for (const c of ctxs) await c.close().catch(() => {});
    let saved = 0;
    for (const n of names) {
      const v = videos[n]; if (!v) continue;
      try { const src = await v.path(); const dst = path.join(RAW, n + '.webm'); fs.renameSync(src, dst); if (fs.statSync(dst).size > 0) saved++; } catch (e) { /* missing */ }
    }
    fs.rmSync(path.join(RAW, '.pw'), { recursive: true, force: true });
    const audioOk = ['mod3d', 'p01'].every(n => fs.existsSync(path.join(RAW, n + '-audio.webm')) && fs.statSync(path.join(RAW, n + '-audio.webm')).size > 0);
    check('AC-6 13 page videos and 2 audio recordings saved', saved === 13 && audioOk, `${saved}/13 videos, audio ${audioOk ? 'ok' : 'missing'}`);
    mux();
    check('AC-6 no JS errors on any page, hooks healthy', !errs.length && !dnErrors.length, errs.concat(dnErrors).slice(0, 5).join(' || '));

    const failed = results.filter(r => !r.ok).length;
    report.ok = failed === 0;
    report.generatedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close().catch(() => {});
    room.close();
    console.log(`\n${failed ? 'E2E VOICE FAILED' : 'E2E VOICE OK'}: ${results.length - failed}/${results.length} checks · clip ${path.join(OUT, 'voice-e2e.mp4')}`);
    if (failed) process.exitCode = 1;
  }

  function evaluate() {
    const rxs = { mod3d: data.mod3d, p01: data.p01 };
    const unmapped = new Set();
    for (const k of Object.keys(rxs)) Object.keys(rxs[k].blocks).forEach(sid => { if (sidSeat[sid] === undefined) unmapped.add(k + ':' + sid.slice(0, 8)); });
    check('AC-2 every inbound stream maps to a seat', unmapped.size === 0, unmapped.size ? [...unmapped].slice(0, 4).join(',') : `${Object.keys(sidSeat).length} stream ids`);
    // a starved page stamps the marker late: allow 300 ms after the slot
    const markerHit = (key, [a, b], pidv) => rxs[key].samples.some(s => s.t >= a && s.t <= b + 300 && s.mk.includes(pidv)) || rxs[key].mkEvents.some(e => e.on && e.pid === pidv && e.t >= a && e.t <= b + 300);
    const fmt = x => x.heard.map(h => `P${nn(h.seat + 1)} ${h.rms}/${h.peakHz}Hz`).join(' ');
    const entry = e => { report.timeline.push(e); return e; };
    const rx = (key, e, heardSeats, quietSeats, extra) => {
      const st = seatStats(rxs[key], e.window[0], e.window[1], sidSeat);
      const heard = heardSeats.map(s => heardOf(st, s));
      const quiet = quietOf(st, quietSeats);
      const r = { ok: heard.every(h => h.ok) && quiet.ok, heard, quiet, mixRms: +st.mixRms.toFixed(4), mixToneDb: null, marker: null, ...extra };
      return { r, st };
    };
    const byPhase = p => tl.filter(e => e.phase === p);

    // turns
    const turns = byPhase('turn').map(e => {
      const k = e.talkers[0], f = [freq(k)];
      const out = { phase: e.phase, slot: e.slot, talkers: e.talkers, freqHz: f, tStart: e.tStart, tEnd: e.tEnd, window: e.window, rx: {} };
      const m = rx('mod3d', e, [k], seatList([k]), {});
      m.r.marker = markerHit('mod3d', [e.tStart, e.tEnd], seat(k)); m.r.ok = m.r.ok && m.r.marker;
      out.rx.mod3d = m.r;
      let p;
      if (k === 0) { p = rx('p01', e, [], seatList([0]), { skipped: 'own slot' }); p.r.marker = null; }
      else { p = rx('p01', e, [k], seatList([k, 0]), {}); p.r.marker = markerHit('p01', [e.tStart, e.tEnd], seat(k)); p.r.ok = p.r.ok && p.r.marker; }
      out.rx.p01 = p.r;
      return entry(out);
    });
    turns.forEach(e => ['mod3d', 'p01'].forEach(key => {
      const r = e.rx[key];
      check(`AC-2 slot ${nn(e.slot)} P${nn(e.slot)} ${e.freqHz[0]}Hz ${key === 'p01' ? 'P01' : 'mod3d'}: tone, others quiet, marker`, r.ok,
        `${r.skipped ? 'own slot skipped' : r.heard.map(h => `rms ${h.rms} peak ${h.peakHz}Hz (want bin ${h.expectedBin} got ${h.bin})`).join('')} · others max ${r.quiet.maxRms}${r.quiet.loudestSeat != null ? ' (P' + nn(r.quiet.loudestSeat + 1) + ')' : ''} · marker ${r.marker}`);
    }));

    // all 12
    const ea = byPhase('all')[0];
    if (ea) {
      const m = rx('mod3d', ea, seatList([]), [], {}), p = rx('p01', ea, seatList([0]), [], {});
      entry({ phase: 'all', slot: null, talkers: ea.talkers, freqHz: ea.talkers.map(freq), tStart: ea.tStart, tEnd: ea.tEnd, window: ea.window, rx: { mod3d: m.r, p01: p.r } });
      check('AC-3 all 12 talking: 12/12 peers above threshold on mod3d', m.r.ok, `${m.r.heard.filter(h => h.ok).length}/12 · ` + fmt(m.r));
      check('AC-3 all 12 talking: P01 hears the other 11', p.r.ok, `${p.r.heard.filter(h => h.ok).length}/11 · ` + fmt(p.r));
    } else check('AC-3 all 12 talking: 12/12 peers above threshold on mod3d', false, 'window not reached');

    // silenced / unsilenced
    const sil = (e, heardExpected) => {
      const out = { phase: e.phase, slot: null, talkers: [4], freqHz: [freq(4)], tStart: e.tStart, tEnd: e.tEnd, window: e.window, rx: {} };
      for (const key of ['mod3d', 'p01']) {
        const q = seatList(heardExpected ? [4, ...(key === 'p01' ? [0] : [])] : [...(key === 'p01' ? [0] : [])]);
        const x = rx(key, e, heardExpected ? [4] : [], heardExpected ? q : [4], {});
        const mt = x.st.mixTone[4];
        x.r.mixToneDb = Number.isFinite(mt) ? +mt.toFixed(1) : null;
        x.r.marker = markerHit(key, [e.tStart, e.tEnd], seat(4));
        if (!heardExpected) x.r.ok = x.r.ok && (x.r.mixToneDb === null || x.r.mixToneDb < FLOOR_DB);
        out.rx[key] = x.r;
      }
      return entry(out);
    };
    const es = byPhase('silenced')[0];
    if (es) {
      const e = sil(es, false);
      ['mod3d', 'p01'].forEach(key => check(`AC-4 silenced P05 slot: no P05 tone on ${key === 'p01' ? 'P01' : 'mod3d'}`, e.rx[key].ok,
        `P05 rms ${e.rx[key].quiet.maxRms} · mix at ${freq(4)}Hz ${e.rx[key].mixToneDb === null ? "-inf" : e.rx[key].mixToneDb} dB (floor ${FLOOR_DB})`));
      check('AC-4 silenced P05 slot: no speaking marker for P05', !e.rx.mod3d.marker && !e.rx.p01.marker, `mod3d ${e.rx.mod3d.marker} p01 ${e.rx.p01.marker}`);
    } else ['mod3d', 'P01'].forEach(k => check(`AC-4 silenced P05 slot: no P05 tone on ${k}`, false, 'not reached'));
    const eu = byPhase('unsilenced')[0];
    if (eu) {
      const e = sil(eu, true);
      ['mod3d', 'p01'].forEach(key => check(`AC-4 unsilenced P05 slot: heard on ${key === 'p01' ? 'P01' : 'mod3d'}`, e.rx[key].ok,
        e.rx[key].heard.map(h => `rms ${h.rms} peak ${h.peakHz}Hz`).join('') + ` · others max ${e.rx[key].quiet.maxRms}`));
    } else ['mod3d', 'P01'].forEach(k => check(`AC-4 unsilenced P05 slot: heard on ${k}`, false, 'not reached'));

    // toVote
    const ev5 = byPhase('toVote')[0];
    if (ev5) {
      const m = rx('mod3d', ev5, [], [], {}), p = rx('p01', ev5, [], [], {});
      const mm = Math.max(0, ...inWin(rxs.mod3d.mixBlocks, ev5.window[0], ev5.window[1]).map(s => s.rms)), pm = Math.max(0, ...inWin(rxs.p01.mixBlocks, ev5.window[0], ev5.window[1]).map(s => s.rms));
      m.r.ok = mm < T_OFF && m.r.heard.length === 0; p.r.ok = pm < T_OFF; m.r.mixRms = +mm.toFixed(4); p.r.mixRms = +pm.toFixed(4);
      entry({ phase: 'toVote', slot: null, talkers: ev5.talkers, freqHz: ev5.talkers.map(freq), tStart: ev5.tStart, tEnd: ev5.tEnd, window: ev5.window, rx: { mod3d: m.r, p01: p.r } });
      check('AC-5 toVote: no inbound audio on mod3d and P01', m.r.ok && p.r.ok, `mixRms mod3d ${m.r.mixRms} p01 ${p.r.mixRms} (< ${T_OFF})`);
    } else check('AC-5 toVote: no inbound audio on mod3d and P01', false, 'not reached');
  }

  function mux() {
    const mp4 = path.join(OUT, 'voice-e2e.mp4');
    const tStart = t.clipStart || Date.now(), tEnd = t.clipEnd || Date.now();
    const D = Math.max(1, (tEnd - tStart) / 1000);
    const names = Array.from({ length: N }, (_, i) => 'p' + nn(i + 1));
    const ss = n => Math.max(0, (tStart - (videoStart[n] || tStart)) / 1000);
    const audioFile = path.join(RAW, 'mod3d-audio.webm'), hasA = fs.existsSync(audioFile) && fs.statSync(audioFile).size > 0;
    const ssA = rec.mod3d ? Math.max(0, (tStart - rec.mod3d.startT) / 1000) : 0;
    const clip = report.clip;
    clip.startMs = tStart; clip.endMs = tEnd; clip.durationS = +D.toFixed(2); clip.audioOffsetS = +ssA.toFixed(3);
    clip.videoOffsetsS = Object.fromEntries([...names, 'mod3d'].map(n => [n, +ss(n).toFixed(3)]));
    const inputs = [], have = n => fs.existsSync(path.join(RAW, n + '.webm'));
    const f = [`color=c=0x0f0d1a:s=1920x1080:r=25:d=${D.toFixed(3)}[bg]`];
    let idx = 0, last = 'bg';
    const add = (n, w, h, x, y) => {
      if (!have(n)) return;
      inputs.push('-i', path.join(RAW, n + '.webm'));
      f.push(`[${idx}:v]fps=25,trim=start=${ss(n).toFixed(3)}:duration=${D.toFixed(3)},setpts=PTS-STARTPTS,scale=${w}:${h}[v${idx}]`);
      f.push(`[${last}][v${idx}]overlay=${x}:${y}[l${idx}]`);
      last = 'l' + idx; idx++;
    };
    add('mod3d', 1256, 785, 0, 0);
    names.forEach((n, i) => add(n, 166, 360, 1256 + (i % 4) * 166, Math.floor(i / 4) * 360));
    if (hasA) { inputs.push('-i', audioFile); f.push(`[${idx}:a]atrim=start=${ssA.toFixed(3)}:duration=${D.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000[aout]`); }
    else f.push(`anullsrc=r=48000:cl=stereo:d=${D.toFixed(3)}[aout]`);
    const args = ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', f.join(';'),
      '-map', `[${last}]`, '-map', '[aout]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '25',
      '-c:a', 'aac', '-b:a', '128k', '-t', D.toFixed(3), '-movflags', '+faststart', mp4];
    const r = spawnSync(ff.bin, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
    if (r.status !== 0) { clip.error = String(r.stderr || r.error).split('\n').slice(-8).join('\n'); check('AC-6 clip voice-e2e.mp4 written (video + audio)', false, clip.error.slice(0, 300)); return; }
    const pr = spawnSync(ff.bin, ['-hide_banner', '-i', mp4], { encoding: 'utf8' }).stderr || '';
    clip.streams = [/Video: h264/.test(pr) && 'video', /Audio: aac/.test(pr) && 'audio'].filter(Boolean);
    clip.ok = clip.streams.length === 2 && hasA;
    check('AC-6 clip voice-e2e.mp4 written (video + audio)', clip.ok, `${clip.durationS} s · ${clip.streams.join('+')} · ${hasA ? 'mod3d soundtrack' : 'NO audio source'}`);
  }

  return process.exitCode || 0;
}

main().then(c => process.exit(process.exitCode || c), e => { console.error('SCRIPT-ERR ' + (e && e.stack || e)); process.exit(1); });
