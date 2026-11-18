const assert = require('assert');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
process.env.PORT = process.env.TEST_PORT || '3121';
delete process.env.HTTPS_KEY; delete process.env.HTTPS_CERT; delete process.env.VOICE_ICE_SERVERS;
const { io: Client } = require('socket.io-client');
const { httpServer, rooms } = require('../src/server/index');
const { Game } = require('../src/engine');
const voice = require('../src/server/handlers/voice');

const URL = 'http://localhost:' + process.env.PORT;
const wait = ms => new Promise(r => setTimeout(r, ms));
const emit = (s, ev, data) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('ack timeout ' + ev)), 3000); s.emit(ev, data, v => { clearTimeout(t); res(v); }); });
const names = n => Array.from({ length: n }, (_, i) => 'P' + i);
const all = [];
const mk = () => { const s = Client(URL, { forceNew: true }); all.push(s); s.log = []; s.onAny((ev, d) => { if (ev.startsWith('voice:') || ev === 'v:sig') s.log.push([ev, JSON.parse(JSON.stringify(d === undefined ? null : d))]); }); return s; };
const evs = (s, ev) => s.log.filter(e => e[0] === ev).map(e => e[1]);
const SDP = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n';

function t1() {
  const g = new Game(names(6));
  const ok = new Set(['MORNING', 'VOTE_INTERIM']);
  for (const phase of ['MORNING', 'VOTE_INTERIM', 'NIGHT', 'VOTE', 'VOTE_RESULT', 'OVER', 'EVENT', 'LOBBY'])
    for (const alive of [true, false]) for (const silenced of [true, false]) for (const paused of [true, false]) {
      g.phase = phase; g.paused = paused; const p = g.players[0]; p.alive = alive; p.silenced = silenced;
      const want = alive && ok.has(phase) && !silenced && !paused;
      assert.strictEqual(g.canSpeak(0), want, `canSpeak ${phase} alive=${alive} sil=${silenced} paused=${paused}`);
      assert.strictEqual(g.canSpeak(0, { publicOnly: true }), alive && ok.has(phase) && !paused, 'publicOnly ignores only silenced');
    }
  for (const bad of [-1, 99, null, undefined, 'x', {}, NaN]) assert.strictEqual(g.canSpeak(bad), false, 'bad pid ' + bad);
  console.log('T1 ok');
}

async function setup(n, { full = true } = {}) {
  const mod = mk(); const c = await emit(mod, 'mod:create');
  const code = c.code, r = rooms.get(code);
  const joined = [];
  for (let i = 0; i < n; i++) { const s = mk(); const j = await emit(s, 'player:join', { code, name: 'P' + i }); joined.push({ s, token: j.token }); }
  let res = await emit(mod, 'mod:do', { action: 'start' }); assert(res.ok, 'start');
  const ps = [], toks = [];
  for (const j of joined) { const m = r.members.find(x => x.token === j.token); ps[m.pid] = j.s; toks[m.pid] = j.token; }
  let tv = null;
  if (full) { tv = mk(); res = await emit(tv, 'mod:join', { code, modToken: c.modToken, full: true }); assert(res.ok, 'mod:join full'); }
  const push = async () => { await emit(mod, 'mod:do', { action: 'announce', payload: { text: 'x' } }); await wait(60); };
  return { code, mod, modToken: c.modToken, r, ps, toks, tv, push, g: r.game };
}
const regAll = async (R, { mod = true } = {}) => {
  const acks = [];
  for (let i = 0; i < R.ps.length; i++) acks[i] = await emit(R.ps[i], 'voice:on', { on: true });
  if (mod && R.tv) R.modAck = await emit(R.tv, 'voice:on', { on: true });
  await wait(60); return acks;
};
const sig = (s, to, kind, extra) => s.emit('v:sig', { to, kind, ...(kind === 'ice' ? { cand: { candidate: 'candidate:1 1 udp 1 1.2.3.4 5 typ host', sdpMid: '0', sdpMLineIndex: 0 } } : { sdp: SDP }), ...extra });
const nsig = s => evs(s, 'v:sig').length;

async function t2t3() {
  const R = await setup(6); await regAll(R);
  R.g.phase = 'MORNING'; R.g.players[1].silenced = true; await R.push();
  const before = R.ps.map(nsig); const mb = nsig(R.tv);
  sig(R.ps[1], 0, 'offer'); sig(R.ps[1], 2, 'offer'); sig(R.ps[1], 'mod', 'offer'); sig(R.ps[1], 0, 'ice'); sig(R.ps[1], 'mod', 'ice');
  await wait(100);
  assert.deepStrictEqual(R.ps.map(nsig), before, 'silenced: nothing relayed to players'); assert.strictEqual(nsig(R.tv), mb, 'silenced: nothing to mod');
  assert([...R.r.voice.links].every(k => !k.startsWith('1>')), 'silenced: no links');
  for (const [pid, cause] of [[2, 'burnout'], [3, 'voted']]) { R.g.players[pid].alive = false; R.g.players[pid].cause = cause; }
  await R.push();
  sig(R.ps[2], 0, 'offer'); sig(R.ps[3], 0, 'offer'); sig(R.ps[3], 'mod', 'offer'); await wait(100);
  assert.strictEqual(nsig(R.ps[0]), before[0], 'dead: offer refused'); assert.strictEqual(nsig(R.tv), mb);
  assert.strictEqual(R.r.voice.links.size, 0, 'no links');
  closeAll(R); console.log('T2/T3 ok');
}
function closeAll(R) { R.ps.forEach(s => s.close()); R.mod.close(); if (R.tv) R.tv.close(); }

async function t4t5() {
  const R = await setup(6); const acks = await regAll(R);
  assert(acks.every(a => a.ok && Array.isArray(a.iceServers) && a.iceServers.length === 0 && typeof a.gen === 'number' && Array.isArray(a.peers)), 'acks');
  assert.strictEqual(R.modAck.ok, true); assert(!('permit' in R.modAck));
  R.g.phase = 'MORNING'; R.g.paused = false; R.g.players.forEach(p => { p.alive = true; p.silenced = false; }); await R.push();
  R.g.phase = 'NIGHT'; await R.push(); R.g.phase = 'MORNING'; await R.push();
  assert.deepStrictEqual(evs(R.ps[0], 'voice:permit').slice(-1), [{ permit: true }], 'MORNING permit true');
  const p0 = R.ps[0].log.length;
  R.ps[0].emit('v:sig', { to: 2, kind: 'offer', sdp: SDP, from: 5, extra: 'x', socketId: 'y' });
  R.ps[0].emit('v:sig', { to: 'mod', kind: 'offer', sdp: SDP });
  await wait(100);
  assert.deepStrictEqual(evs(R.ps[2], 'v:sig').slice(-1)[0], { from: 0, kind: 'offer', sdp: SDP }, 'player gets stamped offer, no extras');
  assert.deepStrictEqual(evs(R.tv, 'v:sig').slice(-1)[0], { from: 0, kind: 'offer', sdp: SDP }, 'mod gets offer');
  R.ps[2].emit('v:sig', { to: 0, kind: 'answer', sdp: SDP }); sig(R.ps[2], 0, 'ice'); sig(R.tv, 0, 'ice'); sig(R.ps[0], 2, 'ice');
  R.tv.emit('v:sig', { to: 0, kind: 'answer', sdp: SDP });
  await wait(100);
  assert.deepStrictEqual(evs(R.ps[0], 'v:sig').map(x => x.kind + ':' + x.from), ['answer:2', 'ice:2', 'ice:mod', 'answer:mod']);
  R.ps[4].emit('v:sig', { to: 3, kind: 'answer', sdp: SDP }); await wait(60); assert.strictEqual(nsig(R.ps[3]), 0);
  const logs0 = R.ps.map(s => s.log.length), tv0 = R.tv.log.length;
  const t0 = Date.now(); R.g.phase = 'NIGHT'; await R.push();
  assert(Date.now() - t0 < 1000);
  assert.deepStrictEqual(evs(R.ps[0], 'voice:permit').slice(-1), [{ permit: false }], 'speaker permit false');
  for (let i = 1; i < 6; i++) { assert(R.ps[i].log.slice(logs0[i]).some(e => e[0] === 'voice:drop' && e[1].pid === 0), 'receiver drop ' + i); }
  assert(R.tv.log.slice(tv0).some(e => e[0] === 'voice:drop' && e[1].pid === 0), 'mod drop');
  assert(![...R.r.voice.links].some(k => k.startsWith('0>')), 'links gone');
  const n2 = nsig(R.ps[2]); sig(R.ps[0], 2, 'offer'); sig(R.ps[0], 2, 'ice'); await wait(80);
  assert.strictEqual(nsig(R.ps[2]), n2, 'offer/ice refused after flip');
  R.g.phase = 'MORNING'; await R.push();
  assert.deepStrictEqual(evs(R.ps[0], 'voice:permit').slice(-1), [{ permit: true }], 'permit true again');
  assert(!evs(R.tv, 'voice:permit').length, 'permit never to the 3D screen');
  sig(R.ps[0], 2, 'offer'); await wait(60); assert(nsig(R.ps[2]) > n2, 'offers relay again');
  R.g.paused = true; await R.push();
  assert(R.ps[3].log.some(e => e[0] === 'voice:drop' && e[1].pid === 0));
  R.g.paused = false; await R.push();
  assert.deepStrictEqual(evs(R.ps[0], 'voice:permit').slice(-1), [{ permit: true }], 'unpaused permit true');
  R.g.players[0].alive = false; await R.push();
  assert.deepStrictEqual(evs(R.ps[0], 'voice:permit').slice(-1), [{ permit: false }], 'dead permit false');
  closeAll(R); console.log('T4/T5 ok');
}
// A silenced listener still relays its answer and ICE back to an active speaker.
async function t5b() {
  const R = await setup(6, { full: false }); await regAll(R, { mod: false });
  R.g.phase = 'MORNING'; R.g.paused = false; R.g.players.forEach(p => { p.alive = true; p.silenced = false; }); await R.push();
  sig(R.ps[0], 1, 'offer'); await wait(50);
  R.g.players[1].silenced = true;
  const n0 = nsig(R.ps[0]); R.ps[1].emit('v:sig', { to: 0, kind: 'answer', sdp: SDP }); sig(R.ps[1], 0, 'ice'); await wait(80);
  assert.strictEqual(nsig(R.ps[0]) - n0, 2, 'muted listener still answers');
  closeAll(R); console.log('T5b ok');
}

async function runSeq(silence) {
  const R = await setup(6); await regAll(R);
  const observed = [R.tv, ...R.ps.slice(1)];
  const mark = observed.map(s => s.log.length);
  R.g.phase = 'MORNING'; R.g.paused = false; R.g.players.forEach(p => { p.alive = true; p.silenced = false; });
  if (silence) R.g.players[0].silenced = true;
  await R.push(); R.g.phase = 'VOTE'; await R.push(); R.g.phase = 'MORNING'; await R.push();
  const rec = observed.map((s, i) => s.log.slice(mark[i]));
  const ownerPermit = evs(R.ps[0], 'voice:permit');
  closeAll(R); return { rec, ownerPermit };
}
async function t6() {
  const A = await runSeq(false), B = await runSeq(true);
  assert.deepStrictEqual(A.rec, B.rec, 'AC-11: receiver events identical silenced vs not');
  for (const per of [...A.rec, ...B.rec]) for (const [ev, d] of per) {
    if (per === A.rec[0] || per === B.rec[0]) assert.notStrictEqual(ev, 'voice:permit', 'permit never reaches the 3D screen');
    assert(!/silenced|mute|reason/i.test(JSON.stringify(d)), 'no leak words in ' + ev);
  }
  assert.deepStrictEqual(B.ownerPermit.slice(-1), [{ permit: false }], 'silenced owner is told privately');
  assert.deepStrictEqual(A.ownerPermit.slice(-1), [{ permit: true }]);
  console.log('T6 ok');
}

async function t7() {
  const R = await setup(6); await regAll(R);
  R.g.phase = 'MORNING'; await R.push();
  const genOld = evs(R.ps[1], 'voice:peers').slice(-1)[0].peers.find(p => p.to === 0).gen;
  const s2 = mk(); const j = await emit(s2, 'player:join', { code: R.code, token: R.toks[0] }); assert(j.ok);
  const n = nsig(R.ps[1]); sig(s2, 1, 'offer'); await wait(60); assert.strictEqual(nsig(R.ps[1]), n, 'unregistered tab ignored');
  const a = await emit(s2, 'voice:on', { on: true }); await wait(60);
  assert(a.ok && a.gen > genOld, 'new gen');
  assert(R.ps[1].log.some(e => e[0] === 'voice:drop' && e[1].pid === 0), 'drop for replaced registration');
  assert.strictEqual(evs(R.ps[1], 'voice:peers').slice(-1)[0].peers.find(p => p.to === 0).gen, a.gen);
  R.ps[0].close(); await wait(80);
  assert(R.r.members.find(m => m.pid === 0).voice.sock === s2.id, 'new registration kept');
  s2.close(); await wait(80);
  assert(R.ps[1].log.filter(e => e[0] === 'voice:drop').length >= 2, 'drop on registered disconnect');
  assert(!evs(R.ps[1], 'voice:peers').slice(-1)[0].peers.some(p => p.to === 0), 'no stale peer');
  const gm = evs(R.ps[1], 'voice:peers').slice(-1)[0].peers.find(p => p.to === 'mod').gen;
  R.tv.close(); await wait(60);
  assert(!evs(R.ps[1], 'voice:peers').slice(-1)[0].peers.some(p => p.to === 'mod'), 'mod entry gone');
  const tv2 = mk(); await emit(tv2, 'mod:join', { code: R.code, modToken: R.modToken, full: true });
  const ma = await emit(tv2, 'voice:on', { on: true }); await wait(60);
  assert(ma.ok && ma.gen > gm); assert.strictEqual(evs(R.ps[1], 'voice:peers').slice(-1)[0].peers.find(p => p.to === 'mod').gen, ma.gen);
  const plain = mk(); await emit(plain, 'mod:join', { code: R.code, modToken: R.modToken });
  const pe = await emit(plain, 'voice:on', { on: true }); assert.strictEqual(pe.ok, false);
  closeAll(R); console.log('T7 ok');
}

async function t8() {
  const R = await setup(6); await regAll(R);
  R.g.phase = 'MORNING'; R.g.paused = false; R.g.players.forEach(p => { p.alive = true; p.silenced = false; }); await R.push();
  const plain = mk(); await emit(plain, 'mod:join', { code: R.code, modToken: R.modToken });
  const stranger = mk();
  const bigC = { candidate: 'x'.repeat(513), sdpMid: '0', sdpMLineIndex: 0 };
  const bad = [null, undefined, 42, [], 'str', {}, { to: -1, kind: 'offer', sdp: SDP }, { to: 99, kind: 'offer', sdp: SDP }, { to: 'x', kind: 'offer', sdp: SDP },
    { to: {}, kind: 'offer', sdp: SDP }, { to: 1.5, kind: 'offer', sdp: SDP }, { to: 1, kind: 'nope', sdp: SDP }, { to: 1, kind: 'offer', sdp: 'x'.repeat(10001) },
    { to: 1, kind: 'offer', sdp: '' }, { to: 1, kind: 'offer' }, { to: 1, kind: 'ice', cand: bigC }, { to: 1, kind: 'ice', cand: 'str' }, { to: 1, kind: 'ice' },
    { to: 1, kind: 'ice', cand: { candidate: 'c', sdpMid: 5, sdpMLineIndex: 0 } }, { to: 1, kind: 'ice', cand: { candidate: 'c', sdpMid: '0', sdpMLineIndex: 65 } }, { to: 0, kind: 'offer', sdp: SDP }];
  const n1 = nsig(R.ps[1]), n0 = nsig(R.ps[0]);
  for (const b of bad) { R.ps[0].emit('v:sig', b); }
  R.ps[0].emit('v:sig'); await wait(100);
  assert.strictEqual(nsig(R.ps[1]), n1, 'garbage not relayed'); assert.strictEqual(nsig(R.ps[0]), n0);
  sig(plain, 1, 'offer'); sig(stranger, 1, 'offer'); await wait(60); assert.strictEqual(nsig(R.ps[1]), n1, 'plain mod / stranger ignored');
  for (const b of [null, undefined, 42, [], 'str', { on: 'yes' }]) { const a = await emit(stranger, 'voice:on', b); assert.strictEqual(a.ok, false); }
  for (const b of [null, 42, [], 'str']) await emit(R.ps[3], 'voice:on', b);
  const R2 = await setup(6, { full: false }); await regAll(R2, { mod: false }); R2.g.phase = 'MORNING'; await R2.push();
  sig(R.ps[0], 3, 'offer'); await wait(50);
  assert.strictEqual(nsig(R2.ps[3]), 0, 'cross-room never delivers'); closeAll(R2);
  R.ps[0].emit('v:sig', { to: 1, kind: 'offer', sdp: SDP }); R.ps[0].emit('v:sig', { to: 1, kind: 'ice', cand: null, junk: 1 }); await wait(60);
  assert.deepStrictEqual(evs(R.ps[1], 'v:sig').slice(-2), [{ from: 0, kind: 'offer', sdp: SDP }, { from: 0, kind: 'ice', cand: null }]);
  assert.strictEqual(evs(R.ps[1], 'v:sig').slice(-1)[0].from, 0);
  await wait(1100); const b0 = nsig(R.ps[1]);
  for (let i = 0; i < voice.SIG_MAX + 100; i++) sig(R.ps[0], 1, 'ice'); await wait(600);
  const got = nsig(R.ps[1]) - b0; assert(got <= voice.SIG_MAX && got > 0, 'burst relayed ' + got);
  const acks = []; for (let i = 0; i < voice.ON_MAX + 5; i++) acks.push(await emit(R.ps[2], 'voice:on', { on: true }));
  assert(acks.slice(-1)[0].ok === false || acks.some(a => !a.ok), 'voice:on limited');
  closeAll(R); console.log('T8 ok');
}

async function t9() {
  const R = await setup(6, { full: false }); const a = await emit(R.ps[0], 'voice:on', { on: true });
  assert.deepStrictEqual(a.iceServers, []); closeAll(R);
  const warn = console.warn; let warned = 0; console.warn = () => { warned++; };
  const P = voice.parseIceServers;
  assert.deepStrictEqual(P(undefined), []); assert.deepStrictEqual(P(''), []);
  assert.deepStrictEqual(P('[{"urls":"stun:a:1","username":"u","credential":"c","x":1},{"urls":["stun:b"]}]'), [{ urls: 'stun:a:1', username: 'u', credential: 'c' }, { urls: ['stun:b'] }]);
  assert.deepStrictEqual(P('{bad'), []); assert.strictEqual(warned, 1);
  assert.deepStrictEqual(P('{"urls":"x"}'), []); assert.strictEqual(warned, 2);
  assert.deepStrictEqual(P('[{"username":"u"},{"urls":5},null,{"urls":"stun:z"}]'), [{ urls: 'stun:z' }]);
  assert.strictEqual(P(JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ urls: 'stun:' + i })))).length, 8);
  console.warn = warn; console.log('T9 ok');
}

function child(env) {
  const p = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'server', 'index.js')], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  p.out = ''; p.err = ''; p.stdout.on('data', d => { p.out += d; }); p.stderr.on('data', d => { p.err += d; });
  return p;
}
async function t10() {
  const port = String(Number(process.env.PORT) + 20);
  const key = path.join(__dirname, 'fixtures', 'voice-test.key'), crt = path.join(__dirname, 'fixtures', 'voice-test.crt');
  const c = child({ PORT: port, HTTPS_KEY: key, HTTPS_CERT: crt });
  for (let i = 0; i < 50 && !c.out.includes('https://'); i++) await wait(100);
  assert(c.out.includes('https://'), 'startup log prints https: ' + c.out + c.err);
  const st = await new Promise((res, rej) => https.get('https://localhost:' + port + '/', { rejectUnauthorized: false }, r => { r.resume(); res(r.statusCode); }).on('error', rej));
  assert.strictEqual(st, 200);
  const s = Client('https://localhost:' + port, { forceNew: true, rejectUnauthorized: false, transports: ['websocket'] });
  await new Promise((res, rej) => { s.on('connect', res); s.on('connect_error', rej); });
  const r = await emit(s, 'mod:create'); assert(r.ok); s.close(); c.kill();
  const half = child({ PORT: String(Number(port) + 1), HTTPS_KEY: key, HTTPS_CERT: '' });
  const code = await new Promise(res => half.on('exit', res));
  assert.strictEqual(code, 1); assert(/HTTPS_KEY and HTTPS_CERT/.test(half.err));
  const missing = child({ PORT: String(Number(port) + 2), HTTPS_KEY: key, HTTPS_CERT: key + '.nope' });
  assert.strictEqual(await new Promise(res => missing.on('exit', res)), 1);
  console.log('T10 ok');
}

async function t12() {
  const R = await setup(12, { full: false }); await regAll(R, { mod: false });
  R.g.phase = 'MORNING'; R.g.paused = false; R.g.players.forEach(p => { p.alive = true; p.silenced = false; }); await R.push();
  const before = R.ps.map(nsig);
  for (let a = 0; a < 12; a++) {
    let sent = 0;
    for (let b = 0; b < 12; b++) if (a !== b) { sig(R.ps[a], b, 'offer'); sent++; }
    for (let k = 0; sent < 30; k++, sent++) sig(R.ps[a], (a + 1 + (k % 11)) % 12, 'ice');
  }
  await wait(800);
  const total = R.ps.reduce((n, s, i) => n + nsig(s) - before[i], 0);
  assert.strictEqual(total, 12 * 30, 'MORNING burst fully relayed, got ' + total);
  closeAll(R); console.log('T12 ok');
}

async function t11() {
  const R = await setup(12); await regAll(R);
  R.g.phase = 'MORNING'; R.g.paused = false; R.g.players.forEach(p => { p.alive = true; p.silenced = false; }); await R.push();
  for (let a = 0; a < 12; a++) { for (let b = 0; b < 12; b++) if (a !== b) sig(R.ps[a], b, 'offer'); sig(R.ps[a], 'mod', 'offer'); await wait(30); }
  await wait(100);
  assert.strictEqual(R.r.voice.links.size, 12 * 12, 'all links (11 players + mod each)');
  const marks = R.ps.map(s => s.log.length), tm = R.tv.log.length;
  R.g.phase = 'NIGHT'; await R.push();
  assert.strictEqual(R.r.voice.links.size, 0, 'links torn down');
  for (let i = 0; i < 12; i++) { const d = new Set(R.ps[i].log.slice(marks[i]).filter(e => e[0] === 'voice:drop').map(e => e[1].pid)); assert.strictEqual(d.size, 11, 'receiver ' + i + ' got 11 drops'); }
  assert.strictEqual(new Set(R.tv.log.slice(tm).filter(e => e[0] === 'voice:drop').map(e => e[1].pid)).size, 12);
  closeAll(R); console.log('T11 ok');
}

(async () => {
  t1();
  await new Promise(r => (httpServer.listening ? r() : httpServer.once('listening', r)));
  await t2t3(); await t4t5(); await t5b(); await t6(); await t7(); await t8(); await t9(); await t10(); await t11(); await t12();
  all.forEach(s => s.close());
  console.log('voice OK'); process.exit(0);
})().catch(e => { console.error('VOICE FAILED:', e.stack || e.message); process.exit(1); });
