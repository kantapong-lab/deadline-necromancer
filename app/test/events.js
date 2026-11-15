// One test per Client Event card (EVENTS in src/shared/data.js) — drives the engine directly, no sockets.
//   node test/events.js
// Every case builds a fixed 12-player table (see ROLE_SET), forces the card, and asserts the effect from its card text.
const assert = require('assert');
const { Game } = require('../src/engine');
const { ROLES, EVENTS } = require('../src/shared/data');

// seat ids: 0 senior_dev · 1 oracle_pm · 2 qa_hunter · 3 rune_ux · 4 data_oracle · 5 coffee_admin · 6 chrono_tech_lead
//           7 shadow_hr · 8 shadow_legal · 9 chaos_devops · 10 severance_seeker · 11 glory_thief
const ROLE_SET = ['senior_dev', 'oracle_pm', 'qa_hunter', 'rune_ux', 'data_oracle', 'coffee_admin', 'chrono_tech_lead',
  'shadow_hr', 'shadow_legal', 'chaos_devops', 'severance_seeker', 'glory_thief'];
const HR = 7, LEGAL = 8, DEVOPS = 9;

function table({ day = 2, mana = 2 } = {}) {
  const G = new Game(ROLE_SET.map((_, i) => 'P' + i));
  G.players.forEach((p, i) => { p.role = ROLE_SET[i]; p.faction = ROLES[p.role].f; });
  G.day = day; G.mana = mana; G.manaMax = 6;
  G.booster = { open: false, votes: {} }; G.boosterCharges = 0;
  return G;
}
const setEvent = (G, id, accepted = null) => { G.event = { id, accepted, pending: false, votes: {} }; return G; };
const draw = (G, id) => { G.deck = [...G.deck.filter(x => x !== id), id]; G.drawEvent(); return G; };
// vote on a choice card: `yes` players vote accept, everybody else rejects; closes the vote like the moderator's "to vote" does
function voteCard(G, id, yes) {
  draw(G, id); assert(G.event.pending, id + ' should be a choice card');
  G.alive().forEach((p, i) => assert.strictEqual(G.castEventChoice(p.id, i < yes), null));
  G.closeEventVote(); return G;
}
// night: everybody rests (dark side = fake) unless overridden; overrides bypass validation like closeNight's defaults do
function night(G, acts = {}) {
  G.phase = 'NIGHT'; G.night = {};
  G.alive().forEach(p => { G.night[p.id] = { type: 'REST', targets: [], ...(p.faction === 'dark' ? { side: 'FAKE', sideTargets: [] } : {}) }; });
  Object.entries(acts).forEach(([id, a]) => { G.night[id] = { ...G.night[id], ...a }; });
  G.resolveNight(); return G;
}
const skill = (...targets) => ({ type: 'SKILL', targets });
const curse = t => ({ side: 'CURSE', sideTargets: [t] });
const bug = { side: 'SABOTAGE', sideTargets: [] };
const intel = (G, pid) => G.intel[pid].map(x => x.text).join('\n');
const report = G => G.report.join('\n');

const cases = {
  approve() {   // 👍 Mana +1 immediately
    const G = draw(table({ mana: 2 }), 'approve');
    assert.strictEqual(G.mana, 3);
    assert.strictEqual(draw(table({ mana: 6 }), 'approve').mana, 6, 'capped at manaMax');
  },
  angry() {     // 😤 Mana −1 immediately, floor 0
    assert.strictEqual(draw(table({ mana: 3 }), 'angry').mana, 2);
    assert.strictEqual(draw(table({ mana: 0 }), 'angry').mana, 0);
  },
  down() {      // 🔥 barrier + heal disabled tonight (light side)
    const hit = { [HR]: curse(0), 1: skill(0) };
    assert(night(table(), hit).P(0).alive, 'control: PM shield blocks the curse');
    const G = night(setEvent(table(), 'down'), hit);
    assert.strictEqual(G.P(0).alive, false, 'shield ignored under Server Down');
    const H = night(setEvent(table(), 'down'), { [HR]: curse(0), 5: skill(0) });
    assert.strictEqual(H.P(0).alive, false, 'heal ignored under Server Down');
  },
  restart() {   // 🔁 base Mana task gives +0
    assert.strictEqual(night(table({ mana: 2 })).mana, 3, 'control');
    assert.strictEqual(night(setEvent(table({ mana: 2 }), 'restart')).mana, 2);
  },
  watch() {     // 👀 dark cannot curse tonight
    const G = setEvent(table(), 'watch'); assert(G.curseBlocked());
    G.phase = 'NIGHT'; G.night = {};
    assert.match(G.submitNight(HR, { type: 'SKILL', targets: [0], side: 'CURSE', sideTargets: [0] }), /สาป/);
    assert.strictEqual(night(G, { [HR]: curse(0) }).P(0).alive, true);
    assert(table().curseBlocked() === false);
  },
  blackout() {  // 🔌 the four investigators get "no info"
    const G = night(setEvent(table(), 'blackout'), { 0: skill(HR), 2: skill(HR, LEGAL), 3: skill(HR), 4: skill() });
    [0, 2, 3, 4].forEach(i => assert.match(intel(G, i), /ไม่ได้ข้อมูลเลย/, 'seat ' + i));
    assert.doesNotMatch(intel(night(table(), { 0: skill(HR) }), 0), /ไม่ได้ข้อมูลเลย/, 'control');
  },
  audit() {     // 🔍 Code Review shows one extra random player
    const G = night(setEvent(table(), 'audit'), { 0: skill(HR) });
    const lines = intel(G, 0).split('\n').filter(l => l.startsWith('Code Review'));
    assert.strictEqual(lines.length, 2);
    assert(lines.some(l => l.includes('ลูกค้าตรวจเพิ่ม')));
    assert.strictEqual(intel(night(table(), { 0: skill(HR) }), 0).split('\n').filter(l => l.startsWith('Code Review')).length, 1, 'control');
  },
  scope() {     // 📝 accept: base +2, bug penalty up to −2 · reject: nothing
    assert.strictEqual(voteCard(table({ mana: 2 }), 'scope', 12).event.accepted, true);
    assert.strictEqual(night(setEvent(table({ mana: 2 }), 'scope', true)).mana, 4);
    assert.strictEqual(night(setEvent(table({ mana: 3 }), 'scope', true), { [HR]: bug, [LEGAL]: bug, [DEVOPS]: bug }).mana, 3, '+2 −2 (cap 2)');
    const no = voteCard(table({ mana: 2 }), 'scope', 0); assert.strictEqual(no.event.accepted, false);
    assert.strictEqual(night(no).mana, 3, 'rejected = normal +1');
  },
  ot() {        // ⏰ accept: Mana +1 now, barrier + heal off tonight · reject: nothing
    const G = voteCard(table({ mana: 2 }), 'ot', 12);
    assert.strictEqual(G.mana, 3);
    assert.strictEqual(night(G, { [HR]: curse(0), 1: skill(0) }).P(0).alive, false, 'shield off');
    const N = voteCard(table({ mana: 2 }), 'ot', 0);
    assert.strictEqual(N.mana, 2);
    assert.strictEqual(night(N, { [HR]: curse(0), 1: skill(0) }).P(0).alive, true, 'shield works');
  },
  marathon() {  // 🕰️ no Skip in the vote, non-voters are not counted as Skip
    const G = setEvent(table(), 'marathon'); G.phase = 'VOTE'; G.votes = {};
    assert.match(G.castVote(0, 'SKIP'), /ห้ามกด Skip/);
    assert.strictEqual(G.castVote(0, HR), null);
    G.closeVote();
    assert.deepStrictEqual(Object.keys(G.lastVotes), ['0'], 'only real votes counted');
    const C = table(); C.phase = 'VOTE'; C.votes = {}; assert.strictEqual(C.castVote(0, 'SKIP'), null, 'control');
  },
  snack() {     // 🍩 resting players are immune to the curse; everybody may rest
    const G = setEvent(table(), 'snack'); G.phase = 'NIGHT'; G.night = {};
    assert(G.canRest(G.P(0)) && G.canRest(G.P(1)));
    assert.strictEqual(G.submitNight(0, { type: 'REST' }), null);
    assert.strictEqual(night(setEvent(table(), 'snack'), { [HR]: curse(0) }).P(0).alive, true, 'resting target survives');
    assert.strictEqual(night(setEvent(table(), 'snack'), { [HR]: curse(0), 0: skill(HR) }).P(0).alive, false, 'skilling target is not covered');
    assert.strictEqual(night(table(), { [HR]: curse(0) }).P(0).alive, false, 'control');
  },
  leak() {      // 📧 announces whether 2 random players did the same / different action
    const G = table(); G.phase = 'NIGHT';
    G.night = Object.fromEntries(G.alive().map(p => [p.id, { type: 'REST', targets: [] }]));   // identical for everyone
    draw(G, 'leak');
    assert.match(report(G), /Reply-All Leak: เมื่อคืน P\d+ กับ P\d+ ทำแอ็กชัน"เหมือนกัน"/, 'all rest → same');
    const D = table(); D.phase = 'NIGHT';
    D.night = Object.fromEntries(D.alive().map(p => [p.id, { type: p.id < 6 ? 'REST' : 'SKILL', targets: [] }]));
    for (let i = 0; i < 30; i++) { D.report = []; D.event = null; draw(D, 'leak'); assert.match(report(D), /Reply-All Leak: .*"(เหมือนกัน|ต่างกัน)"/); }
  },
  prod() {      // 🚨 accept: no skills, Mana +0, 1 light shielded · reject: Mana −2 + random curse on a non-dark
    const A = voteCard(table({ mana: 3 }), 'prod', 12);
    assert(A.skillsBanned() && A.mana === 3);
    A.phase = 'NIGHT'; A.night = {};
    assert.match(A.submitNight(0, { type: 'SKILL', targets: [HR] }), /ใช้สกิลไม่ได้/);
    assert.strictEqual(A.submitNight(0, { type: 'REST' }), null);
    assert.match(report(night(A, { [HR]: curse(0) })), /ฝ่ายแสง 1 คน \(สุ่ม\) ได้รับคุ้มกัน/);

    const R = voteCard(table({ mana: 3 }), 'prod', 0);
    assert.strictEqual(R.mana, 1, 'Mana −2');
    for (let i = 0; i < 20; i++) {
      const G = voteCard(table({ mana: 3 }), 'prod', 0); night(G);
      assert.match(report(G), /คำสาป Burnout แบบสุ่ม/);
      const dead = G.players.filter(p => !p.alive);
      assert(dead.length <= 1 && dead.every(p => p.faction !== 'dark'), 'curse hits a non-dark only');
      if (!dead.length) assert(G.players.some(p => p.dodgeUsed), 'no death means Freelance Dodge absorbed it');
    }
  },
  hotdesk() {   // 🪑 two players' skill targets are swapped secretly, revealed next morning
    const G = night(setEvent(table(), 'hotdesk'), { 0: skill(HR), 3: skill(LEGAL) });
    assert.match(report(G), /Hot Desking เฉลย: ระบบสลับเป้าหมายสกิลของ P\d+ กับ P\d+/);
    assert.match(intel(G, 0), /Code Review: P8 /, 'senior_dev ends up reviewing the other target');
    assert.match(intel(night(table(), { 0: skill(HR), 3: skill(LEGAL) }), 0), /Code Review: P7 /, 'control');
  },
  bonus() {     // 💰 accept: base +2, but any successful bug costs −2 · reject: nothing
    assert.strictEqual(voteCard(table({ mana: 2 }), 'bonus', 12).event.accepted, true);
    assert.strictEqual(night(setEvent(table({ mana: 2 }), 'bonus', true)).mana, 4, 'no bug: +2');
    assert.strictEqual(night(setEvent(table({ mana: 3 }), 'bonus', true), { [HR]: bug }).mana, 3, 'one bug: +2 −2');
    const no = voteCard(table({ mana: 2 }), 'bonus', 0); assert.strictEqual(no.event.accepted, false);
    assert.strictEqual(night(no, { [HR]: bug }).mana, 2, 'rejected: +1 −1');
  },
};

let failed = 0;
for (const [id, e] of Object.entries(EVENTS)) {
  const label = `#${String(e.n).padStart(2, '0')} ${id}`.padEnd(14);
  try {
    if (!cases[id]) throw new Error('no test for this event card — add one to test/events.js');
    cases[id]();
    console.log('  ok   ' + label + e.t);
  } catch (err) { failed++; console.log('  FAIL ' + label + e.t + '\n       ' + String(err.message).split('\n').join('\n       ')); }
}
Object.keys(cases).filter(id => !EVENTS[id]).forEach(id => { failed++; console.log('  FAIL ' + id + ' has a test but no event card'); });
console.log(failed ? `\n${failed} event test(s) failed` : `\nall ${Object.keys(EVENTS).length} event cards tested`);
process.exit(failed ? 1 : 0);
