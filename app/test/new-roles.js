// Release Alchemist · Ledger Sage · Lantern Keeper, plus the 10-role Light pool and its faction-reader quota.
// Drives the engine directly (no sockets), same style as test/events.js.   node test/new-roles.js
const assert = require('assert');
const { Game } = require('../src/engine');
const { ROLES, LIGHT, useLimit } = require('../src/shared/data');

// seats: 0 ledger_sage · 1 lantern_keeper · 2 release_alchemist · 3 senior_dev · 4 oracle_pm · 5 qa_hunter · 6 coffee_admin
//        7 shadow_hr · 8 shadow_legal · 9 chaos_scrum · 10 severance_seeker · 11 glory_thief
const SET = ['ledger_sage', 'lantern_keeper', 'release_alchemist', 'senior_dev', 'oracle_pm', 'qa_hunter', 'coffee_admin',
  'shadow_hr', 'shadow_legal', 'chaos_scrum', 'severance_seeker', 'glory_thief'];
const SAGE = 0, KEEPER = 1, ALCH = 2, HR = 7, SCRUM = 9;

function table({ day = 2, mana = 2 } = {}) {
  const G = new Game(SET.map((_, i) => 'P' + i));
  G.players.forEach((p, i) => { p.role = SET[i]; p.faction = ROLES[p.role].f; });
  G.day = day; G.mana = mana; G.manaMax = 6; G.booster = { open: false, votes: {} }; G.boosterCharges = 0;
  return G;
}
function night(G, acts = {}) {   // everyone rests (dark: fake) unless overridden; overrides bypass validation like closeNight defaults
  G.phase = 'NIGHT'; G.night = {};
  G.alive().forEach(p => { G.night[p.id] = { type: 'REST', targets: [], ...(p.faction === 'dark' ? { side: 'FAKE', sideTargets: [] } : {}) }; });
  Object.entries(acts).forEach(([id, a]) => { G.night[id] = { ...G.night[id], ...a }; });
  G.resolveNight(); return G;
}
const skill = (...t) => ({ type: 'SKILL', targets: t });
const bug = { side: 'SABOTAGE', sideTargets: [] };
const curse = t => ({ side: 'CURSE', sideTargets: [t] });
const intel = (G, pid) => G.intel[pid].map(x => x.text).join('\n');
const report = G => G.report.join('\n');

const cases = {
  pool() {
    assert.strictEqual(LIGHT.length, 10, 'Light pool is 10 roles');
    ['ledger_sage', 'lantern_keeper', 'release_alchemist'].forEach(k => assert(LIGHT.includes(k), k + ' in pool'));
    assert.strictEqual(useLimit(ROLES.release_alchemist), 2); assert.strictEqual(useLimit(ROLES.lantern_keeper), 1);
    assert.strictEqual(useLimit(ROLES.ledger_sage), 0);
    // a 12-player room draws 7 distinct Light roles out of 10 (3 are always absent)
    for (let i = 0; i < 100; i++) {
      const g = new Game(Array.from({ length: 12 }, (_, k) => 'P' + k)), lr = g.players.filter(p => p.faction === 'light').map(p => p.role);
      assert.strictEqual(new Set(lr).size, 7);
    }
  },
  quota() {   // rooms with ≤5 Light seats always hold Senior Dev or QA Hunter
    for (const n of [6, 7, 8, 9]) for (let i = 0; i < 400; i++) {
      const g = new Game(Array.from({ length: n }, (_, k) => 'P' + k));
      const lr = g.players.filter(p => p.faction === 'light').map(p => p.role);
      assert(lr.includes('senior_dev') || lr.includes('qa_hunter'), `${n}p game without a faction reader: ${lr}`);
      assert.strictEqual(new Set(lr).size, lr.length, 'Light roles stay unique');
    }
  },
  alchemist() {
    // +1 Mana on top of the normal night; the bug deduction still happens first
    assert.strictEqual(night(table({ mana: 2 }), { [HR]: bug }).mana, 2, 'control: base +1, bug −1');
    const G = night(table({ mana: 2 }), { [HR]: bug, [ALCH]: skill() });
    assert.strictEqual(G.mana, 3, 'overclock adds +1 after the bug');
    assert.strictEqual(night(table({ mana: 2 }), { [ALCH]: skill() }).mana, 4, 'no bug: +1 base +1 overclock');
    assert.strictEqual(night(table({ mana: 6 }), { [ALCH]: skill() }).mana, 6, 'capped at manaMax');
    // public line is the net only: no "บั๊ก" / "ปั่นงานปกติ" split that would expose the +1
    assert.match(report(G), /Mana Task \+1 \(ตอนนี้ 3\/6\)/); assert.doesNotMatch(report(G), /บั๊ก|ปั่นงานปกติ/);
    // 2 uses per game, can rest in between
    const H = table({ mana: 1 }); H.phase = 'NIGHT'; H.night = {};
    assert.strictEqual(H.canRest(H.P(ALCH)), true, 'limited-use role may rest');
    assert.strictEqual(H.submitNight(ALCH, skill()), null); night(H, { [ALCH]: skill() });
    assert.strictEqual(H.P(ALCH).usedN, 1); assert.strictEqual(H.hasSkill(H.P(ALCH)), true, 'one use left');
    night(H, { [ALCH]: skill() });
    assert.strictEqual(H.P(ALCH).usedN, 2); assert.strictEqual(H.hasSkill(H.P(ALCH)), false, 'out of uses');
    H.phase = 'NIGHT'; H.night = {};
    assert.match(H.submitNight(ALCH, { type: 'SKILL', targets: [] }), /ใช้สกิลไม่ได้/, 'third use rejected');
    assert.strictEqual(H.viewFor(ALCH).me.usesLeft, 0); assert.strictEqual(H.viewFor(ALCH).me.usesMax, 2);
    // the Intern can never copy a limited-use skill
    const I = table(); I.P(SCRUM).role = 'mystery_intern';
    for (let i = 0; i < 300; i++) { I.setCopies(); assert(!['release_alchemist', 'lantern_keeper'].includes(I.P(SCRUM).copy), 'intern copied a limited skill'); }
  },
  sage() {
    const G = table(); G.lastVotes = { 3: 5, 4: 'SKIP' };
    night(G, { [SAGE]: skill(3) }); assert.match(intel(G, SAGE), /Open the Ledger: เมื่อวาน P3 โหวต → P5/);
    const H = table(); H.lastVotes = { 3: 5, 4: 'SKIP' };
    night(H, { [SAGE]: skill(4) }); assert.match(intel(H, SAGE), /P4 โหวต → Skip/);
    const J = table(); J.lastVotes = { 3: 5 };
    night(J, { [SAGE]: skill(6) }); assert.match(intel(J, SAGE), /P6 โหวต → ไม่ได้ลงคะแนน/);
    // not a faction reader: Honeypot Bug and Power Outage leave it alone
    const K = table(); K.lastVotes = { 3: 5 }; K.traps = [{ kind: 'honeypot', target: 3, owner: HR, day: K.day, fresh: true, triggered: false }];
    K.event = { id: 'blackout', accepted: null, pending: false, votes: {} };
    night(K, { [SAGE]: skill(3) }); assert.match(intel(K, SAGE), /P3 โหวต → P5/);
    assert.strictEqual(K.traps.find(t => t.kind === 'honeypot')?.triggered ?? false, false, 'Honeypot not triggered by Ledger Sage');
  },
  keeper() {
    // nothing to look at yet: no candidates, SKILL refused, REST fine
    const G = table(); G.phase = 'NIGHT'; G.night = {};
    assert.deepStrictEqual(G.candidates(G.P(KEEPER)), []);
    assert.match(G.submitNight(KEEPER, skill(3)), /เป้าหมาย/); assert.strictEqual(G.submitNight(KEEPER, { type: 'REST' }), null);
    // night 2: HR's curse kills P4 (Burnout)
    night(G, { [HR]: curse(4) }); assert.strictEqual(G.P(4).alive, false); assert.strictEqual(G.P(4).cause, 'burnout');
    // a vote-out is not a candidate (its role is public already)
    G.P(6).alive = false; G.P(6).cause = 'vote'; G.P(6).votedOut = true;
    G.phase = 'NIGHT'; G.night = {};
    assert.deepStrictEqual(G.candidates(G.P(KEEPER)).map(x => x.id), [4]);
    assert.match(G.submitNight(KEEPER, skill(6)), /เป้าหมาย/, 'vote-out refused');
    // Scope Creep tries to swap the Keeper's target with the Sage's: the Keeper's dead target must stay put
    const S = night(G, { [KEEPER]: skill(4), [SAGE]: skill(3), [SCRUM]: skill(KEEPER, SAGE) });
    assert.match(intel(S, KEEPER), /Post-mortem Light: P4 คือ Oracle PM \(Team Deliver\)/, 'role + side revealed');
    assert.strictEqual(S.P(KEEPER).used, true, 'once-per-game spent');
    S.phase = 'NIGHT'; S.night = {};
    assert.match(S.submitNight(KEEPER, skill(4)), /ใช้สกิลไม่ได้/); assert.strictEqual(S.canRest(S.P(KEEPER)), true);
  },
  hotdesk() {   // Hot Desking never moves the Keeper's dead target onto someone else's skill
    for (let i = 0; i < 60; i++) {
      const G = table(); night(G, { [HR]: curse(4) });
      G.event = { id: 'hotdesk', accepted: null, pending: false, votes: {} }; G.lastVotes = { 3: 5 };
      night(G, { [KEEPER]: skill(4), [SAGE]: skill(3), 3: skill(SAGE) });
      assert.match(intel(G, KEEPER), /P4 คือ Oracle PM/, 'keeper kept its dead target');
    }
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(cases)) {
  try { fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e.message || e).split('\n').join('\n       ')); }
}
console.log(failed ? `\n${failed} new-roles test(s) failed` : '\nnew-roles OK');
process.exit(failed ? 1 : 0);
