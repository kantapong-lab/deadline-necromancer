// The "fx" presentation stream (src/engine/fx.js) — drives the engine directly, no sockets.
//   node test/fx.js
// Checks: every skill/curse/trap/event/booster/vote step records the payload the 3D Director expects,
// ids are valid, nothing leaks through redactFx while Secrets are off, and fx never appear in any view.
const assert = require('assert');
const { Game } = require('../src/engine');
const { ROLES, EVENTS, TRAPS, BOOSTERS } = require('../src/shared/data');

// seat ids: 0 senior_dev · 1 oracle_pm · 2 qa_hunter · 3 rune_ux · 4 data_oracle · 5 coffee_admin · 6 chrono_tech_lead
//           7 shadow_hr · 8 shadow_legal · 9 chaos_devops · 10 severance_seeker · 11 glory_thief
const ROLE_SET = ['senior_dev', 'oracle_pm', 'qa_hunter', 'rune_ux', 'data_oracle', 'coffee_admin', 'chrono_tech_lead',
  'shadow_hr', 'shadow_legal', 'chaos_devops', 'severance_seeker', 'glory_thief'];
function table({ day = 2, mana = 2 } = {}) {
  const G = new Game(ROLE_SET.map((_, i) => 'P' + i));
  G.players.forEach((p, i) => { p.role = ROLE_SET[i]; p.faction = ROLES[p.role].f; });
  G.day = day; G.mana = mana; G.manaMax = 6; G.booster = { open: false, votes: {} }; G.boosterCharges = 0; G.fx = [];
  return G;
}
function night(G, acts = {}) {
  G.phase = 'NIGHT'; G.night = {};
  G.alive().forEach(p => { G.night[p.id] = { type: 'REST', targets: [], ...(p.faction === 'dark' ? { side: 'FAKE', sideTargets: [] } : {}) }; });
  Object.entries(acts).forEach(([id, a]) => { G.night[id] = { ...G.night[id], ...a }; });
  G.resolveNight(); return G;
}
const skill = (...targets) => ({ type: 'SKILL', targets });
const curse = t => ({ side: 'CURSE', sideTargets: [t] });
const kinds = G => G.fx.map(f => f.kind);
const pick = (G, kind, pred = () => true) => G.fx.find(f => f.kind === kind && pred(f));
const skillOf = (G, role) => G.fx.find(f => f.kind === 'skill' && f.role === role);
let failed = 0;
const t = (name, fn) => { try { fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e).split('\n').slice(0, 4).join('\n       ')); } };

t('light skills → structured results', () => {
  const G = night(table(), { 0: skill(7), 1: skill(0), 2: skill(7, 3), 3: skill(8), 4: skill(7, 3), 5: skill(0) });
  assert.deepStrictEqual(skillOf(G, 'senior_dev'), { kind: 'skill', day: 2, phase: 'NIGHT', role: 'senior_dev', caster: 0, targets: [7], result: { bug: false, none: false, extra: false } });
  assert.strictEqual(skillOf(G, 'qa_hunter').result.hasDark, true);
  assert.deepStrictEqual(skillOf(G, 'qa_hunter').targets, [7, 3]);
  assert.deepStrictEqual(skillOf(G, 'oracle_pm').result, { barrierBroke: false });
  assert.deepStrictEqual(skillOf(G, 'coffee_admin').result, { disabled: false });
  assert.deepStrictEqual(skillOf(G, 'data_oracle').result, { same: false });
  assert.deepStrictEqual(skillOf(G, 'data_oracle').targets, [7, 3]);
  assert.deepStrictEqual(skillOf(G, 'rune_ux').targets, [8]);
});
t('PM barrier on a dark player breaks', () => {
  const G = night(table(), { 1: skill(7) });
  assert.strictEqual(skillOf(G, 'oracle_pm').result.barrierBroke, true);
});
t('dark skills + curse (blocked by shield / lands)', () => {
  const hit = night(table(), { 7: { ...skill(0), ...curse(3) }, 8: skill(4), 9: skill() });
  assert.deepStrictEqual(pick(hit, 'curse'), { kind: 'curse', day: 2, phase: 'NIGHT', caster: 7, target: 3, blocked: false });
  assert.deepStrictEqual(kinds(hit).filter(k => k === 'burnout'), ['burnout']);
  assert.strictEqual(pick(hit, 'burnout').pid, 3);
  assert.deepStrictEqual(skillOf(hit, 'shadow_hr').result, { role: 'senior_dev' });
  assert(skillOf(hit, 'shadow_legal') && skillOf(hit, 'chaos_devops'));
  const shielded = night(table(), { 7: { ...skill(0), ...curse(3) }, 1: skill(3) });
  assert.strictEqual(pick(shielded, 'curse').blocked, true);
  assert(!pick(shielded, 'burnout'), 'no burnout when the shield holds');
});
t('chrono / scope creep / glory thief / soul recruiter / seeker', () => {
  const G = night(table(), { 6: skill(), 10: skill(), 11: skill(0), 0: skill(7) });
  assert(skillOf(G, 'chrono_tech_lead') && skillOf(G, 'severance_seeker'));
  assert.deepStrictEqual(skillOf(G, 'glory_thief').result, { stolen: true });
});
t('trap placement + trigger (honeypot hits the QA Hunter the same night)', () => {
  const G = table(); G.trapCharges = 1; G.trapHand = ['honeypot'];
  night(G, { 7: { side: 'TRAP', trapId: 'honeypot', sideTargets: [0] }, 2: skill(0, 3) });   // Honeypot is live the night it is placed
  const placed = pick(G, 'trapPlace'); assert.deepStrictEqual([placed.trap, placed.owner, placed.target], ['honeypot', 7, 0]);
  const trig = pick(G, 'trapTrigger'); assert.deepStrictEqual([trig.trap, trig.target], ['honeypot', 0]);
  assert(kinds(G).indexOf('trapPlace') < kinds(G).indexOf('trapTrigger'), 'placed before it fires');
});
t('events: draw emits the card; choice vote emits result', () => {
  const G = table(); G.deck = ['approve']; G.drawEvent();
  assert.deepStrictEqual(pick(G, 'event'), { kind: 'event', day: 2, phase: 'MORNING', key: 'approve', mana: 3, pending: false });
  const H = table(); H.deck = ['ot']; H.drawEvent(); assert.strictEqual(pick(H, 'event').pending, true);
  H.alive().forEach((p, i) => H.castEventChoice(p.id, i < 8)); H.closeEventVote();
  const ev = pick(H, 'eventVote'); assert.strictEqual(ev.key, 'ot'); assert.strictEqual(ev.accepted, true); assert.strictEqual(ev.votes.length, 12); assert.strictEqual(ev.mana, 3);
  const hands = table(); hands.deck = ['hands']; hands.drawEvent(); assert(pick(hands, 'event').targets.length >= 1);
});
t('booster: used + not used', () => {
  const G = table(); G.boosterCharges = 1; G.booster = { open: true, votes: {} };
  G.alive().forEach(p => G.castBooster(p.id, 'freeze')); G.closeBoosterVote();
  const b = pick(G, 'booster'); assert.strictEqual(b.key, 'freeze'); assert.strictEqual(b.votes.length, 12);
  const N = table(); N.boosterCharges = 1; N.booster = { open: true, votes: {} }; N.closeBoosterVote();
  assert.strictEqual(pick(N, 'booster').key, null);
});
t('vote result (fired) emits voteOut', () => {
  const G = table(); G.phase = 'VOTE'; G.votes = {}; G.alive().forEach(p => { G.votes[p.id] = p.id === 3 ? 'SKIP' : 3; }); G.closeVote();
  const v = pick(G, 'voteOut'); assert.strictEqual(v.out, 3); assert.strictEqual(v.cause, 'fired');
});
t('redactFx keeps only public kinds and strips trap details', () => {
  const G = table(); G.trapCharges = 1; G.trapHand = ['honeypot'];
  night(G, { 0: skill(7), 7: { side: 'TRAP', trapId: 'honeypot', sideTargets: [0], ...skill(0) } });
  G.fx = []; night(G, { 0: skill(3), 7: { ...skill(0), ...curse(3) } });
  const all = G.drainFx(); assert(all.some(f => f.kind === 'skill') && all.some(f => f.kind === 'curse'));
  const pub = G.redactFx(all, false);
  assert(pub.every(f => ['event', 'eventVote', 'booster', 'voteOut', 'burnout', 'trapTrigger'].includes(f.kind)), 'only public kinds');
  pub.filter(f => f.kind === 'trapTrigger').forEach(f => { assert(!('owner' in f) && !('target' in f), 'trap trigger = name only'); });
  assert.strictEqual(G.redactFx(all, true).length, all.length, 'secrets on = everything');
  assert.deepStrictEqual(G.fx, [], 'drained');
});
t('fx never appear in any view / modView', () => {
  const G = night(table(), { 0: skill(7) });
  assert(G.fx.length > 0);
  const dump = JSON.stringify({ v: G.players.map(p => G.viewFor(p.id)), m: G.modView(true) });
  assert(!/"fx"/.test(dump) && !/"kind":"skill"/.test(dump));
});
t('every card key has art + is playable (data.js coverage)', () => {
  Object.keys(ROLES).forEach(k => assert(ROLES[k].img)); Object.keys(EVENTS).forEach(k => assert(EVENTS[k].img));
  Object.keys(TRAPS).forEach(k => assert(TRAPS[k].img)); Object.keys(BOOSTERS).forEach(k => assert(BOOSTERS[k].img));
});
t('full random games: fx ids always valid', () => {
  for (let n = 6; n <= 12; n++) for (let s = 0; s < 20; s++) {
    const G = new Game(Array.from({ length: n }, (_, i) => 'P' + i));
    let guard = 0; while (G.phase !== 'OVER' && guard++ < 80) {
      if (G.phase === 'MORNING') { G.alive().forEach(p => { if (G.event?.pending) G.castEventChoice(p.id, Math.random() < .5); if (G.booster.open) G.castBooster(p.id, Math.random() < .5 ? 'scanner' : 'NONE'); }); G.toVote(); }
      else if (G.phase === 'VOTE') { G.alive().forEach(p => { const o = G.alive().filter(x => x.id !== p.id); G.castVote && G.castVote(p.id, Math.random() < .3 ? 'SKIP' : o[Math.floor(Math.random() * o.length)].id); }); G.closeVote(); }
      else if (G.phase === 'VOTE_INTERIM') G.openRound2();
      else if (G.phase === 'VOTE_RESULT') G.toNight();
      else if (G.phase === 'NIGHT') G.closeNight();
      else break;
      G.drainFx().forEach(f => {
        ['caster', 'target', 'pid', 'out', 'victim'].forEach(k => { if (f[k] != null) assert(G.P(f[k]), `${f.kind}.${k}=${f[k]} is not a player`); });
        (f.targets || []).forEach(id => assert(G.P(id), `${f.kind} target ${id}`));
      });
    }
  }
});
console.log(failed ? `\n${failed} fx test(s) failed` : '\nfx OK');
process.exit(failed ? 1 : 0);
