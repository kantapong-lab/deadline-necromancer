// Rule: no Event card and no Trap card is ever used twice in one game.
//   node test/no-repeat-cards.js
// (a) directed: a placed Trap can never come back through "ขอสุ่มเปลี่ยน Trap"; a drawn Event is never drawn again
// (b) sweep: full bot games of every size — every Event id appears on at most one day, every Trap kind is placed at most once
const assert = require('assert');
const { Game } = require('../src/engine');
const { ROLES, EVENTS, TRAPS } = require('../src/shared/data');
const { playGame, Coverage } = require('./golden/bot');

let failed = 0;
const t = (name, fn) => { try { fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e).split('\n').slice(0, 4).join('\n       ')); } };

// 12 players → 2 Trap charges. seat 7 = shadow_hr (dark), 8 = shadow_legal (dark), 9 = chaos_devops (dark)
const ROLE_SET = ['senior_dev', 'oracle_pm', 'qa_hunter', 'rune_ux', 'data_oracle', 'coffee_admin', 'chrono_tech_lead', 'shadow_hr', 'shadow_legal', 'chaos_devops', 'severance_seeker', 'glory_thief'];
const table = () => { const G = new Game(ROLE_SET.map((_, i) => 'P' + i)); G.players.forEach((p, i) => { p.role = ROLE_SET[i]; p.faction = ROLES[p.role].f; }); G.day = 2; return G; };
const nightWith = (G, acts) => { G.phase = 'NIGHT'; G.night = {}; G.trapRerolled = false; G.alive().forEach(p => { G.night[p.id] = { type: 'REST', targets: [], ...(p.faction === 'dark' ? { side: 'FAKE', sideTargets: [] } : {}) }; }); Object.entries(acts).forEach(([id, a]) => { G.night[id] = { ...G.night[id], ...a }; }); };

t('a placed Trap never returns through the reroll', () => {
  for (let run = 0; run < 60; run++) {
    const G = table(); G.trapCharges = 2; const first = G.trapHand[0];
    nightWith(G, { 7: { side: 'TRAP', trapId: first, sideTargets: TRAPS[first].need ? [0] : [] } }); G.resolveNight();
    assert.deepStrictEqual(G.usedTraps, [first]);
    assert(!G.trapHand.includes(first), 'used card left the hand');
    for (let k = 0; k < 6; k++) {                                   // reroll again and again (one per night)
      nightWith(G, {}); assert.strictEqual(G.rerollTraps(7), null);
      assert(!G.trapHand.includes(first), `reroll #${k} dealt the already-used ${first}`);
      assert.strictEqual(new Set(G.trapHand).size, G.trapHand.length, 'no duplicate in hand');
    }
  }
});
t('a used Trap cannot be placed again even if forced into the hand', () => {
  const G = table(); G.trapCharges = 2; const k = G.trapHand[0];
  nightWith(G, { 7: { side: 'TRAP', trapId: k, sideTargets: TRAPS[k].need ? [0] : [] } }); G.resolveNight();
  G.trapHand = [k];                                                  // cheat: put the used card back
  nightWith(G, {}); const err = G.submitNight(7, { type: 'SKILL', targets: [0], side: 'TRAP', trapId: k, sideTargets: TRAPS[k].need ? [0] : [] });
  assert.match(err, /ใช้ซ้ำในเกมเดียวไม่ได้/, 'placing a used Trap is rejected with the rule message'); assert.strictEqual(G.usedTraps.length, 1);
});
t('an Event card is never drawn twice (deck is consumed, not reshuffled)', () => {
  const G = table(); const seen = [];
  for (let d = 2; d <= 5; d++) { G.day = d; G.drawEvent(); seen.push(G.event.id); }
  assert.strictEqual(new Set(seen).size, seen.length);
  G.deck = [seen[0]]; G.day = 5; G.drawEvent();                      // even a corrupted deck holding a used id is skipped
  assert.strictEqual(G.event, null, 'a card already drawn this game is not drawn again');
});
t('sweep: full games of every size — each Event on one day, each Trap placed once', () => {
  const cov = new Coverage(); let games = 0, traps = 0, events = 0;
  for (let n = 6; n <= 12; n++) for (let s = 0; s < 40; s++) {
    const evDay = new Map(), placed = [];
    playGame(Game, n, n * 1000 + s, cov, (label, ret, g) => {
      if (g.event) { if (evDay.has(g.event.id)) assert.strictEqual(evDay.get(g.event.id), g.day, `game ${n}:${s} drew ${g.event.id} on day ${evDay.get(g.event.id)} and again on day ${g.day}`); else { evDay.set(g.event.id, g.day); events++; } }
      g.usedTraps.forEach(k => { if (!placed.includes(k)) { placed.push(k); traps++; } });
      assert.strictEqual(new Set(g.usedTraps).size, g.usedTraps.length, `game ${n}:${s} placed a Trap twice: ${g.usedTraps}`);
      assert(g.usedTraps.length <= (n <= 9 ? 1 : 2), `game ${n}:${s} placed more Traps than its quota`);
      g.trapHand.forEach(k => assert(!g.usedTraps.includes(k), `game ${n}:${s}: used Trap ${k} is back in the hand`));
    }); games++;
  }
  assert(games === 280 && events > 200 && traps > 20, `sweep too thin (events ${events}, traps ${traps})`);
  console.log(`       (${games} games, ${events} distinct event draws, ${traps} trap placements checked)`);
});
console.log(failed ? `\n${failed} test(s) failed` : '\nno-repeat-cards OK');
process.exit(failed ? 1 : 0);
