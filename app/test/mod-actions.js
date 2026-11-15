// Socket-level test for the moderator actions and room/session handling that simulate.js does not cover:
// kick, secrets, start twice, reset, pause, timer, announce, closeEvent/closeBooster errors, non-mod rejection,
// rejoin by token / by offline name, mod rejoin. Ack strings and state shapes are compared with test/mod-actions.json.
//   node test/mod-actions.js            compare       node test/mod-actions.js --record   rewrite expectation
// Math.random is re-seeded before every emitted event so room codes, seat order and roles are reproducible.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
process.env.PORT = process.env.TEST_PORT || '3113';
const { io: Client } = require('socket.io-client');
const { httpServer } = require('../server');
const { mulberry32 } = require('./golden/bot');

const EXPECT = path.join(__dirname, 'mod-actions.json');
const URL = 'http://localhost:' + process.env.PORT;
const wait = ms => new Promise(r => setTimeout(r, ms));
const realRandom = Math.random;
let seedN = 0;
const out = [];
const tokens = new Map();   // random-looking values -> stable labels
const label = (kind, v) => { if (!v) return v; const k = kind + ':' + v; if (!tokens.has(k)) tokens.set(k, `<${kind}${tokens.size}>`); return tokens.get(k); };
const norm = v => JSON.parse(JSON.stringify(v, (k, x) => (k === 'ts' || k === 'endsAt') ? '<time>' : x));
const sha = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

function client() {
  const s = Client(URL, { forceNew: true }); s.last = null; s.kicked = false;
  s.on('state', v => { s.last = v; }); s.on('kicked', () => { s.kicked = true; });
  return s;
}
// emit with a freshly seeded Math.random; resolves with the ack
async function act(s, ev, data) {
  const seeded = mulberry32(++seedN * 7919);
  // socket.io / engine.io internals may also call Math.random: give them the real one so only game code consumes the seeded stream
  Math.random = () => ((new Error().stack.split('\n')[2] || '').includes('node_modules') ? realRandom() : seeded());
  const ack = await new Promise(res => s.emit(ev, data, res));
  Math.random = realRandom;
  await wait(25);
  return ack;
}
const stateSummary = st => st && ({ phase: st.phase, role: st.role, secrets: st.secrets, paused: st.paused, timer: st.timer && { sec: st.timer.sec, phase: st.timer.phase }, canStart: st.canStart,
  players: st.players && st.players.map(p => p.name + (p.connected === undefined ? '' : p.connected ? '+' : '-') + (p.role ? '=' + p.role : '')), pending: st.pending, hash: sha(norm(st)) });
function rec(step, ack, mod, who) {
  const a = ack && norm({ ...ack, token: label('tok', ack.token), code: label('code', ack.code), modToken: label('mtok', ack.modToken) });
  out.push({ step, ack: a, mod: stateSummary(mod && mod.last), who: who && who.last ? { phase: who.last.phase, role: who.last.role, paused: who.last.paused, hash: sha(norm(who.last)) } : null });
}

(async () => {
  await new Promise(r => (httpServer.listening ? r() : httpServer.once('listening', r)));
  const all = [];
  const mk = () => { const s = client(); all.push(s); return s; };
  const mod = mk(); const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const created = await act(mod, 'mod:create'); const code = created.code, modToken = created.modToken;
  rec('mod:create', created, mod);
  const ps = {}; const toks = {};
  const join = async (name, extra) => { const s = mk(); const r = await act(s, 'player:join', { code, name, ...extra }); if (r.ok) toks[name] = r.token; return { s, r }; };

  // non-mod and bad inputs
  const stranger = mk();
  rec('mod:do from socket with no room', await act(stranger, 'mod:do', { action: 'start' }), mod);
  rec('join unknown room', (await (async () => { const s = mk(); return act(s, 'player:join', { code: 'ZZZZ', name: 'X' }); })()), mod);
  rec('join empty name', await act(mk(), 'player:join', { code, name: '   ' }), mod);
  for (const n of names) { const { s, r } = await join(n); ps[n] = s; rec('join ' + n, r, mod, s); }
  rec('join duplicate name', await act(mk(), 'player:join', { code, name: 'A' }), mod);
  rec('mod:do by player', await act(ps.A, 'mod:do', { action: 'secrets', payload: { on: true } }), mod, ps.A);

  // lobby: kick, start with too few, secrets
  rec('kick by name G', await act(mod, 'mod:do', { action: 'kick', payload: { name: 'G' } }), mod);
  out.push({ step: 'G received kicked', value: ps.G.kicked });
  rec('kick by token F', await act(mod, 'mod:do', { action: 'kick', payload: { token: toks.F } }), mod);
  out.push({ step: 'F received kicked', value: ps.F.kicked });
  rec('kick unknown', await act(mod, 'mod:do', { action: 'kick', payload: { name: 'nobody' } }), mod);
  rec('closeVote before start', await act(mod, 'mod:do', { action: 'closeVote' }), mod);
  rec('bogus before start', await act(mod, 'mod:do', { action: 'bogus' }), mod);
  rec('start with 5', await act(mod, 'mod:do', { action: 'start' }), mod);
  rec('p:chat in lobby', await act(ps.A, 'p:chat', { text: 'hi' }), mod, ps.A);
  rec('secrets on (lobby)', await act(mod, 'mod:do', { action: 'secrets', payload: { on: true } }), mod, ps.A);
  rec('secrets off (lobby)', await act(mod, 'mod:do', { action: 'secrets', payload: { on: false } }), mod, ps.A);
  const f2 = await join('F'); ps.F2 = f2.s; toks.F = f2.r.token; rec('rejoin kicked name F (new member)', f2.r, mod, f2.s);

  // start / twice
  rec('start', await act(mod, 'mod:do', { action: 'start' }), mod, ps.A);
  rec('start twice', await act(mod, 'mod:do', { action: 'start' }), mod, ps.A);
  rec('join after start (new name)', await act(mk(), 'player:join', { code, name: 'Late' }), mod);
  rec('kick in game', await act(mod, 'mod:do', { action: 'kick', payload: { name: 'A' } }), mod);
  rec('secrets on (game)', await act(mod, 'mod:do', { action: 'secrets', payload: { on: true } }), mod, ps.A);
  rec('secrets off (game)', await act(mod, 'mod:do', { action: 'secrets', payload: { on: false } }), mod, ps.A);

  // pause / timer / announce / errors
  rec('pause on', await act(mod, 'mod:do', { action: 'pause', payload: { on: true } }), mod, ps.A);
  rec('p:chat while paused', await act(ps.A, 'p:chat', { text: 'hi' }), mod, ps.A);
  rec('p:vote while paused', await act(ps.B, 'p:vote', { target: 'SKIP' }), mod, ps.B);
  rec('pause off', await act(mod, 'mod:do', { action: 'pause', payload: { on: false } }), mod, ps.A);
  rec('p:chat after pause', await act(ps.A, 'p:chat', { text: 'hello' }), mod, ps.A);
  rec('timer 45', await act(mod, 'mod:do', { action: 'timer', payload: { sec: 45 } }), mod, ps.A);
  rec('timer clear', await act(mod, 'mod:do', { action: 'timer', payload: { sec: 0 } }), mod, ps.A);
  rec('timer garbage', await act(mod, 'mod:do', { action: 'timer', payload: { sec: 'abc' } }), mod, ps.A);
  rec('announce', await act(mod, 'mod:do', { action: 'announce', payload: { text: '  ประกาศทดสอบ  ' } }), mod, ps.A);
  rec('announce empty', await act(mod, 'mod:do', { action: 'announce', payload: { text: '   ' } }), mod, ps.A);
  rec('announce long (cut at 200)', await act(mod, 'mod:do', { action: 'announce', payload: { text: 'x'.repeat(260) } }), mod, ps.A);
  rec('closeEvent none pending', await act(mod, 'mod:do', { action: 'closeEvent' }), mod, ps.A);
  rec('closeVote in MORNING', await act(mod, 'mod:do', { action: 'closeVote' }), mod, ps.A);
  rec('toNight in MORNING', await act(mod, 'mod:do', { action: 'toNight' }), mod, ps.A);
  rec('closeNight in MORNING', await act(mod, 'mod:do', { action: 'closeNight' }), mod, ps.A);
  rec('bogus action', await act(mod, 'mod:do', { action: 'bogus' }), mod, ps.A);
  rec('p:night in MORNING', await act(ps.A, 'p:night', { type: 'REST' }), mod, ps.A);
  rec('p:event none', await act(ps.A, 'p:event', { accept: true }), mod, ps.A);
  rec('p:booster vote', await act(ps.A, 'p:booster', { key: 'retro' }), mod, ps.A);
  rec('closeBooster', await act(mod, 'mod:do', { action: 'closeBooster' }), mod, ps.A);
  rec('closeBooster again', await act(mod, 'mod:do', { action: 'closeBooster' }), mod, ps.A);
  rec('p:dark by anyone in day', await act(ps.A, 'p:dark', { text: 'x' }), mod, ps.A);

  // rejoin by token / by offline name / online name clash
  ps.B.close(); await wait(60);
  rec('B disconnected', { ok: true }, mod, ps.A);
  const b2 = mk(); const rb = await act(b2, 'player:join', { code, name: 'ignored', token: toks.B });
  rec('rejoin by token', rb, mod, b2);
  b2.close(); await wait(60);
  const b3 = mk(); const rb3 = await act(b3, 'player:join', { code, name: 'B' });
  rec('rejoin by offline name', rb3, mod, b3);
  rec('join with online name', await act(mk(), 'player:join', { code, name: 'B' }), mod);

  // mod rejoin
  rec('mod:join wrong token', await act(mk(), 'mod:join', { code, modToken: 'nope' }), mod);
  rec('mod:join wrong room', await act(mk(), 'mod:join', { code: 'ZZZZ', modToken }), mod);
  mod.close(); await wait(60);
  const mod2 = mk(); rec('mod:join ok (lowercase code)', await act(mod2, 'mod:join', { code: code.toLowerCase(), modToken }), mod2);

  // phases move on, then reset
  rec('toVote', await act(mod2, 'mod:do', { action: 'toVote' }), mod2, ps.A);
  rec('toVote again', await act(mod2, 'mod:do', { action: 'toVote' }), mod2, ps.A);
  rec('closeVote', await act(mod2, 'mod:do', { action: 'closeVote' }), mod2, ps.A);
  rec('toNight', await act(mod2, 'mod:do', { action: 'toNight' }), mod2, ps.A);
  rec('closeNight', await act(mod2, 'mod:do', { action: 'closeNight' }), mod2, ps.A);
  rec('reset', await act(mod2, 'mod:do', { action: 'reset' }), mod2, ps.A);
  rec('p:chat after reset', await act(ps.A, 'p:chat', { text: 'hi' }), mod2, ps.A);
  rec('closeVote after reset', await act(mod2, 'mod:do', { action: 'closeVote' }), mod2, ps.A);
  rec('start after reset', await act(mod2, 'mod:do', { action: 'start' }), mod2, ps.A);
  rec('pause with game then reset', await act(mod2, 'mod:do', { action: 'pause', payload: { on: true } }), mod2, ps.A);
  rec('reset 2', await act(mod2, 'mod:do', { action: 'reset' }), mod2, ps.A);

  all.forEach(s => s.close());
  if (process.argv.includes('--record')) { fs.writeFileSync(EXPECT, JSON.stringify(out, null, 1) + '\n'); console.log('mod-actions recorded: ' + out.length + ' steps'); }
  else {
    const want = JSON.parse(fs.readFileSync(EXPECT, 'utf8'));
    let bad = 0;
    for (let i = 0; i < Math.max(want.length, out.length); i++) if (JSON.stringify(want[i]) !== JSON.stringify(out[i])) { bad++; if (bad <= 5) console.log('DIFF #' + i + '\n  want ' + JSON.stringify(want[i]) + '\n  got  ' + JSON.stringify(out[i])); }
    console.log(bad ? `MOD ACTIONS FAILED: ${bad}` : `MOD ACTIONS OK (${out.length} steps)`);
    if (bad) process.exitCode = 1;
  }
  httpServer.close(); process.exit(process.exitCode || 0);
})().catch(e => { Math.random = realRandom; console.error('ERROR', e); process.exit(1); });
