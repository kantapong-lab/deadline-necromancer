// Information-leak and access tests (not covered by the golden master / mod-actions recordings):
//   - MOD_PASSWORD gates mod:create; tokens and room codes come from crypto
//   - once a game exists, a seat can only be re-entered with its token (never by name)
//   - Mystery Intern: copy comes from a random Light player and the source never reaches the player view
//   - Moderator view carries counts only (no waiting names, no silenced flag) unless Secrets are on
//   node test/security.js
const assert = require('assert');
process.env.PORT = process.env.TEST_PORT || '3114';
process.env.MOD_PASSWORD = 'hunter2-test';
const { io: Client } = require('socket.io-client');
const { httpServer } = require('../src/server/index');
const { Game } = require('../src/engine');

const URL = 'http://localhost:' + process.env.PORT;
const wait = ms => new Promise(r => setTimeout(r, ms));
const emit = (s, ev, data) => new Promise(res => s.emit(ev, data, res));
const names = n => Array.from({ length: n }, (_, i) => 'P' + i);

function engineChecks() {
  // find a game that has a Mystery Intern
  let G = null;
  for (let i = 0; i < 500 && !G; i++) { const g = new Game(names(8)); if (g.players.some(p => p.role === 'mystery_intern')) G = g; }
  assert(G, 'no game with a Mystery Intern in 500 tries');
  const intern = G.players.find(p => p.role === 'mystery_intern');

  // copy is random among living Light players, not the next seat to the right
  const seen = new Set();
  for (let i = 0; i < 300; i++) { G.setCopies(); assert(intern.copy, 'intern copy set'); seen.add(intern.copyFrom); }
  const { ROLES, useLimit } = require('../src/shared/data');
  const pool = G.players.filter(q => q.faction === 'light' && !useLimit(ROLES[q.role]));
  assert(pool.length >= 2 && seen.size >= 2, `copy source never varied (${[...seen]})`);
  seen.forEach(n => assert(pool.some(q => q.name === n), 'copy source must be a Light player without a use limit'));

  // the player view shows the skill but never who it came from
  const v = G.viewFor(intern.id);
  assert.strictEqual(v.me.copyFrom, undefined, 'copyFrom must not be sent to the Intern');
  assert(v.me.copyName, 'copyName (skill name) stays visible');
  assert(!JSON.stringify(v).includes('"copyFrom"'), 'copyFrom must not appear anywhere in the view');

  // moderator view: counts only unless Secrets are on
  G.phase = 'NIGHT'; G.night = {};
  const hid = G.modView(false), shown = G.modView(true);
  assert.strictEqual(hid.pending.night.waiting, null, 'waiting names hidden without Secrets');
  assert(hid.pending.night.total > 0 && hid.pending.night.done === 0, 'counts still present');
  assert(Array.isArray(shown.pending.night.waiting) && shown.pending.night.waiting.length > 0, 'waiting names shown with Secrets');
  const t = G.players.find(p => p.alive);
  t.silenced = true;
  assert.strictEqual(hid.players.find(p => p.id === t.id).silenced, false, 'silenced hidden without Secrets');
  assert.strictEqual(G.modView(false).players.find(p => p.id === t.id).silenced, false, 'silenced hidden without Secrets (fresh view)');
  assert.strictEqual(G.modView(true).players.find(p => p.id === t.id).silenced, true, 'silenced shown with Secrets');
  console.log('engine checks ok');
}

(async () => {
  engineChecks();
  await new Promise(r => (httpServer.listening ? r() : httpServer.once('listening', r)));
  const all = [], mk = () => { const s = Client(URL, { forceNew: true }); all.push(s); return s; };

  // malformed payloads must never throw inside a handler (an uncaught throw would kill the server process)
  const junk = mk();
  for (const ev of ['mod:create', 'mod:join', 'player:join', 'mod:do', 'p:vote', 'p:night']) {
    for (const bad of [null, 42, 'x', { code: 12 }]) await emit(junk, ev, bad);
  }

  // MOD_PASSWORD
  const mod = mk();
  let r = await emit(mod, 'mod:create');
  assert(!r.ok && r.needPassword, 'create without password refused');
  r = await emit(mod, 'mod:create', { password: 'wrong' });
  assert(!r.ok && r.needPassword, 'create with wrong password refused');
  r = await emit(mod, 'mod:create', { password: process.env.MOD_PASSWORD });
  assert(r.ok, 'create with right password ok');
  assert(/^[A-Z]{4}$/.test(r.code), 'room code shape');
  assert(/^[0-9a-f]{32}$/.test(r.modToken), 'modToken is 128-bit hex');
  const code = r.code;

  // lobby: join six players, reconnect by name is still fine in the lobby
  const ps = [], toks = [];
  for (let i = 0; i < 6; i++) {
    const s = mk(); const j = await emit(s, 'player:join', { code, name: 'P' + i });
    assert(j.ok && /^[0-9a-f]{32}$/.test(j.token), 'player token is 128-bit hex'); ps.push(s); toks.push(j.token);
  }
  ps[5].close(); await wait(60);
  const lobbyBack = await emit(mk(), 'player:join', { code, name: 'P5' });
  assert(lobbyBack.ok && lobbyBack.token === toks[5], 'lobby: offline name can still be reclaimed');

  // game starts
  r = await emit(mod, 'mod:do', { action: 'start' }); assert(r.ok, 'start');

  // in game: disconnect a player, then try to take the seat by name → refused; by token → ok
  ps[2].close(); await wait(60);
  const thief = await emit(mk(), 'player:join', { code, name: 'P2' });
  assert(!thief.ok && /เริ่มไปแล้ว/.test(thief.error), 'in-game name takeover refused: ' + JSON.stringify(thief));
  const stranger = await emit(mk(), 'player:join', { code, name: 'Newbie' });
  assert(!stranger.ok, 'new name after start refused');
  const real = mk(); let last = null; real.on('state', v => { last = v; });
  const back = await emit(real, 'player:join', { code, name: 'ignored', token: toks[2] });
  assert(back.ok, 'rejoin by token ok'); await wait(60);
  assert(last && last.me && last.me.name === 'P2', 'token rejoin reaches the same seat');

  all.forEach(s => s.close());
  console.log('security OK');
  process.exit(0);
})().catch(e => { console.error('SECURITY FAILED:', e.message); process.exit(1); });
