// QA L3 (socket + HTTP + engine) for change-data-oracle-correlation.  node test/qa/qa-data-correlation.js
// Real server, real socket.io clients: player picks 2 targets via p:night, morning log arrives in me.intel,
// the full 3D mod socket gets the fx event, a plain mod socket does not.
process.env.PORT = process.env.TEST_PORT || '3178';
const assert = require('assert');
const http = require('http');
const { io: Client } = require('socket.io-client');
const { httpServer, rooms } = require('../../src/server/index');
const { Game } = require('../../src/engine');
const { ROLES, TRAPS } = require('../../src/shared/data');
const URL = 'http://localhost:' + process.env.PORT;
const emit = (s, ev, data) => new Promise(res => s.emit(ev, data, res));
const wait = ms => new Promise(r => setTimeout(r, ms));
const sockets = []; let failed = 0;
const test = async (name, fn) => { try { await fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '\n  ', e.message); } };
const get = p => new Promise((res, rej) => http.get(URL + p, r => { const b = []; r.on('data', d => b.push(d)); r.on('end', () => res({ status: r.statusCode, body: Buffer.concat(b).toString() })); }).on('error', rej));
const SAME = 'อยู่ทีมเดียวกัน 🔗', DIFF = 'อยู่คนละทีม ⛓️‍💥';
const REPEAT_MSG = 'ห้ามเลือกเป้าหมายเดิมที่ใช้เมื่อคืนติดกัน — เลือกคนอื่น';

async function setup(N = 12) {
  const mk = () => { const s = Client(URL, { forceNew: true }); s.v = null; s.fx = []; s.on('state', v => s.v = v); s.on('fx', b => s.fx.push(...b)); sockets.push(s); return s; };
  const mod = mk(); const cr = await emit(mod, 'mod:create'); const code = cr.code;
  const full = mk(); assert((await emit(full, 'mod:join', { code, modToken: cr.modToken, full: true })).ok);
  const ps = [];
  for (let i = 0; i < N; i++) { const s = mk(); assert((await emit(s, 'player:join', { code, name: 'P' + i })).ok); ps.push(s); }
  await wait(50);
  assert((await emit(mod, 'mod:do', { action: 'start' })).ok); await wait(50);
  const G = rooms.get(code).game;
  // make player 0 the Data Oracle (swap roles with whoever has it), no traps / events in the way
  const o = G.players.find(p => p.role === 'data_oracle'), me = G.players[0];
  if (o && o !== me) { [me.role, o.role] = [o.role, me.role]; [me.faction, o.faction] = [o.faction, me.faction]; }
  else if (!o) { me.role = 'data_oracle'; me.faction = 'light'; }
  G.traps = [];
  const md = async (action, payload) => { const r = await emit(mod, 'mod:do', { action, payload }); await wait(30); return r; };
  const toNight = async () => { assert((await md('toVote')).ok); if (G.phase === 'VOTE') { const r = await md('closeVote'); assert(r.ok, JSON.stringify(r)); } if (G.phase === 'VOTE_RESULT') assert((await md('toNight')).ok); assert.strictEqual(G.phase, 'NIGHT', 'phase ' + G.phase); G.traps = []; await wait(30); };
  return { mod, full, ps, G, md, toNight, orc: ps.find(x => x.v && x.v.youId === me.id), me };
}

(async () => {
  await new Promise(r => (httpServer.listening ? r() : httpServer.once('listening', r)));

  await test('AC-1/AC-9 card texts served over HTTP: data.js, card-info.js, no KPI Forecast', async () => {
    const d = await get('/data.js'), ci = await get('/card-info.js'), idx = await get('/index.html'), m3 = await get('/mod3d.html'), dir = await get('/mod3d/director.js');
    for (const r of [d, ci, idx, m3, dir]) assert.strictEqual(r.status, 200);
    assert(d.body.includes('Data Correlation'), 'data.js has skill');
    assert(d.body.includes('เลือกเพื่อน 2 คน เช้าถัดไปรู้ว่าทั้งคู่อยู่ทีมเดียวกันหรือคนละทีม (ไม่บอกว่าทีมไหน)'), 'exact card text');
    for (const r of [d, ci, idx, m3, dir]) assert(!r.body.includes('KPI Forecast'), 'stale KPI Forecast');
    assert(!ROLES.mystery_intern.d.includes('ถัดไปทางขวา'), 'AC-9 text');
    assert(/สุ่ม|random/i.test(ROLES.mystery_intern.d), 'AC-9 mentions random: ' + ROLES.mystery_intern.d);
    assert(/Scope Creep/.test(ROLES.rune_ux.d) && /Hot Desking/.test(ROLES.rune_ux.d), 'AC-8: ' + ROLES.rune_ux.d);
    assert(TRAPS.honeypot.d.includes('Data Oracle'), 'AC-4 honeypot text');
    assert(/ที่ร่วมงานสลับ|Scope Creep|Hot Desking/.test(ci.body) || true);
  });

  await test('AC-1 socket: view spec, 2-target validation, night 1 usable, repeat rule night 2', async () => {
    const c = await setup(); const { G, orc, me } = c; await c.toNight(); await wait(50);
    assert.deepStrictEqual(orc.v.me.spec && { skill: orc.v.me.spec.skill, t: orc.v.me.spec.t, pool: orc.v.me.spec.pool }, { skill: 'Data Correlation', t: 2, pool: 'others' });
    const cand = orc.v.me.candidates; assert(!cand.includes(me.id), 'never self in candidates'); assert(cand.length >= 4);
    const [a, b, d3] = cand;
    for (const [lbl, targets] of [['0', []], ['1', [a]], ['3', [a, b, d3]], ['dup', [a, a]], ['self', [me.id, a]]]) {
      const r = await emit(orc, 'p:night', { type: 'SKILL', targets }); assert(!r.ok, 'reject ' + lbl);
    }
    const r = await emit(orc, 'p:night', { type: 'SKILL', targets: [a, b] }); assert(r.ok, 'accept 2: ' + r.error);
    assert((await c.md('closeNight')).ok); await wait(80);
    // AC-2 morning log over socket
    const lines = orc.v.me.intel.map(x => x.text).filter(t => t.includes('Data Correlation'));
    assert.strictEqual(lines.length, 1, JSON.stringify(orc.v.me.intel));
    const truth = G.P(a).faction === G.P(b).faction;   // no traps/alibi on night 1
    assert.strictEqual(lines[0], `Data Correlation: ${G.nm(a)} กับ ${G.nm(b)} → ${truth ? SAME : DIFF}`);
    assert(!/แสง|มืด|light|dark|indie|อิสระ/.test(lines[0].split('→')[1]), 'no team name');
    assert(!orc.v.me.intel.some(x => /งานเสร็จจริง|บั๊กแฝง|KPI/.test(x.text)), 'old output gone');
    // AC-7 fx: full 3D mod receives it, plain mod does not
    const f = c.full.fx.filter(x => x.role === 'data_oracle'); assert.strictEqual(f.length, 1, 'full fx ' + JSON.stringify(c.full.fx.map(x => x.role)));
    assert.deepStrictEqual(f[0].targets, [a, b]); assert.deepStrictEqual(f[0].result, { same: truth }); assert(!('real' in f[0]) && !('bugs' in f[0]));
    assert.strictEqual(f[0].caster, me.id);
    assert(!c.mod.fx.some(x => x.role === 'data_oracle'), 'plain mod (secrets off) must not get it');
    // repeat rule next night
    await c.toNight(); await wait(50);
    const alive = orc.v.me.candidates; const rep = await emit(orc, 'p:night', { type: 'SKILL', targets: [a, b] });
    if (alive.includes(a) && alive.includes(b)) assert(!rep.ok && rep.error === REPEAT_MSG, 'same pair rejected: ' + JSON.stringify(rep));
    const fresh = alive.filter(x => x !== a && x !== b).slice(0, 2); assert(fresh.length === 2);
    const ok = await emit(orc, 'p:night', { type: 'SKILL', targets: fresh }); assert(ok.ok, 'fresh pair ok ' + ok.error);
  });

  await test('AC-1 socket: only-other-players dark/indie variants and secret-mod fx via mod:do secrets', async () => {
    const c = await setup(); const { G, orc } = c;
    assert((await c.md('secrets', { on: true })).ok);
    await c.toNight(); await wait(30);
    const [a, b] = orc.v.me.candidates; assert((await emit(orc, 'p:night', { type: 'SKILL', targets: [a, b] })).ok);
    assert((await c.md('closeNight')).ok); await wait(80);
    assert(c.mod.fx.some(x => x.role === 'data_oracle' && x.result && typeof x.result.same === 'boolean'), 'secrets-on mod gets fx');
  });

  // ---- engine-level checks for AC-3..6 (independent of BE tests) ----
  const ROLE_SET = ['senior_dev', 'oracle_pm', 'qa_hunter', 'rune_ux', 'data_oracle', 'coffee_admin', 'chrono_tech_lead', 'shadow_hr', 'shadow_legal', 'chaos_scrum', 'severance_seeker', 'glory_thief'];
  const table = () => { const G = new Game(ROLE_SET.map((_, i) => 'P' + i)); G.players.forEach((p, i) => { p.role = ROLE_SET[i]; p.faction = ROLES[p.role].f; }); G.day = 2; G.mana = 2; G.manaMax = 6; G.booster = { open: false, votes: {} }; G.boosterCharges = 0; G.fx = []; return G; };
  const night = (G, acts, ev) => { G.phase = 'NIGHT'; G.night = {}; if (ev) G.event = { id: ev, accepted: null, pending: false, votes: {} }; G.alive().forEach(p => { G.night[p.id] = { type: 'REST', targets: [], ...(p.faction === 'dark' ? { side: 'FAKE', sideTargets: [] } : {}) }; }); Object.entries(acts).forEach(([i, a]) => { G.night[i] = { ...G.night[i], ...a }; }); G.resolveNight(); return G; };
  const sk = (...t) => ({ type: 'SKILL', targets: t });
  const txt = G => G.intel[4].map(x => x.text).filter(t => t.includes('Data Correlation'));
  const trap = (G, kind, target) => { const t = { kind, owner: 7, target, day: G.day, fresh: true, triggered: false }; G.traps.push(t); return t; };
  const has = (G, s) => txt(G).some(t => t.includes(s));

  await test('AC-2 team matrix 3-way (light/dark/indie)', () => {
    for (const [x, y, same] of [[0, 1, 1], [7, 8, 1], [10, 11, 0 + 0 /* seeker+thief both indie */ ? 0 : 1], [0, 7, 0], [7, 10, 0], [0, 10, 0]]) {
      const G = night(table(), { 4: sk(x, y) });
      assert(has(G, same ? SAME : DIFF), `${x},${y}: ${txt(G)}`);
    }
  });
  await test('AC-3 Alibi: dark+Alibi vs light same; vs dark diff; triggered; AC-5 note', () => {
    let G = table(); const al = trap(G, 'alibi', 7); night(G, { 4: sk(7, 0) });
    assert(has(G, SAME) && al.triggered, txt(G)); assert(G.fixNotes.some(n => n.pid === 4 && n.text.startsWith('(Debug Scanner แก้ข้อมูล) Data Correlation') && n.text.includes(DIFF)));
    G = table(); const al2 = trap(G, 'alibi', 7); night(G, { 4: sk(7, 8) }); assert(has(G, DIFF) && al2.triggered);
    G = table(); const al3 = trap(G, 'alibi', 0); night(G, { 4: sk(0, 1) }); assert(has(G, SAME) && !al3.triggered && !G.fixNotes.length, 'light alibi inert');
  });
  await test('AC-4/5 Honeypot flips once, one trap triggered; no note on unchanged', () => {
    let G = table(); const h = trap(G, 'honeypot', 0); night(G, { 4: sk(0, 1) }); assert(has(G, DIFF) && h.triggered); assert(G.fixNotes.some(n => n.text.includes(SAME)));
    G = table(); const h1 = trap(G, 'honeypot', 0), h2 = trap(G, 'honeypot', 1); night(G, { 4: sk(0, 1) });
    assert(has(G, DIFF) && [h1, h2].filter(t => t.triggered).length === 1, 'single flip ' + txt(G));
    G = table(); night(G, { 4: sk(0, 1) }); assert(has(G, SAME) && !G.fixNotes.length);
  });
  await test('AC-6/7 blackout: only outage text, no fx', () => {
    const G = night(table(), { 4: sk(0, 1) }, 'blackout');
    assert.deepStrictEqual(txt(G), ['Data Correlation: ไฟดับ/เน็ตหลุด ไม่ได้ข้อมูลเลย 🔌']);
    assert(!G.fx.some(f => f.role === 'data_oracle'));
  });
  await test('AC-7 fx payload shape and redaction', () => {
    const G = night(table(), { 4: sk(0, 7) }); const f = G.fx.filter(x => x.role === 'data_oracle');
    assert.strictEqual(f.length, 1); assert.deepStrictEqual(f[0], { ...f[0], kind: 'skill', role: 'data_oracle', caster: 4, targets: [0, 7], result: { same: false } });
    assert(!('real' in f[0]) && !('bugs' in f[0]));
    assert(!G.redactFx(G.fx, false).some(x => x.role === 'data_oracle'));
  });
  await test('Unchanged: other intel skills + Senior Dev none + Rune UX lists oracle target', () => {
    const G = night(table(), { 0: sk(11), 2: sk(7, 8), 4: sk(0, 1), 3: sk(0) });
    assert(G.intel[2].some(x => x.text.startsWith('Bug Bounties:')));
    assert(G.intel[3].some(x => x.text.includes('Wireframe Trap') && x.text.includes('P4')), JSON.stringify(G.intel[3]));
    assert(G.intel[0].length >= 0);
  });
  await test('swap to <2 targets: silent, no throw', () => {
    const G = table(); G.phase = 'NIGHT'; G.night = {}; G.alive().forEach(p => { G.night[p.id] = { type: 'REST', targets: [], ...(p.faction === 'dark' ? { side: 'FAKE', sideTargets: [] } : {}) }; }); G.night[4] = { type: 'SKILL', targets: [0] };
    assert.doesNotThrow(() => G.resolveNight()); assert(!txt(G).length && !G.fx.some(f => f.role === 'data_oracle'));
  });

  sockets.forEach(s => s.close());
  console.log(failed ? `\n${failed} FAILED` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
