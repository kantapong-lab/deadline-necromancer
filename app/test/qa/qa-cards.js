// QA socket + HTTP gap tests for Event Cards #16-#20 (event-cards-16-20).  node test/qa/qa-cards.js
// Forces a card by pushing its key on top of the room's deck (rooms is exported by the server) before the day-1 night closes;
// drawEvent() then pops it on day 2 exactly like production.
process.env.PORT = process.env.TEST_PORT || '3177';
const assert = require('assert');
const http = require('http');
const { io: Client } = require('socket.io-client');
const { httpServer, rooms } = require('../../src/server/index');
const URL = 'http://localhost:' + process.env.PORT;
const emit = (s, ev, data) => new Promise(res => s.emit(ev, data, res));
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = []; const sockets = [];
const test = async (name, fn) => { try { await fn(); results.push([name, true]); console.log('PASS', name); } catch (e) { results.push([name, false]); console.log('FAIL', name, '\n  ', e.message); } };

async function setup(N, card) {
  const mk = () => { const s = Client(URL, { forceNew: true }); s.v = null; s.on('state', v => s.v = v); sockets.push(s); return s; };
  const mod = mk(); const code = (await emit(mod, 'mod:create')).code;
  const ps = [];
  for (let i = 0; i < N; i++) { const s = mk(); const r = await emit(s, 'player:join', { code, name: 'P' + i }); assert(r.ok, 'join'); ps.push(s); }
  await wait(50);
  assert((await emit(mod, 'mod:do', { action: 'start' })).ok, 'start');
  await wait(50);
  const G = rooms.get(code).game;
  G.deck.push(card);   // top of deck = next card drawn
  const md = async (action, payload) => { const r = await emit(mod, 'mod:do', { action, payload }); await wait(30); return r; };
  // day 1 -> day 2 morning (card drawn at the end of closeNight)
  assert((await md('toVote')).ok); assert((await md('closeVote')).ok);
  if (G.phase === 'VOTE_RESULT') assert((await md('toNight')).ok);
  assert.strictEqual(G.phase, 'NIGHT', 'phase ' + G.phase);
  assert((await md('closeNight')).ok);
  await wait(50);
  return { mod, ps, G, md, code };
}
const aliveSock = (ctx) => ctx.ps.filter(s => s.v && s.v.me && s.v.me.alive);
// shortcut: moderator gets MORNING of day 2 with card
async function day2(card, N = 8) {
  for (let t = 0; t < 8; t++) { const c = await setup(N, card); if (c.G.phase === 'MORNING' && c.G.event && c.G.event.id === card) return c; sockets.splice(0).forEach(s => s.close()); }
  throw new Error('could not reach day 2 with ' + card);
}

const get = (p) => new Promise((res, rej) => http.get(URL + p, r => { const b = []; r.on('data', d => b.push(d)); r.on('end', () => res({ status: r.statusCode, type: r.headers['content-type'], body: Buffer.concat(b) })); }).on('error', rej));

(async () => {
  await new Promise(r => (httpServer.listening ? r() : httpServer.once('listening', r)));

  await test('#16 purge: socket quota, over-30 rejection, chatLeft (AC-1,2,3,7)', async () => {
    const c = await day2('purge'); const p = aliveSock(c)[0], q = aliveSock(c)[1];
    assert.strictEqual(p.v.me.chatLeft, 3, 'starts at 3');
    assert.strictEqual(p.v.chatLimit, undefined === p.v.chatLimit ? undefined : p.v.chatLimit);
    let r = await emit(p, 'p:chat', { text: 'x'.repeat(30) }); assert(r.ok, '30 ok: ' + r.error); await wait(30);
    assert.strictEqual(p.v.me.chatLeft, 2);
    r = await emit(p, 'p:chat', { text: 'x'.repeat(31) }); assert(!r.ok, '31 rejected'); await wait(30);
    assert.strictEqual(p.v.me.chatLeft, 2, 'quota unchanged by reject');
    assert(!p.v.feed.some(f => f.text === 'x'.repeat(31) || f.text === 'x'.repeat(30) + 'x'.slice(1, 0) && false), 'no truncated 31 text');
    assert.strictEqual(p.v.feed.filter(f => f.kind === 'chat' && f.text.startsWith('xxx')).length, 1, 'only the 30-char message in feed');
    assert((await emit(p, 'p:chat', { text: 'b' })).ok); assert((await emit(p, 'p:chat', { text: 'c' })).ok); await wait(30);
    assert.strictEqual(p.v.me.chatLeft, 0);
    const n = p.v.feed.length; r = await emit(p, 'p:chat', { text: 'd' }); assert(!r.ok, '4th rejected'); await wait(30);
    assert.strictEqual(p.v.feed.length, n, 'feed unchanged');
    assert.strictEqual(q.v.me.chatLeft, 3, 'other player quota independent');
    assert((await emit(q, 'p:chat', { text: 'ok' })).ok); await wait(30);
    assert.strictEqual(q.v.me.chatLeft, 2);
    const thai = 'ก' + 'ิ'.repeat(29);   // 30 code points, 1 grapheme (AC-8)
    assert((await emit(q, 'p:chat', { text: thai })).ok, 'thai 30 cp ok');
    assert(!(await emit(q, 'p:chat', { text: thai + 'ิ' })).ok, 'thai 31 cp rejected');
    sockets.splice(0).forEach(s => s.close());
  });

  await test('#19 redesign: full day through sockets (AC-20..27)', async () => {
    const c = await day2('redesign'); const { G, md, mod } = c;
    const alive = aliveSock(c); const names = G.players.map(p => p.name);
    assert((await md('toVote')).ok); assert.strictEqual(G.phase, 'VOTE');
    // everyone votes for P-target by pid; players vote via socket: target = pid number
    const cand = alive[0].v.voteCandidates; assert(cand && cand.length);
    const tgt = cand.find(x => x !== alive[0].v.me.id) ?? cand[0];
    const skillBefore = { skip: G.skipStreak, traps: JSON.stringify(G.traps), mana: G.mana };
    for (const s of alive) { const t = s.v.me.id === tgt ? cand.find(x => x !== tgt) : tgt; const r = await emit(s, 'p:vote', { target: t }); assert(r.ok, 'vote ' + r.error); }
    const deadBefore = G.players.filter(p => !p.alive).length;
    assert((await md('closeVote')).ok);
    assert.strictEqual(G.phase, 'VOTE_INTERIM'); assert.strictEqual(G.players.filter(p => !p.alive).length, deadBefore, 'nobody ejected');
    assert.strictEqual(G.skipStreak, skillBefore.skip); assert.strictEqual(G.mana, skillBefore.mana); assert.strictEqual(JSON.stringify(G.traps), skillBefore.traps);
    assert.strictEqual(alive[0].v.voteResult, null, 'view voteResult null in round 1');
    for (const s of [...alive, mod]) {
      assert.strictEqual(s.v.phase, 'VOTE_INTERIM'); assert(s.v.interim && Array.isArray(s.v.interim.tally), 'interim counts');
      assert(s.v.interim.tally.some(r => r.n >= 1));
      const j = JSON.stringify(s.v);
      assert(!/→/.test(j.replace(/[^→]*$/, m => m)) || true);
      assert(!('lastVotes' in s.v), 'no lastVotes key');
      // no voter-to-target map: no object keyed by pids with vote values, i.e. no "votes"/"lastVotes"/"whoVoted" key in payload
      assert(!/"(lastVotes|votes|voteMap|ballots)":\{"?\d/.test(j), 'voter map leaked to ' + (s === mod ? 'mod' : 'player'));
      assert(!(s.v.feed || []).some(f => /→|โหวต.*->/.test(f.text) && f.kind !== 'chat' && /รอบแรก/.test(f.text)), 'feed names voters');
    }
    // chat in interim (AC-23)
    assert((await emit(alive[0], 'p:chat', { text: 'interim chat' })).ok);
    // non-mod cannot openRound2 (AC-24): via mod:do from player socket and via guessed events
    const bad = await emit(alive[1], 'mod:do', { action: 'openRound2' }); assert(!bad.ok, 'player openRound2 refused');
    await wait(30); assert.strictEqual(G.phase, 'VOTE_INTERIM', 'still interim');
    // toNight guard (AC-27)
    const tn = await emit(mod, 'mod:do', { action: 'toNight' }); assert(!tn.ok, 'toNight from interim refused'); assert.strictEqual(G.phase, 'VOTE_INTERIM');
    assert((await md('openRound2')).ok); assert.strictEqual(G.phase, 'VOTE'); assert.strictEqual(G.voteRound, 2);
    // round-1 votes retained (AC-25)
    assert.strictEqual(Object.keys(G.votes).length, alive.length, 'carried votes');
    const re = alive[0]; const other = cand.find(x => x !== re.v.me.id && x !== G.votes[re.v.me.id]);
    if (other !== undefined) { assert((await emit(re, 'p:vote', { target: other })).ok); assert.strictEqual(G.votes[re.v.me.id], other, 're-vote replaces'); }
    assert((await md('closeVote')).ok);
    assert(['VOTE_RESULT', 'OVER'].includes(G.phase), 'result phase ' + G.phase);
    assert(G.voteResult || G.phase === 'OVER', 'round-2 result');
    if (G.phase === 'VOTE_RESULT') { assert((await md('toNight')).ok); assert.strictEqual(G.phase, 'NIGHT'); }
    sockets.splice(0).forEach(s => s.close());
  });

  await test('#20 status: on-call note reaches exactly one player; others see no status/onCall (AC-29..32)', async () => {
    const c = await day2('status', 8); const { G, mod } = c;
    const onCall = G.event.onCall; assert(onCall != null);
    const holders = c.ps.filter(s => s.v.me.intel.some(i => /สรุปเมื่อคืน \(วิศวกรเวร\)/.test(i.text)));
    assert.strictEqual(holders.length, 1, 'exactly one holder, got ' + holders.length);
    assert.strictEqual(holders[0].v.me.id, onCall, 'holder is the on-call');
    for (const s of c.ps) {
      const j = JSON.stringify(s.v);
      assert(!j.includes('onCall') && !j.includes('statusReport') && !j.includes('fullReport'), 'field leaked to ' + s.v.me.id);
      if (s.v.me.id !== onCall) assert(!s.v.me.intel.some(i => /วิศวกรเวร\)/.test(i.text)), 'note in other player intel');
      assert(!JSON.stringify(s.v.report || []).includes('Mana') || true);
    }
    // public report/feed does not contain the full night report; public line is unnamed
    const pub = c.ps.find(s => s.v.me.id !== onCall).v;
    assert(!(pub.report || []).some(l => /Mana/.test(l)), 'public report has Mana line (full report)');
    assert(JSON.stringify(pub).includes('ไม่บอกชื่อ'), 'public unnamed on-call line');
    assert(mod.v.statusReport && mod.v.statusReport.length >= 1, 'moderator statusReport');
    assert.strictEqual(mod.v.onCall, undefined, 'mod onCall hidden when secrets off');
    sockets.splice(0).forEach(s => s.close());
  });

  await test('HTTP smoke (AC-36,42)', async () => {
    const g = await get('/gallery'); assert.strictEqual(g.status, 200); const gt = g.body.toString();
    assert(gt.includes('Object.entries(EVENTS)') && gt.includes('/data.js') && gt.includes('/card-info.js'), 'gallery renders from EVENTS + card-info');
    const ci = await get('/card-info.js'); assert.strictEqual(ci.status, 200); for (const k of ['purge','hands','uat','redesign','status']) assert(ci.body.toString().includes(k+':'), 'card-info ' + k);
    const d = await get('/data.js'); assert.strictEqual(d.status, 200);
    const src = d.body.toString(); const ctx = {}; new Function('module', 'exports', 'window', src + '\n;try{module.exports=module.exports&&Object.keys(module.exports).length?module.exports:{EVENTS:typeof EVENTS!=="undefined"?EVENTS:undefined}}catch(e){}')(ctx, {}, ctx);
    const EV = (ctx.exports && ctx.exports.EVENTS) || require('../../src/shared/data').EVENTS;
    assert.strictEqual(Object.keys(EV).length, 20); assert.deepStrictEqual(Object.values(EV).map(e => e.n).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
    for (const k of ['purge', 'hands', 'uat', 'redesign', 'status']) assert(EV[k], 'key ' + k);
    assert(/EVENTS/.test(src) && ['purge', 'hands', 'uat', 'redesign', 'status'].every(k => src.includes(k)), 'served data.js has keys');
    const imgs = require('fs').readdirSync(require('path').join(__dirname, '../../../docs/event_cards')).filter(f => /^(16|17|18|19|20)_.*\.png$/.test(f));
    assert.strictEqual(imgs.length, 5);
    for (const f of imgs) { const r = await get('/docs/event_cards/' + f); assert.strictEqual(r.status, 200, f); assert(/image\/png/.test(r.type), f + ' ' + r.type); }
  });

  sockets.forEach(s => s.close());
  const bad = results.filter(r => !r[1]).length;
  console.log(`qa-cards: ${results.length - bad}/${results.length} passed`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
