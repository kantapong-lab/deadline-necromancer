// Data Correlation (ex Data Oracle / KPI Forecast): are the two chosen players on the same team?
//   node test/data-correlation.js
// Drives the engine directly (no sockets), same harness style as test/fx.js.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Game } = require('../src/engine');
const { ROLES, TRAPS } = require('../src/shared/data');

// seat ids: 0 senior_dev · 1 oracle_pm · 2 qa_hunter · 3 rune_ux · 4 data_oracle · 5 coffee_admin · 6 chrono_tech_lead   (light)
//           7 shadow_hr · 8 shadow_legal · 9 chaos_scrum (dark) · 10 severance_seeker · 11 glory_thief (indie)
const ROLE_SET = ['senior_dev', 'oracle_pm', 'qa_hunter', 'rune_ux', 'data_oracle', 'coffee_admin', 'chrono_tech_lead',
  'shadow_hr', 'shadow_legal', 'chaos_scrum', 'severance_seeker', 'glory_thief'];
const ORC = 4, HR = 7, LEGAL = 8, SCRUM = 9, SEEKER = 10, THIEF = 11;
const SAME = 'อยู่ทีมเดียวกัน 🔗', DIFF = 'อยู่คนละทีม ⛓️‍💥';
const REPEAT_MSG = 'ห้ามเลือกเป้าหมายเดิมที่ใช้เมื่อคืนติดกัน — เลือกคนอื่น';
const OUTAGE = 'Data Correlation: ไฟดับ/เน็ตหลุด ไม่ได้ข้อมูลเลย 🔌';
const FIX = '(Debug Scanner แก้ข้อมูล) ';

function table({ day = 2 } = {}) {
  const G = new Game(ROLE_SET.map((_, i) => 'P' + i));
  G.players.forEach((p, i) => { p.role = ROLE_SET[i]; p.faction = ROLES[p.role].f; });
  G.day = day; G.mana = 2; G.manaMax = 6; G.booster = { open: false, votes: {} }; G.boosterCharges = 0; G.fx = [];
  return G;
}
function night(G, acts = {}) {
  G.phase = 'NIGHT'; G.night = {};
  G.alive().forEach(p => { G.night[p.id] = { type: 'REST', targets: [], ...(p.faction === 'dark' ? { side: 'FAKE', sideTargets: [] } : {}) }; });
  Object.entries(acts).forEach(([id, a]) => { G.night[id] = { ...G.night[id], ...a }; });
  G.resolveNight(); return G;
}
const skill = (...targets) => ({ type: 'SKILL', targets });
const notes = (G, pid = ORC) => G.intel[pid].map(x => x.text);
const corr = (G, pid = ORC) => notes(G, pid).filter(t => t.includes('Data Correlation'));
const line = (G, a, b, same) => `Data Correlation: ${G.nm(a)} กับ ${G.nm(b)} → ${same ? SAME : DIFF}`;
const oracleFx = G => G.fx.filter(f => f.kind === 'skill' && f.role === 'data_oracle');
const trap = (G, kind, target) => { const t = { kind, owner: HR, target, day: G.day, fresh: true, triggered: false }; G.traps.push(t); return t; };
const setEvent = (G, id) => { G.event = { id, accepted: null, pending: false, votes: {} }; return G; };
let failed = 0;
const t = (name, fn) => { try { fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e.stack || e).split('\n').slice(0, 12).join('\n       ')); } };

t('T1 role spec + no KPI Forecast left in src', () => {
  const r = ROLES.data_oracle;
  assert.strictEqual(r.skill, 'Data Correlation'); assert.strictEqual(r.t, 2); assert.strictEqual(r.pool, 'others');
  assert.strictEqual(r.d, 'เลือกเพื่อน 2 คน เช้าถัดไปรู้ว่าทั้งคู่อยู่ทีมเดียวกันหรือคนละทีม (ไม่บอกว่าทีมไหน)');
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const hits = walk(path.join(__dirname, '../src')).filter(f => fs.readFileSync(f, 'utf8').includes('KPI Forecast'));
  assert.deepStrictEqual(hits, []);
});

t('T2 submitNight validation + no-repeat', () => {
  const G = table(); G.phase = 'NIGHT'; G.night = {};
  const sub = (...ts) => G.submitNight(ORC, skill(...ts));
  assert.notStrictEqual(sub(ORC, 0), null, 'self');
  assert.notStrictEqual(sub(0, 0), null, 'duplicate');
  assert.notStrictEqual(sub(0), null, '1 target');
  assert.notStrictEqual(sub(0, 1, 2), null, '3 targets');
  assert.notStrictEqual(sub(), null, '0 targets');
  assert.strictEqual(sub(0, 1), null, 'night 1 (no history) ok');
  // same pair next night
  G.players[ORC].prevTargets = [0, 1];
  assert.strictEqual(sub(0, 1), REPEAT_MSG);
  assert.strictEqual(sub(2, 3), null);
  assert.strictEqual(sub(0, 2), REPEAT_MSG, 'either old target is dropped');
});

t('T3 same / different across 3 factions, no team name', () => {
  const cases = [[0, 1, true], [HR, LEGAL, true], [SEEKER, THIEF, true], [0, HR, false], [HR, SEEKER, false], [0, SEEKER, false]];
  cases.forEach(([a, b, same]) => {
    const G = night(table(), { [ORC]: skill(a, b) });
    assert.deepStrictEqual(corr(G), [line(G, a, b, same)], `${a},${b}`);
    const txt = corr(G)[0];
    assert(!/light|dark|indie|ฝ่ายแสง|ฝ่ายมืด|อิสระ/i.test(txt.split('→')[1]), 'no team name');
    assert(!/งานเสร็จจริง|บั๊กแฝง/.test(notes(G).join('\n')));
  });
});

t('T4 Alibi on a dark target', () => {
  let G = table(); const al = trap(G, 'alibi', HR); night(G, { [ORC]: skill(HR, 0) });
  assert.deepStrictEqual(corr(G), [line(G, HR, 0, true)]); assert.strictEqual(al.triggered, true);
  G = table(); const al2 = trap(G, 'alibi', HR); night(G, { [ORC]: skill(HR, LEGAL) });
  assert.deepStrictEqual(corr(G), [line(G, HR, LEGAL, false)]); assert.strictEqual(al2.triggered, true);
  G = table(); const al3 = trap(G, 'alibi', 0); night(G, { [ORC]: skill(0, 1) });
  assert.deepStrictEqual(corr(G), [line(G, 0, 1, true)]); assert.strictEqual(al3.triggered, false, 'light target: not marked');
});

t('T5 Honeypot single flip, cleanSprint, Alibi + Honeypot', () => {
  let G = table(); let h = trap(G, 'honeypot', 0); night(G, { [ORC]: skill(0, 1) });
  assert.deepStrictEqual(corr(G), [line(G, 0, 1, false)]); assert.strictEqual(h.triggered, true);
  G = table(); const h1 = trap(G, 'honeypot', 0), h2 = trap(G, 'honeypot', 1); night(G, { [ORC]: skill(0, 1) });
  assert.deepStrictEqual(corr(G), [line(G, 0, 1, false)], 'both trapped: one flip');
  assert.strictEqual([h1, h2].filter(x => x.triggered).length, 1);
  G = table(); G.cleanSprint = true; h = trap(G, 'honeypot', 0); night(G, { [ORC]: skill(0, 1) });
  G.cleanSprint = true;   // night start resets nothing the oracle reads; the flag is set again for clarity
  assert.deepStrictEqual(corr(G), [line(G, 0, 1, true)]); assert.strictEqual(h.triggered, false);
  G = table(); const al = trap(G, 'alibi', HR); h = trap(G, 'honeypot', 0); night(G, { [ORC]: skill(HR, 0) });
  assert.deepStrictEqual(corr(G), [line(G, HR, 0, false)], 'Alibi -> same, Honeypot flips -> different');
  assert(al.triggered && h.triggered);
});

t('T6 Debug Scanner fix note only when the shown result is altered', () => {
  let G = table(); trap(G, 'honeypot', 0); night(G, { [ORC]: skill(0, 1) });
  assert.deepStrictEqual(G.fixNotes.filter(f => f.pid === ORC), [{ pid: ORC, text: FIX + line(G, 0, 1, true) }]);
  G = table(); trap(G, 'alibi', HR); night(G, { [ORC]: skill(HR, 0) });
  assert.deepStrictEqual(G.fixNotes.filter(f => f.pid === ORC), [{ pid: ORC, text: FIX + line(G, HR, 0, false) }]);
  G = table(); night(G, { [ORC]: skill(0, 1) });
  assert.deepStrictEqual(G.fixNotes.filter(f => f.pid === ORC), []);
  G = table(); trap(G, 'alibi', HR); trap(G, 'honeypot', 0); night(G, { [ORC]: skill(HR, 0) });   // flips cancel out: shown = truth? no: truth same=false, shown false
  assert.deepStrictEqual(G.fixNotes.filter(f => f.pid === ORC), [], 'shown equals the true result');
});

t('T7 Power Outage', () => {
  const G = night(setEvent(table(), 'blackout'), { [ORC]: skill(0, 1) });
  assert.deepStrictEqual(corr(G), [OUTAGE]);
  assert.deepStrictEqual(oracleFx(G), []);
});

t('T8 fx payload, no real/bugs, redacted without Secrets', () => {
  const G = table(); trap(G, 'honeypot', 0); night(G, { [ORC]: skill(0, 1) });
  const fx = oracleFx(G);
  assert.deepStrictEqual(fx, [{ kind: 'skill', day: 2, phase: 'NIGHT', role: 'data_oracle', caster: ORC, targets: [0, 1], result: { same: false } }]);
  assert(!('real' in fx[0].result) && !('bugs' in fx[0].result));
  assert.deepStrictEqual(G.redactFx(G.fx, false).filter(f => f.role === 'data_oracle'), []);
  assert.strictEqual(G.redactFx(G.fx, true).filter(f => f.role === 'data_oracle').length, 1);
});

t('T9 swaps: compare the swapped targets; <2 targets stays silent', () => {
  // Scope Creep swaps the oracle with the QA Hunter -> oracle now holds (HR, 3)
  let G = night(table(), { [SCRUM]: { ...skill(ORC, 2), side: 'FAKE' }, [ORC]: skill(0, 1), 2: skill(HR, 3) });
  assert.deepStrictEqual(corr(G), [line(G, HR, 3, false)]);
  assert.deepStrictEqual(oracleFx(G).map(f => f.targets), [[HR, 3]]);
  // swapped with a 1-target skill -> oracle holds 1 target: no note, no fx, no throw
  G = night(table(), { [SCRUM]: { ...skill(ORC, 0), side: 'FAKE' }, [ORC]: skill(5, 6), 0: skill(HR) });
  assert.deepStrictEqual(corr(G), []); assert.deepStrictEqual(oracleFx(G), []);
  // Hot Desking, only two actors with targets -> deterministic swap
  G = night(setEvent(table(), 'hotdesk'), { [ORC]: skill(5, 6), 0: skill(HR) });
  assert.deepStrictEqual(corr(G), []); assert.deepStrictEqual(oracleFx(G), []);
  G = night(setEvent(table(), 'hotdesk'), { [ORC]: skill(5, 6), 2: skill(HR, 3) });
  assert.deepStrictEqual(corr(G), [line(G, HR, 3, false)]);
});

t('T10 Mystery Intern copy, Glory Thief steal, Rune UX listing', () => {
  let G = table(); const intern = G.players[LEGAL]; intern.role = 'mystery_intern';
  intern.copy = 'data_oracle'; intern.copyFrom = G.players[ORC].name;
  night(G, { [LEGAL]: { ...skill(0, 1), side: 'FAKE' } });
  assert.deepStrictEqual(corr(G, LEGAL), [line(G, 0, 1, true)]);
  const fx = oracleFx(G).find(f => f.caster === LEGAL);
  assert.deepStrictEqual(fx.via, { source: ORC }); assert.deepStrictEqual(fx.result, { same: true });
  G = night(table(), { [ORC]: skill(0, 1), [THIEF]: skill(ORC) });
  assert(notes(G, THIEF).includes('(ขโมยมา) ' + line(G, 0, 1, true)), 'stolen with the marker');
  assert.deepStrictEqual(notes(G, ORC).filter(x => x.startsWith('Data Correlation')), [], 'stolen from the oracle');
  G = night(table(), { [ORC]: skill(0, 1), 3: skill(1) });
  assert(notes(G, 3).some(x => x.startsWith('Wireframe Trap') && x.includes(G.nm(ORC))), 'Rune UX lists the oracle');
});

t('T11 card texts', () => {
  assert(ROLES.rune_ux.d.endsWith('(นับตามเป้าหมายหลังถูกสลับโดย Scope Creep/Hot Desking)'));
  assert(TRAPS.honeypot.d.includes('Data Oracle'));
  assert(!ROLES.mystery_intern.d.includes('ถัดไปทางขวา'));
  assert(ROLES.mystery_intern.d.includes('สุ่ม'));
});

console.log(failed ? `${failed} data-correlation test(s) failed` : 'data-correlation OK');
process.exit(failed ? 1 : 0);
