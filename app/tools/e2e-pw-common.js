// Shared setup for the Playwright e2e runners (tools/e2e-pw.js, tools/e2e-pw-voice.js):
// in-process server + mod socket, 12 phones joined through the form, the mod3d page, game start.
// No side effect at require time. Call initEnv(defaultPort) BEFORE startRoom() (the server reads PORT when required).
const path = require('path');
const N = 12;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadPw() {
  for (const d of [process.env.PLAYWRIGHT_DIR, null]) {
    for (const m of ['playwright-core', 'playwright']) {
      try { return require(d ? path.join(d, m) : m); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
    }
  }
  return null;
}

function initEnv(defaultPort) {
  process.env.PORT = process.env.E2E_PORT || defaultPort;
  delete process.env.HTTPS_KEY; delete process.env.HTTPS_CERT;
}

function makeChecker() {
  const results = [];
  const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' :: ' + detail : '')); };
  return { results, check };
}

function makeWatch(errs) {
  return (page, tag) => {
    page.on('pageerror', e => errs.push(`${tag}: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|WebGL|GPU|AudioContext/i.test(m.text())) errs.push(`${tag} console: ${m.text().slice(0, 200)}`); });
    page.on('response', r => { if (r.status() >= 400 && !/favicon\.ico$/.test(r.url())) errs.push(`${tag} HTTP ${r.status()} ${r.url()}`); });
  };
}

async function startRoom() {
  const { io: Client } = require('socket.io-client');
  const { httpServer, io, rooms } = require('../src/server/index');
  const { createPushState } = require('../src/server/rooms');
  const pushState = createPushState(io);
  const base = 'http://localhost:' + process.env.PORT;
  await new Promise(r => (httpServer.listening ? r() : httpServer.once('listening', r)));
  const mod = Client(base, { forceNew: true });
  await new Promise(r => mod.on('connect', r));
  const created = await new Promise(r => mod.emit('mod:create', null, r));
  const act = (action, payload) => new Promise(r => mod.emit('mod:do', { action, payload }, r));
  return {
    base, code: created.code, modToken: created.modToken, mod, act, httpServer, io, rooms, pushState,
    close() { mod.close(); io.close(); httpServer.close(); },
  };
}

function launchBrowser(pw, extraArgs) {
  return pw.chromium.launch({ headless: !process.env.E2E_HEADED, executablePath: process.env.CHROME || undefined, args: extraArgs });
}

// o: {watch, contextOptions?, onPage?(page, ctx, index, t0)}; returns {pages, ctxs}
async function joinPlayers(browser, room, o) {
  const pages = [], ctxs = [];
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, ...(o.contextOptions || {}) });
    const t0 = Date.now();
    const page = await ctx.newPage();
    if (o.onPage) await o.onPage(page, ctx, i, t0);
    o.watch(page, 'p' + i);
    await page.goto(`${room.base}/?room=${room.code}`);
    await page.fill('#jname', 'P' + String(i + 1).padStart(2, '0'));
    await page.click('button:has-text("เข้าห้อง")');
    await page.waitForFunction(() => typeof S !== 'undefined' && S && S.phase === 'LOBBY', null, { timeout: 15000 });
    pages.push(page); ctxs.push(ctx);
  }
  return { pages, ctxs };
}

async function openMod3d(browser, room, o) {
  const mctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(o.contextOptions || {}) });
  const t0 = Date.now();
  const m3 = await mctx.newPage();
  if (o.onPage) await o.onPage(m3, mctx, 'mod', t0);
  o.watch(m3, 'mod3d');
  await mctx.addInitScript(v => localStorage.setItem('dn-mod', v), JSON.stringify({ code: room.code, modToken: room.modToken }));
  await m3.goto(`${room.base}/mod3d.html`);
  await sleep(1500);
  return { mctx, m3 };
}

async function clickIf(page, sel) { const l = page.locator(sel).first(); if (await l.count() && await l.isEnabled()) { await l.click(); return true; } return false; }

async function startGame(room, m3, check) {
  const r0 = await room.act('start');
  check('game started', r0 && r0.ok, r0 && r0.error);
  // mod3d builds the scene in boot(st) on the first game state, and only then sets its test hook
  const booted = await m3.waitForFunction(() => !!window.__mod3d && window.__mod3d.desks.length > 0, null, { timeout: 60000 }).then(() => true, () => false);
  check('mod3d booted the 3D scene with a desk per player', booted && (await m3.evaluate(() => window.__mod3d.desks.length)) === N);
  // the TV needs one click to unlock audio (browser autoplay rule), like the Moderator does on a real screen
  const b = m3.locator('#sgBtn');
  if (await b.isVisible().catch(() => false)) { await b.click(); await sleep(800); }
  const R = room.rooms.get(room.code), G = R.game;
  // the browser seat order matches join order; read seat ids by name
  const seat = i => G.players.findIndex(p => p.name === 'P' + String(i + 1).padStart(2, '0'));
  return { room: R, G, seat };
}

module.exports = { N, sleep, loadPw, initEnv, makeChecker, makeWatch, startRoom, launchBrowser, joinPlayers, openMod3d, startGame, clickIf };
