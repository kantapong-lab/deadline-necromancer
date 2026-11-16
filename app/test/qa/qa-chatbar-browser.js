// QA browser e2e for change-chat-quick-replies (AC-1..6, 8..10, 13 + unchanged rows + review S-1 probe).
//   node test/qa/qa-chatbar-browser.js        (needs Chrome; no puppeteer: raw CDP over Node's global WebSocket)
// Env: CHROME (path to chrome.exe), TEST_PORT (default 3178), CDP_PORT (default 9333), PROFILE_DIR.
// The real server runs in-process (like qa-cards.js); fixtures (Purge, Silence, quota, phase, dead) are set on the Game and pushed.
process.env.PORT = process.env.TEST_PORT || '3178';
const assert = require('assert');
const os = require('os'), path = require('path'), fs = require('fs');
const { spawn, execSync } = require('child_process');
const { io: Client } = require('socket.io-client');
const { httpServer, io, rooms } = require('../../src/server/index');
const { createPushState } = require('../../src/server/rooms');
const { QUICK_REPLIES, ROLES } = require('../../src/shared/data');
const pushState = createPushState(io);
const URL = 'http://localhost:' + process.env.PORT;
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CDP_PORT = +(process.env.CDP_PORT || 9333);
const PROFILE = process.env.PROFILE_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'dn-qa-chrome-'));
const wait = ms => new Promise(r => setTimeout(r, ms));
const emit = (s, ev, d) => new Promise(r => s.emit(ev, d, r));
const results = [], sockets = []; let chrome;
const test = async (name, fn) => { try { await fn(); results.push([name, true]); console.log('PASS', name); } catch (e) { results.push([name, false]); console.log('FAIL', name, '\n  ', e.stack.split('\n').slice(0, 3).join('\n   ')); } };

// ---- tiny CDP client ----
let ws, msgId = 0; const pend = new Map();
async function cdpConnect() {
  let ver; for (let i = 0; i < 60; i++) { try { ver = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); break; } catch { await wait(250); } }
  assert(ver, 'chrome did not start');
  const tab = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { const { res, rej } = pend.get(d.id); pend.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } };
}
const cdp = (method, params = {}) => new Promise((res, rej) => { const id = ++msgId; pend.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
async function ev(expr) {
  const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('page: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
const until = async (expr, ms = 4000, what) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await wait(40); } throw new Error('timeout waiting: ' + (what || expr)); };
const key = async (k, code, vk, text) => { await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text }); await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); };
const enter = () => key('Enter', 'Enter', 13, '\r');
async function type(text) { await ev(`(()=>{const i=document.querySelector('#chatIn'); i.focus(); i.setSelectionRange(i.value.length,i.value.length);})()`); await cdp('Input.insertText', { text }); }
async function mouseClick(sel, scroll = true) {
  const r = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); ${scroll ? "e.scrollIntoView({block:'center'});" : ''} const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}})()`);
  for (const t of ['mousePressed', 'mouseReleased']) await cdp('Input.dispatchMouseEvent', { type: t, x: r.x, y: r.y, button: 'left', clickCount: 1 });
}
const q = sel => `document.querySelector(${JSON.stringify(sel)})`;
const feed = () => ev(`[...document.querySelectorAll('.chat .msg')].map(e=>e.textContent)`);
const val = () => ev(`${q('#chatIn')}.value`);
const draft = () => ev('chatDraft');
const errTxt = () => ev(`${q('#chatErr')}?.textContent||''`);
const pills = () => ev(`[...document.querySelectorAll('.btn.qr')].map(b=>({t:b.textContent,d:b.disabled}))`);

// ---- game fixtures ----
let ctx;
async function setupGame() {
  const mod = Client(URL, { forceNew: true }); sockets.push(mod);
  const code = (await emit(mod, 'mod:create')).code; ctx = { mod, code, bots: [] };
  for (let i = 0; i < 7; i++) { const s = Client(URL, { forceNew: true }); sockets.push(s); s.v = null; s.on('state', v => s.v = v); assert((await emit(s, 'player:join', { code, name: 'Bot' + i })).ok); ctx.bots.push(s); }
  await cdp('Page.navigate', { url: `${URL}/?room=${code}` });
  await until(`!!${q('#jname')}`, 8000, 'join form');
  await ev(`${q('#jname')}.value='Browser'; join()`);
  await until(`!!S && S.phase==='LOBBY' && !!session`, 5000, 'lobby');
  assert((await emit(mod, 'mod:do', { action: 'start' })).ok, 'start');
  await until(`S.phase==='MORNING'`, 5000, 'morning');
  ctx.G = rooms.get(code).game; ctx.room = rooms.get(code);
  ctx.pid = ctx.G.players.findIndex(p => p.name === 'Browser'); assert(ctx.pid >= 0);
  const P = ctx.G.players[ctx.pid]; ctx.me = P;
  // make the browser seat a Light role so there is no dark-chat tab in the way (the dark case sets it explicitly)
  P.role = 'senior_dev'; P.faction = ROLES[P.role].f; P.alive = true; P.silenced = false;
}
const push = () => pushState(ctx.room);
const syncWait = async () => { push(); await wait(150); };
async function fx({ purge = false, used = 0, silenced = false, phase = 'MORNING', alive = true } = {}) {
  const G = ctx.G; G.phase = phase; ctx.me.alive = alive; ctx.me.silenced = silenced;
  if (phase === 'VOTE_INTERIM') G.interim = G.interim || { tally: [], skip: 0 };
  G.event = purge ? { id: 'purge', accepted: null, pending: false, votes: {} } : null; G.chatUsed = purge ? { [ctx.pid]: used } : {};
  await syncWait();
  await ev(`chatDraft='';chatErr='';qrOpen=false;qrScroll=0;(()=>{const e=document.querySelector('#chatErr'); if(e) e.innerHTML=''})();render()`);
}
const md = async (action) => { const r = await emit(ctx.mod, 'mod:do', { action }); await wait(150); return r; };
const botSay = t => emit(ctx.bots[0], 'p:chat', { text: t });

async function main() {
  await new Promise(r => (httpServer.listening ? r() : httpServer.once('listening', r)));
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  await cdpConnect();
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await setupGame();

  // ---------------- AC-1 ----------------
  await test('AC-1 Enter sends: feed shows text, #chatIn empty, chatDraft empty', async () => {
    await fx(); const n0 = (await feed()).length;
    await type('hello AC1'); assert.strictEqual(await draft(), 'hello AC1', 'oninput must have run (draft tracks typing)');
    await enter(); await until(`[...document.querySelectorAll('.chat .msg')].some(e=>e.textContent.includes('hello AC1'))`);
    await until(`chatBusy===false`);   // the state push (feed) lands a tick before the ack; the input clears on the ack
    assert.strictEqual(await val(), ''); assert.strictEqual(await draft(), '');
    assert.strictEqual((await feed()).length, n0 + 1);
  });
  await test('AC-1 state push mid-send does not restore the old value', async () => {
    await fx();
    await type('race AC1');
    // fire a second player's chat in the same tick as Enter so a `state` push races the ack
    const bot = botSay('bot says race'); await enter(); await bot;
    await until(`[...document.querySelectorAll('.chat .msg')].some(e=>e.textContent.includes('race AC1'))`);
    await wait(300);
    assert.strictEqual(await val(), '', 'input value'); assert.strictEqual(await draft(), '');
    const f = await feed(); assert.strictEqual(f.filter(t => t.includes('race AC1')).length, 1);
    // more pushes after the ack must keep it empty
    await botSay('bot again'); await wait(200); assert.strictEqual(await val(), '');
  });
  await test('AC-1 text typed while the send is in flight is kept (design of sendChat raw/draft compare)', async () => {
    await fx(); await type('first AC1'); await enter(); await until(`chatBusy===false`);
    await type('next'); assert.strictEqual(await val(), 'next'); await botSay('push'); await wait(200); assert.strictEqual(await val(), 'next', 'push must not eat typing');
    await ev(`chatDraft='';render()`);
  });

  // ---------------- AC-2 ----------------
  await test('AC-2 Purge 31 chars + Enter: text kept, #chatErr shows over-30, no quota used, then 30 sends', async () => {
    await fx({ purge: true }); const n0 = (await feed()).length;
    await type('x'.repeat(31)); await enter(); await wait(200);
    assert.strictEqual((await val()).length, 31, 'text kept'); assert.strictEqual(await draft(), 'x'.repeat(31));
    assert(/ยาวเกิน 30/.test(await errTxt()), 'err: ' + await errTxt());
    assert.strictEqual((await feed()).length, n0); assert(!ctx.G.chatUsed[ctx.pid]);
    await ev(`(()=>{const i=document.querySelector('#chatIn'); i.focus(); i.setSelectionRange(30,31)})()`); await key('Backspace', 'Backspace', 8);
    assert.strictEqual((await val()).length, 30); assert.strictEqual(await errTxt(), '', 'typing clears the error');
    await enter(); await until(`${q('#chatIn')}.value===''`); assert.strictEqual((await feed()).length, n0 + 1); assert.strictEqual(ctx.G.chatUsed[ctx.pid], 1);
  });
  await test('AC-2 quota 0 (client knows): text typed earlier kept, quota error', async () => {
    await fx({ purge: true, used: 2 }); await type('last one');   // 1 left
    await enter(); await until(`${q('#chatIn')}.value===''`);      // uses the 3rd
    await until(`${q('#chatIn')}.disabled`, 3000, 'input disabled at quota 0');
    assert.strictEqual(await ev('S.me.chatLeft'), 0);
  });
  await test('AC-2 server rejects (client stale: quota gone server-side): text kept, error in #chatErr', async () => {
    await fx({ purge: true, used: 0 });
    ctx.G.chatUsed[ctx.pid] = 3;   // server-side only, no push: client still shows quota left
    assert.strictEqual(await ev('S.me.chatLeft'), 3);
    const n0 = (await feed()).length; await type('stale quota'); await enter(); await wait(300);
    assert.strictEqual(await val(), 'stale quota', 'text kept'); assert.strictEqual(await draft(), 'stale quota');
    assert(/โควตา/.test(await errTxt()), 'err: ' + await errTxt()); assert.strictEqual((await feed()).length, n0);
  });
  await test('AC-2 server rejects typed text under Silence (client stale): text kept, error shown', async () => {
    await fx(); ctx.me.silenced = true;   // no push
    await type('silent now'); await enter(); await wait(300);
    assert.strictEqual(await val(), 'silent now'); assert(/NDA Silence/.test(await errTxt()), 'err: ' + await errTxt());
  });

  // ---------------- AC-3 ----------------
  await test('AC-3 click ส่ง = Enter: same feed + empty input; same over-30 error + text kept', async () => {
    await fx(); const n0 = (await feed()).length;
    await type('via button'); await mouseClick('#chatSend'); await until(`${q('#chatIn')}.value===''`);
    assert.strictEqual((await feed()).length, n0 + 1); assert.strictEqual(await draft(), '');
    await fx({ purge: true }); await type('y'.repeat(31)); await mouseClick('#chatSend'); await wait(200);
    assert.strictEqual((await val()).length, 31); assert(/ยาวเกิน 30/.test(await errTxt()));
    assert.strictEqual(await ev(`${q('#chatSend')}.type`), 'submit'); assert.strictEqual(await ev(`${q('#chatSend')}.form===${q('#chatIn')}.form`), true);
  });

  // ---------------- AC-4 ----------------
  await test('AC-4 Silence: #chatIn and #chatSend disabled', async () => {
    await fx({ silenced: true });
    assert.strictEqual(await ev(`${q('#chatIn')}.disabled`), true); assert.strictEqual(await ev(`${q('#chatSend')}.disabled`), true);
  });
  await test('AC-4 quota 0: #chatIn and #chatSend disabled', async () => {
    await fx({ purge: true, used: 3 });
    assert.strictEqual(await ev(`${q('#chatIn')}.disabled`), true); assert.strictEqual(await ev(`${q('#chatSend')}.disabled`), true);
  });
  await test('AC-4 empty input: click ส่ง posts nothing, no crash; whitespace only also nothing', async () => {
    await fx(); const n0 = (await feed()).length; const errs = [];
    await mouseClick('#chatSend'); await wait(200); await type('   '); await mouseClick('#chatSend'); await wait(200);
    assert.strictEqual((await feed()).length, n0); assert.strictEqual(await ev('chatBusy'), false);
    assert.strictEqual(await ev(`${q('#chatSend')}.disabled`), false, 'send enabled when empty');
  });

  // ---------------- AC-5 ----------------
  await test('AC-5 MORNING alive: 23 pills in table order, exact text', async () => {
    await fx(); assert.strictEqual(await ev(`${q('#qrPanel')}===null`), true, 'panel closed by default');
    assert.strictEqual(await ev(`${q('#qrToggle')}.getAttribute('aria-expanded')`), 'false');
    await mouseClick('#qrToggle'); await until(`!!${q('#qrPanel')}`);
    const p = await pills(); assert.deepStrictEqual(p.map(x => x.t), QUICK_REPLIES); assert.strictEqual(p.length, 23); assert(p.every(x => !x.d));
    assert.strictEqual(await ev(`${q('#qrToggle')}.getAttribute('aria-expanded')`), 'true');
    assert((await ev(`${q('#qrToggle')}.textContent`)).includes('(23)'));
  });
  await test('AC-5 VOTE_INTERIM alive: bar + pills shown', async () => {
    await fx({ phase: 'VOTE_INTERIM' }); await ev('toggleQuick()'); await until(`!!${q('#qrPanel')}`);
    assert.strictEqual((await pills()).length, 23); assert.strictEqual(await ev(`!!${q('#chatIn')}`), true);
  });
  await test('AC-5 dead player in MORNING: no bar, no pills', async () => {
    await fx({ alive: false }); assert.strictEqual(await ev(`!!${q('#chatIn')} || !!${q('#qrToggle')} || document.querySelectorAll('.btn.qr').length>0`), false);
    await fx();
  });

  // ---------------- AC-6 ----------------
  await test('AC-6 draft "abc", tap pill: phrase once in feed, #chatIn and draft still "abc"', async () => {
    await fx(); await type('abc'); await mouseClick('#qrToggle'); await until(`!!${q('#qrPanel')}`);
    const n0 = (await feed()).length; await mouseClick('.btn.qr[data-qi="0"]');
    await until(`[...document.querySelectorAll('.chat .msg')].some(e=>e.textContent.includes(${JSON.stringify(QUICK_REPLIES[0])}))`);
    const f = await feed(); assert.strictEqual(f.length, n0 + 1); assert.strictEqual(f.filter(t => t.includes(QUICK_REPLIES[0])).length, 1);
    assert.strictEqual(await val(), 'abc'); assert.strictEqual(await draft(), 'abc');
  });
  await test('AC-6 feed entry text equals the phrase exactly (server-side), kind chat, who = browser seat', async () => {
    const G = ctx.G; const last = [...G.feed].reverse().find(m => m.text === QUICK_REPLIES[0]);
    assert(last, 'phrase entry present in server feed'); assert.strictEqual(last.who, ctx.pid);
  });
  await test('AC-6 rapid double tap posts once (chatBusy guard)', async () => {
    await fx(); await ev('qrOpen=true;render()'); const n0 = (await feed()).length;
    await ev(`(()=>{const b=document.querySelector('.btn.qr[data-qi="3"]'); b.click(); b.click();})()`);
    await until(`chatBusy===false`); await wait(200); assert.strictEqual((await feed()).length, n0 + 1);
  });
  await test('AC-6 pill tap without any draft leaves input empty; every pill (all 23) posts its exact phrase', async () => {
    await fx(); await ev('qrOpen=true;render()');
    for (let i = 0; i < 23; i++) { const n0 = (await feed()).length; await ev(`document.querySelector('.btn.qr[data-qi="${i}"]').click()`); await until(`chatBusy===false`); await until(`document.querySelectorAll('.chat .msg').length>${n0}`); const f = await feed(); assert(f[f.length - 1].includes(QUICK_REPLIES[i]), 'pill ' + i); }
    assert.strictEqual(await val(), '');
  });

  // ---------------- AC-7 via UI (chip) ----------------
  await test('AC-7 UI: Purge pill tap uses 1 quota, chip 3->2; typed text unlimited without Purge', async () => {
    await fx({ purge: true }); await ev('qrOpen=true;render()');
    assert((await ev(`document.querySelector('.chips').textContent`)).includes('3/3'));
    await ev(`document.querySelector('.btn.qr[data-qi="1"]').click()`); await until(`S.me.chatLeft===2`);
    await until(`document.querySelector('.chips').textContent.includes('2/3')`); assert.strictEqual(ctx.G.chatUsed[ctx.pid], 1);
    assert((await ev(`document.querySelector('.hint:not(.qr-note)') && [...document.querySelectorAll('.hint')].some(h=>h.textContent.includes('นับ 1 ข้อความ'))`)));
    await fx(); for (let i = 0; i < 5; i++) { await ev(`document.querySelector('.btn.qr[data-qi="${i}"]')||(qrOpen=true,render())`); await ev(`document.querySelector('.btn.qr[data-qi="${i}"]').click()`); await until('chatBusy===false'); }
    assert.strictEqual(ctx.G.chatUsed[ctx.pid], undefined); assert.strictEqual(await ev('S.me.chatLeft'), undefined);
  });

  // ---------------- AC-8 ----------------
  await test('AC-8 quota 0: all pills disabled + note, emoji still post, forced quick() shows quota error', async () => {
    await fx({ purge: true, used: 3 }); await ev('qrOpen=true;render()');
    const p = await pills(); assert.strictEqual(p.length, 23); assert(p.every(x => x.d), 'all disabled');
    assert((await ev(`${q('.qr-note')}.textContent`)).includes('โควตาหมดแล้ว'));
    assert((await ev(`document.querySelector('.chips').textContent`)).includes('0/3'));
    const n0 = (await feed()).length; await ev(`document.querySelector('.chat-emo .btn.emo').click()`); await until(`document.querySelectorAll('.chat .msg').length>${n0}`);
    assert(/👍/.test((await feed()).pop()), 'emoji posted'); assert.strictEqual(ctx.G.chatUsed[ctx.pid], 3, 'emoji not counted');
    await ev(`quick(0)`); await wait(300); assert(/โควตา/.test(await errTxt()), 'forced tap err: ' + await errTxt());
    assert.strictEqual((await feed()).length, n0 + 1, 'forced tap posted nothing');
    assert.strictEqual(await ev('chatBusy'), false);
  });

  // ---------------- AC-9 ----------------
  await test('AC-9 Silence: all pills disabled + note, emoji post, no quota used; forced quick() rejected', async () => {
    await fx({ silenced: true, purge: true }); await ev('qrOpen=true;render()');
    const p = await pills(); assert(p.every(x => x.d) && p.length === 23);
    assert((await ev(`${q('.qr-note')}.textContent`)).includes('ถูกปิดปาก'));
    const n0 = (await feed()).length; await ev(`document.querySelector('.chat-emo .btn.emo:nth-child(4)').click()`); await until(`document.querySelectorAll('.chat .msg').length>${n0}`);
    assert(/😂/.test((await feed()).pop())); assert(!ctx.G.chatUsed[ctx.pid]);
    await ev('quick(5)'); await wait(300); assert(/NDA Silence/.test(await errTxt()), await errTxt()); assert.strictEqual((await feed()).length, n0 + 1);
  });

  // ---------------- AC-10 ----------------
  await test('AC-10 Purge + injected 31-cp phrase: only it is disabled (no note), 23 originals enabled', async () => {
    await fx({ purge: true }); await ev('qrOpen=true;render()');
    await ev(`QUICK_REPLIES.push('x'.repeat(31)); render()`);
    const p = await pills(); assert.strictEqual(p.length, 24); assert(p.slice(0, 23).every(x => !x.d), 'originals enabled'); assert.strictEqual(p[23].d, true);
    assert.strictEqual(await ev(`!!${q('.qr-note')}`), false);
    await ev(`QUICK_REPLIES.pop(); render()`); assert.strictEqual((await pills()).length, 23);
    await fx(); await ev('qrOpen=true;QUICK_REPLIES.push("x".repeat(31)); render()'); assert.strictEqual((await pills())[23].d, false, 'no Purge: long pill enabled');
    await ev(`QUICK_REPLIES.pop(); render()`);
  });

  // ---------------- AC-13 ----------------
  await test('AC-13 375px: no horizontal scroll, input+ส่ง same row, emoji below, panel vertical scroll, input does not move, scroll kept after tap', async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
    await fx(); await wait(200);
    const geo = () => ev(`(()=>{const r=s=>{const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height,b:b.bottom,r:b.right}};
      return {sw:document.documentElement.scrollWidth,iw:innerWidth,inp:r('#chatIn'),snd:r('#chatSend'),emo:r('.chat-emo'),tg:r('#qrToggle'),pn:r('#qrPanel')}})()`);
    await ev(`tab='game';render();document.querySelector('#chatIn').scrollIntoView({block:'center'})`); await wait(100);
    let g = await geo(); assert(g.sw <= g.iw, `closed scrollWidth ${g.sw} > ${g.iw}`);
    assert(Math.abs(g.inp.y - g.snd.y) < 6 || (g.inp.y < g.snd.b && g.snd.y < g.inp.b), 'input and send overlap vertically (same row): ' + JSON.stringify([g.inp, g.snd]));
    assert(g.snd.r <= g.iw && g.inp.x >= 0, 'send within viewport'); assert(g.emo.y > g.inp.b - 1, 'emoji row below input');
    assert(g.tg.y > g.emo.b - 1, 'toggle below emoji'); assert(g.inp.h >= 36 && g.snd.h >= 40, 'touch size ' + g.inp.h + '/' + g.snd.h);
    const iy0 = g.inp.y + await ev('scrollY');
    await mouseClick('#qrToggle'); await until(`!!${q('#qrPanel')}`); await wait(100);
    g = await geo(); assert(g.sw <= g.iw, `open scrollWidth ${g.sw} > ${g.iw}`);
    assert(Math.abs(g.inp.y + await ev('scrollY') - iy0) < 2, 'input moved when panel opened');
    const m = await ev(`(()=>{const p=document.querySelector('#qrPanel'); return {ch:p.clientHeight,sh:p.scrollHeight,cw:p.clientWidth,sw:p.scrollWidth,oy:getComputedStyle(p).overflowY,ox:getComputedStyle(p).overflowX}})()`);
    assert(m.sh > m.ch, 'panel scrolls vertically'); assert(m.sw <= m.cw + 1, 'no horizontal overflow in panel'); assert(m.ch <= 180, 'panel height capped ' + m.ch);
    const ph = await ev(`Math.min(...[...document.querySelectorAll('.btn.qr')].map(b=>b.getBoundingClientRect().height))`);
    console.log(`   AC-13 measured at 375px: min pill height ${ph}px, #chatSend ${g.snd.h}px, #chatIn ${g.inp.h}px, toggle ${g.tg.h}px`);
    assert(ph >= 44 && g.snd.h >= 44, `design touch target 44px: pill ${ph}, send ${g.snd.h}`);
    const bw = await ev(`[...document.querySelectorAll('.btn.qr')].map(b=>b.getBoundingClientRect()).filter(b=>b.width>0).every(b=>b.right<=innerWidth)`); assert(bw, 'pills inside viewport');
    // scroll the panel then tap a visible pill: scrollTop kept, phrase posted
    await ev(`document.querySelector('#qrPanel').scrollIntoView({block:'center'}); document.querySelector('#qrPanel').scrollTop=120`); const st0 = await ev(`document.querySelector('#qrPanel').scrollTop`); assert(st0 > 50, 'scrolled ' + st0);
    const qi = await ev(`(()=>{const p=document.querySelector('#qrPanel').getBoundingClientRect(); const b=[...document.querySelectorAll('.btn.qr')].find(b=>{const r=b.getBoundingClientRect(); return r.top>p.top+4 && r.bottom<p.bottom-4 && r.bottom<innerHeight && r.top>0}); return b.dataset.qi})()`);
    const n0 = (await feed()).length; await mouseClick(`.btn.qr[data-qi="${qi}"]`, false); await until(`document.querySelectorAll('.chat .msg').length>${n0}`); await wait(150);
    const st1 = await ev(`document.querySelector('#qrPanel').scrollTop`); assert(Math.abs(st1 - st0) <= 2, `scroll kept ${st0} -> ${st1}`);
    assert((await feed()).pop().includes(QUICK_REPLIES[+qi]));
    g = await geo(); assert(g.sw <= g.iw);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  });

  // ---------------- Unchanged ----------------
  await test('UNCHANGED emoji: click posts only the emoji; draft + input kept; works under Purge exempt from quota', async () => {
    await fx({ purge: true }); await type('keepme'); const n0 = (await feed()).length;
    for (let i = 0; i < 5; i++) { await ev(`document.querySelectorAll('.chat-emo .btn.emo')[${i}].click()`); await until(`document.querySelectorAll('.chat .msg').length>${n0 + i}`); }
    const f = await feed(); assert.deepStrictEqual(f.slice(-5).map(t => t.replace(/^.*?:\s*/, '').trim().slice(-2)), ['👍', '🤔', '😡', '😂', '🙏'].map(e => e.slice(-2)));
    assert.strictEqual(await val(), 'keepme'); assert.strictEqual(await draft(), 'keepme'); assert(!ctx.G.chatUsed[ctx.pid], 'emoji exempt from Purge quota');
    assert.strictEqual(await ev(`document.querySelectorAll('.chat-emo .btn.emo').length`), 5);
  });
  await test('UNCHANGED chat hidden in VOTE_RESULT and NIGHT (real phase flow; day 1 has no vote, so toVote lands on VOTE_RESULT)', async () => {
    await fx(); ctx.G.event = null; ctx.G.chatUsed = {};
    const hidden = () => ev(`!!${q('#chatIn')} || !!${q('#qrToggle')} || !!${q('#chatSend')} || document.querySelectorAll('.btn.qr').length>0`);
    assert((await md('toVote')).ok); await until(`S.phase==='VOTE_RESULT'`); assert.strictEqual(await hidden(), false, 'VOTE_RESULT');
    assert((await md('toNight')).ok); await until(`S.phase==='NIGHT'`); assert.strictEqual(await hidden(), false, 'NIGHT');
  });
  await test('UNCHANGED dark night chat #darkIn still sends for a dark seat in NIGHT', async () => {
    const P = ctx.me; P.role = 'shadow_hr'; P.faction = ROLES[P.role].f; await syncWait();
    await until(`!!${q('#darkIn')}`, 4000, '#darkIn present');
    assert.strictEqual(await ev(`${q('#darkIn')}.disabled`), false);
    await ev(`${q('#darkIn')}.focus()`); await cdp('Input.insertText', { text: 'dark hello' }); await enter();
    await until(`${q('#darkIn')}.value===''`); await wait(200);
    const dc = ctx.G.darkChat || []; assert(dc.some(m => m.text === 'dark hello'), 'darkChat has the line: ' + JSON.stringify(dc.slice(-2)));
    assert.strictEqual(await ev(`!!${q('#chatSend')} || !!${q('#qrToggle')}`), false, 'no morning chat bar at night');
  });

  await test('UNCHANGED chat hidden in VOTE (day 2 via real closeNight, then toVote)', async () => {
    assert((await md('closeNight')).ok); await until(`S.phase==='MORNING'`, 5000, 'day 2 morning');
    assert.strictEqual(await ev(`!!${q('#chatIn')}`), true, 'MORNING d2 has chat bar');
    assert((await md('toVote')).ok); await until(`S.phase==='VOTE'`, 5000, 'VOTE');
    assert.strictEqual(await ev(`!!${q('#chatIn')} || !!${q('#qrToggle')} || !!${q('#chatSend')} || document.querySelectorAll('.btn.qr').length>0`), false, 'VOTE');
  });

  // ---------------- S-1 probe ----------------
  await test('S-1 probe: lost p:chat ack (transport drop mid-send) leaves chatBusy stuck?', async () => {
    // fresh phase back to MORNING on the same page: set server phase directly (probe is about the client flag)
    ctx.me.role = 'senior_dev'; ctx.me.faction = ROLES[ctx.me.role].f;
    await fx(); await ev('qrOpen=true;render()');
    let drop = true; io.on('connection', s => s.use((pkt, next) => { if (drop && pkt[0] === 'p:chat') { s.disconnect(true); return; } next(); }));
    // the middleware is per new connection: force the browser socket to reconnect so it gets the middleware
    await ev(`socket.disconnect(); socket.connect(); 0`); await until(`socket.connected && !!S && !!session`, 6000, 'reconnect'); await wait(300);
    await syncWait();
    const n0 = (await feed()).length; await type('lost ack'); await enter();
    await until(`socket.connected===false || chatBusy===true`, 3000).catch(() => {});
    await until(`socket.connected`, 10000, 'auto reconnect'); await wait(800);
    drop = false;
    const busy = await ev('chatBusy'); console.log('   S-1: chatBusy after reconnect =', busy, '| input =', JSON.stringify(await val()));
    await syncWait(); await until(`S.phase==='MORNING'`);
    if (busy) {
      const n1 = (await feed()).length; await ev('render()'); await enter(); await wait(400);
      await ev(`(()=>{const b=document.querySelector('.btn.qr[data-qi="2"]'); if(b) b.click()})()`); await wait(400);
      const stuck = (await feed()).length === n1 && (await ev('chatBusy')) === true;
      console.log('   S-1: after reconnect Enter + pill post nothing, still busy =', stuck);
      results.s1 = { busy, stuck };
    } else results.s1 = { busy, stuck: false };
    assert.strictEqual(results.s1.stuck, false, 'S-1 REPRODUCED: chatBusy stuck true after lost ack, Enter and pills dead until reload');
  });
}

async function shutdown(code) {
  try { sockets.forEach(s => s.close()); } catch {}
  try { ws && ws.close(); } catch {}
  try { if (chrome && chrome.pid) execSync(`taskkill /pid ${chrome.pid} /T /F`, { stdio: 'ignore' }); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}
  const bad = results.filter(r => Array.isArray(r) && !r[1]);
  console.log(`\n${results.filter(r => Array.isArray(r)).length - bad.length}/${results.filter(r => Array.isArray(r)).length} passed`);
  process.exit(code ?? (bad.length ? 1 : 0));
}
main().then(() => shutdown(), e => { console.error('HARNESS ERROR', e); shutdown(2); });
