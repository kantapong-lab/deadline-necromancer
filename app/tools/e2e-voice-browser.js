const os = require('os');
const path = require('path');
process.env.PORT = process.env.E2E_PORT || '3320';
delete process.env.HTTPS_KEY; delete process.env.HTTPS_CERT;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];

function loadPuppeteer() {
  const dirs = ['', process.env.PUPPETEER_DIR ? process.env.PUPPETEER_DIR + '/' : null].filter(d => d !== null);
  for (const d of dirs) { try { return require(d + 'puppeteer'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; } }
  return null;
}

function check(name, ok, detail) {
  results.push({ name, ok });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' :: ' + detail : ''));
}

function emit(s, ev, data) {
  return new Promise(res => s.emit(ev, data, res));
}

async function main() {
  const puppeteer = loadPuppeteer();
  if (!puppeteer) { console.log('SKIP puppeteer not found (npm i puppeteer elsewhere and set PUPPETEER_DIR=<node_modules dir>)'); return 0; }
  const { io: Client } = require('socket.io-client');
  const { httpServer, rooms } = require('../src/server/index');
  const base = 'http://localhost:' + process.env.PORT;
  await new Promise(r => (httpServer.listening ? r() : httpServer.once('listening', r)));

  const ctl = Client(base, { forceNew: true });
  await new Promise(r => ctl.on('connect', r));
  const mc = await emit(ctl, 'mod:create', {});
  const code = mc.code, room = rooms.get(code);
  const bots = [];
  for (const n of ['B1', 'B2', 'B3']) { const s = Client(base, { forceNew: true }); await new Promise(r => s.on('connect', r)); await emit(s, 'player:join', { code, name: n }); bots.push(s); }

  const browser = await puppeteer.launch({ headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
  const hook = () => { window.__pcs = []; const O = window.RTCPeerConnection; if (!O) return; window.RTCPeerConnection = function (...a) { const pc = new O(...a); window.__pcs.push(pc); return pc; }; window.RTCPeerConnection.prototype = O.prototype; };
  async function mkPage(url) {
    const ctx = await browser.createBrowserContext();
    await ctx.overridePermissions(base, ['microphone']);
    const p = await ctx.newPage(); p.__errs = [];
    p.on('pageerror', e => p.__errs.push(String(e).slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) p.__errs.push(m.text().slice(0, 200)); });
    await p.evaluateOnNewDocument(hook);
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    return p;
  }
  async function join(p, name) { await p.waitForSelector('#jname'); await p.type('#jname', name); await p.evaluate(() => join()); await sleep(800); }
  async function btn(p) { return p.evaluate(() => { const b = document.getElementById('vcBtn'); return b ? { vs: b.dataset.vs, dis: b.disabled } : null; }); }
  async function conn(p) { return p.evaluate(() => (window.__pcs || []).filter(pc => pc.connectionState === 'connected').length); }
  async function inBytes(p) { return p.evaluate(async () => { let n = 0; for (const pc of window.__pcs || []) { if (pc.connectionState !== 'connected') continue; (await pc.getStats()).forEach(s => { if (s.type === 'inbound-rtp' && s.kind === 'audio') n += s.bytesReceived; }); } return n; }); }
  async function until(fn, ms) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(300); } return false; }
  function push() { return emit(ctl, 'mod:do', { action: 'announce', payload: { text: 'e2e' } }); }
  function pidOf(name) { return room.game.players.findIndex(p => p.name === name); }

  const A = await mkPage(base + '/?room=' + code); await join(A, 'PA');
  const B = await mkPage(base + '/?room=' + code); await join(B, 'PB');
  const C = await mkPage(base + '/?room=' + code); await join(C, 'PC');
  const modTok = room.modToken;
  const tv = await mkPage(base + '/mod3d.html#room=' + code + ':' + modTok);
  await sleep(2500);
  const st = await emit(ctl, 'mod:do', { action: 'start' });
  check('game starts', !!(st && st.ok), JSON.stringify(st));
  check('reaches MORNING', await until(() => room.game && room.game.phase === 'MORNING', 20000), room.game && room.game.phase);
  await sleep(2500);

  await tv.evaluate(() => document.getElementById('sgBtn').click()); await sleep(800);
  check('AC-18 sound gate unlocked', await tv.evaluate(() => getComputedStyle(document.getElementById('soundGate')).display) === 'none');
  for (const p of [A, B, C]) await p.evaluate(() => Voice.toggle());
  await sleep(7000);
  const bs = await Promise.all([A, B, C].map(btn));
  check('AC-1 voice on for all three', bs.every(b => b && (b.vs === 'on' || b.vs === 'spk')), JSON.stringify(bs));
  check('AC-3 each player receives audio', (await Promise.all([A, B, C].map(inBytes))).every(n => n > 0));
  check('AC-2/15 Mod3D receives audio from all three', (await conn(tv)) >= 3 && (await inBytes(tv)) > 0, 'connected=' + await conn(tv));
  check('AC-19 Mod3D desk speaking marker exists', (await tv.evaluate(() => document.querySelectorAll('[data-spk]').length)) > 0);
  await A.evaluate(() => Voice.toggleMute()); await sleep(600);
  check('AC-17 self-mute toggles', await A.evaluate(() => document.getElementById('vmBtn').getAttribute('aria-pressed')) === 'true');
  await A.evaluate(() => Voice.toggleMute());

  const leaks = /NDA|Silence|silenc|ปิดปาก|mute|Burnout|burnout/i;
  const bodyB0 = await B.evaluate(() => document.body.innerText);
  const base0 = { tv: await conn(tv), A: await conn(A), B: await conn(B), C: await conn(C) };

  async function muteCase(label, apply, restore, announced) {
    const pa = pidOf('PA');
    apply(room.game.players[pa]); await push();
    const gm = await until(async () => { const b = await btn(A); return b && b.vs === 'gm'; }, 4000);
    check(label + ': muted player button is game-muted', gm, JSON.stringify(await btn(A)));
    check(label + ': muted player closed its 3 outbound connections', await until(async () => (await conn(A)) <= base0.A - 3 && (await A.evaluate(() => Voice.status().permit)) === false, 4000), 'A connected=' + await conn(A) + ' was ' + base0.A);
    const gone = async () => (await conn(tv)) < base0.tv && (await conn(B)) < base0.B && (await conn(C)) < base0.C;
    const dropped = announced ? await until(gone, 4000) : (await sleep(3500), !(await gone()));
    check(label + (announced ? ': Mod3D and other players dropped the muted peer' : ': no drop event reaches others (silence stays secret)'), dropped, JSON.stringify({ tv: await conn(tv), B: await conn(B), C: await conn(C), was: base0 }));
    const txtB = await B.evaluate(() => document.body.innerText);
    check(label + ': other player UI shows no mute/silence/cause text', !leaks.test(txtB) || leaks.test(bodyB0), '');
    if (restore) {
      restore(room.game.players[pa]); await push();
      const back = await until(async () => (await conn(tv)) >= base0.tv && (await conn(B)) >= base0.B, 9000);
      check(label + ': voice resumes automatically once permitted again', back, JSON.stringify({ tv: await conn(tv), B: await conn(B) }));
    }
  }
  await muteCase('NDA-Silence', p => { p.silenced = true; }, p => { p.silenced = false; }, false);
  await muteCase('Burnout victim', p => { p.alive = false; p.cause = 'burnout'; }, null, true);
  const afterBurn = { tv: await conn(tv), B: await conn(B) };
  const pc = room.game.players[pidOf('PC')]; pc.alive = false; pc.cause = 'fired'; await push();
  check('Voted-out: player button game-muted', await until(async () => { const b = await btn(C); return b && b.vs === 'gm'; }, 4000), JSON.stringify(await btn(C)));
  check('Voted-out: Mod3D and other player dropped the peer', await until(async () => (await conn(tv)) < afterBurn.tv && (await conn(B)) < afterBurn.B, 4000), JSON.stringify({ tv: await conn(tv), B: await conn(B), was: afterBurn }));

  await emit(ctl, 'mod:do', { action: 'toVote' }); await sleep(3000);
  check('AC-8 outside MORNING nobody is connected', (await conn(B)) === 0, 'B connected=' + await conn(B));

  const ip = Object.values(os.networkInterfaces()).flat().find(i => i.family === 'IPv4' && !i.internal);
  if (ip) {
    const ctx = await browser.createBrowserContext(); const p3 = await ctx.newPage();
    await p3.goto('http://' + ip.address + ':' + process.env.PORT + '/?room=' + code, { waitUntil: 'domcontentloaded' });
    const sup = await p3.evaluate(() => ({ secure: window.isSecureContext, md: !!navigator.mediaDevices }));
    check('AC-13 insecure LAN origin has no mic API', !sup.secure && !sup.md, JSON.stringify(sup));
    await ctx.close();
  } else console.log('SKIP AC-13 no LAN IPv4 interface');
  for (const [n, p] of [['A', A], ['B', B], ['C', C], ['TV', tv]]) check('no page errors on ' + n, p.__errs.length === 0, JSON.stringify(p.__errs));

  await browser.close(); bots.forEach(s => s.close()); ctl.close();
  const failed = results.filter(r => !r.ok).length;
  console.log('SUMMARY ' + (results.length - failed) + '/' + results.length + ' pass');
  return failed ? 1 : 0;
}

main().then(c => process.exit(c)).catch(e => { console.log('SCRIPT-ERR ' + (e && e.stack || e)); process.exit(1); });
