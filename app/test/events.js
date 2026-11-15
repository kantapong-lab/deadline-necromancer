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
  purge() {     // ✂️ 3 messages of <= 30 code points each, emoji exempt, dark chat unlimited
    const G = setEvent(table(), 'purge'); G.phase = 'MORNING'; G.chatUsed = {};
    const chatsOf = id => G.feed.filter(f => f.kind === 'chat' && f.who === id).length;
    assert.strictEqual(G.chat(0, 'a'.repeat(30)), null, '30 code points is allowed');
    assert.strictEqual(G.viewFor(0).me.chatLeft, 2);
    assert.match(G.chat(0, 'a'.repeat(31)), /ยาวเกิน 30/, '31 is rejected, not truncated');
    assert.strictEqual(chatsOf(0), 1, 'nothing posted for the rejected message');
    assert.strictEqual(G.viewFor(0).me.chatLeft, 2, 'reject did not use quota');
    assert.strictEqual(G.chat(0, 'b'), null); assert.strictEqual(G.chat(0, 'c'), null);
    assert.match(G.chat(0, 'd'), /โควตาแชทวันนี้หมด/, '4th message rejected');
    assert.strictEqual(G.viewFor(0).me.chatLeft, 0);
    assert.strictEqual(G.chat(0, '👍'), null, 'emoji does not need quota'); assert.strictEqual(G.chat(0, '🙏'), null);
    assert.strictEqual(G.viewFor(0).me.chatLeft, 0, 'emoji never counted');
    assert.strictEqual(G.chat(1, 'x'.repeat(30) + '👍👍👍'), null, 'EMOJIS entries do not count toward 30');
    assert.strictEqual(G.viewFor(1).me.chatLeft, 2, 'mixed text uses 1');
    // Thai combining marks count as code points
    assert.strictEqual(Array.from('ที่').length, 3);
    assert.match(G.chat(2, 'ที่'.repeat(11)), /ยาวเกิน 30/, '33 code points');
    assert.strictEqual(G.chat(2, 'ที่'.repeat(10)), null, '30 code points');
    assert.deepStrictEqual(G.common().chatLimit, { msgs: 3, len: 30 });
    // dark chat is unlimited and untouched
    G.phase = 'NIGHT'; for (let i = 0; i < 6; i++) assert.strictEqual(G.darkSay(HR, 'z'.repeat(100)), null);
    // NDA Silence still limits to emoji
    G.phase = 'MORNING'; G.P(3).silenced = true;
    assert.match(G.chat(3, 'hi'), /NDA Silence/); assert.strictEqual(G.chat(3, '😂'), null);
    // control: no purge, no limits and no view fields
    const C = table(); C.phase = 'MORNING';
    assert.strictEqual(C.chat(0, 'a'.repeat(50)), null); assert.strictEqual(C.viewFor(0).me.chatLeft, undefined); assert.strictEqual(C.common().chatLimit, undefined);
    // a new draw resets the quota
    assert.strictEqual(draw(table(), 'purge').viewFor(0).me.chatLeft, 3);
  },
  hands() {     // 🧑‍🤝‍🧑 k = max(1, floor(alive/4)) alive players get weight 0, names announced
    const G = draw(table(), 'hands');
    assert.strictEqual(G.event.extra.length, 3, '12 alive -> 3');
    assert.strictEqual(new Set(G.event.extra).size, 3);
    G.event.extra.forEach(id => { assert(G.P(id).zero); assert.strictEqual(G.P(id).zeroNext, false, 'zeroNext never set'); assert(report(G).includes(G.P(id).name), 'name announced'); });
    assert.strictEqual(G.players.filter(p => p.zero).length, 3);
    assert(G.feed.some(f => f.kind === 'sys' && /More Hands on Deck/.test(f.text)));
    assert.deepStrictEqual(G.common().event.extra, G.event.extra);
    // weight 0 in the tally, but still can vote and be voted for
    const ex = G.event.extra[0], free = G.alive().filter(p => !p.zero).map(p => p.id);
    G.phase = 'VOTE'; G.votes = {};
    assert.strictEqual(G.castVote(ex, free[0]), null);
    assert.strictEqual(G.castVote(free[1], ex), null);
    const t = G.tallyVotes(); assert.strictEqual(t.tally[free[0]] || 0, 0, 'zero-weight vote adds nothing'); assert.strictEqual(t.tally[ex], 1, 'extra can be targeted');
    // alive=3 -> k=1
    const S = table(); S.players.slice(3).forEach(p => { p.alive = false; }); draw(S, 'hands');
    assert.strictEqual(S.event.extra.length, 1, 'k floors at 1');
    // reset by the existing shift at night end
    const R = draw(table(), 'hands'); R.phase = 'NIGHT'; R.night = {}; R.deck = ['approve']; R.closeNight();
    assert.strictEqual(R.players.filter(p => p.zero).length, 0, 'zero reset next morning');
    assert.strictEqual(draw(table(), 'approve').common().event.extra, undefined);
  },
  uat() {       // 🔎 after the tally 3 distinct alive players, truthful, before checkEnd
    for (let i = 0; i < 60; i++) {
      const G = setEvent(table(), 'uat'); G.phase = 'VOTE'; G.votes = { 0: HR, 1: HR, 2: HR }; G.voteRound = 0;
      G.closeVote();
      const line = G.voteResult.lines[G.voteResult.lines.length - 1];
      assert.match(line, /UAT Too Late: สุ่มทดสอบ P\d+, P\d+, P\d+ → (มีฝ่ายมืดอย่างน้อย 1 คน|ไม่มีฝ่ายมืด)/);
      const ids = [...line.split('→')[0].matchAll(/P(\d+)/g)].map(m => +m[1]);
      assert.strictEqual(new Set(ids).size, 3, 'distinct'); ids.forEach(id => assert(G.P(id).alive, 'pool = alive after ejection'));
      assert.strictEqual(/→ มีฝ่ายมืด/.test(line), ids.some(id => G.P(id).faction === 'dark'), 'truthful');
      assert(G.feed.some(f => f.text === line) && G.report.includes(line));
    }
    // ejection really happens: every alive player votes HR, so HR is out before the UAT pool is drawn
    for (let i = 0; i < 60; i++) {
      const G = setEvent(table(), 'uat'); G.phase = 'VOTE'; G.votes = {}; G.voteRound = 0;
      G.alive().forEach(p => { G.votes[p.id] = HR; });
      G.closeVote();
      assert.strictEqual(G.P(HR).alive, false, 'HR ejected');
      const line = G.voteResult.lines[G.voteResult.lines.length - 1];
      assert.match(line, /UAT Too Late: สุ่มทดสอบ P\d+, P\d+, P\d+ → /);
      const picks = line.split('→')[0];
      const ids = [...picks.matchAll(/P(\d+)/g)].map(m => +m[1]);
      assert.strictEqual(new Set(ids).size, 3, 'distinct');
      assert(!ids.includes(HR) && !picks.includes(G.P(HR).name), 'ejected name never in the UAT line');
      ids.forEach(id => assert(G.P(id).alive, 'every named player is alive'));
    }
    // ignores Honeypot, Alibi, Overpromise: only seat 7 (dark) + 0 + 1 alive, so it is always picked
    const H = setEvent(table(), 'uat'); H.players.forEach(p => { if (p.id !== HR && p.id !== 0 && p.id !== 1) p.alive = false; });
    H.P(0).overpromised = true; H.traps = [{ kind: 'honeypot', target: HR, day: H.day }, { kind: 'alibi', target: HR, day: H.day }];
    H.phase = 'VOTE'; H.votes = {}; H.closeVote();
    assert(/มีฝ่ายมืดอย่างน้อย 1 คน/.test(H.voteResult.lines.pop()), 'dark is still dark');
    // fewer than 3 alive uses all, no error
    const F = setEvent(table(), 'uat'); F.players.forEach(p => { if (p.id > 1) p.alive = false; });
    F.phase = 'VOTE'; F.votes = {}; F.closeVote();
    assert.match(F.voteResult.lines.pop(), /สุ่มทดสอบ P[01], P[01] → /);
    // announced before the game can end
    const E = setEvent(table(), 'uat'); E.players.forEach(p => { if (p.faction === 'dark' && p.id !== HR) p.alive = false; });
    E.phase = 'VOTE'; E.votes = {}; E.alive().forEach(p => { E.votes[p.id] = HR; }); E.closeVote();
    assert(E.over, 'game ended after the vote'); assert(E.feed.findIndex(f => /UAT Too Late/.test(f.text)) >= 0, 'announced before checkEnd');
    assert(E.feed.findIndex(f => /UAT Too Late/.test(f.text)) < E.feed.length - 1, 'game-over line comes after');
    // inactive: no Math.random in the final close and no UAT line
    const C = table(); C.phase = 'VOTE'; C.votes = { 0: HR }; const orig = Math.random; let calls = 0; Math.random = () => { calls++; return orig(); };
    try { C.closeVote(); } finally { Math.random = orig; }
    assert.strictEqual(calls, 0); assert(!C.voteResult.lines.some(l => /UAT/.test(l)));
  },
  redesign() {  // 🗳️ two rounds: interim counts only, round 1 has no effects, round 2 decides
    const G = setEvent(table(), 'redesign'); G.phase = 'MORNING';
    assert.strictEqual(G.toVote(), null); assert.strictEqual(G.voteRound, 1);
    assert.strictEqual(G.viewFor(0).voteRound, 1);
    G.castVote(0, HR); G.castVote(1, HR); G.castVote(2, 'SKIP');
    G.bonusVotes = [{ to: 3 }]; G.traps = [{ kind: 'blame', day: G.day - 1 }]; G.skipStreak = 0; G.mana = 3; const lv = G.lastVotes;
    const snap = JSON.stringify([G.traps, G.bonusVotes, G.skipStreak, G.mana, G.voteResult]);
    G.timer = { end: 1 };
    G.closeVote();
    assert.strictEqual(G.phase, 'VOTE_INTERIM'); assert.strictEqual(G.timer, null);
    assert(G.P(HR).alive, 'nobody ejected');
    assert.strictEqual(JSON.stringify([G.traps, G.bonusVotes, G.skipStreak, G.mana, G.voteResult]), snap, 'no round-1 side effects');
    assert.strictEqual(G.lastVotes, lv);
    const v = G.viewFor(5); assert.strictEqual(v.interim.tally[0].name, 'P7'); assert.strictEqual(v.interim.tally[0].n, 2);
    assert(v.interim.skip >= 1); assert.strictEqual(v.voteResult, null);
    assert(!/→/.test(JSON.stringify(v.interim) + G.feed.filter(f => /รอบแรก/.test(f.text)).map(f => f.text).join('')), 'no voter-to-target pairs');
    assert.strictEqual(G.modView(true).interim.skip, v.interim.skip);
    assert.strictEqual(G.chat(5, 'คุยกัน'), null, 'public chat allowed in interim');
    assert.match(G.castVote(5, HR), /ยังไม่ถึงเฟสโหวต/);
    assert.match(G.toNight(), /เปลี่ยนเฟสไม่ได้/, 'cannot skip to night'); assert.strictEqual(G.phase, 'VOTE_INTERIM');
    assert.strictEqual(G.openRound2(), null); assert.strictEqual(G.phase, 'VOTE'); assert.strictEqual(G.voteRound, 2);
    assert.match(G.openRound2(), /เปลี่ยนเฟสไม่ได้/, 'only from VOTE_INTERIM');
    assert.strictEqual(G.votes[0], HR, 'round-1 vote kept');
    assert.strictEqual(G.castVote(0, 3), null); assert.strictEqual(G.votes[0], 3, 're-vote replaces');
    G.closeVote();
    assert.strictEqual(G.phase, 'VOTE_RESULT'); assert.strictEqual(G.voteRound, 0);
    assert.strictEqual(G.lastVotes[0], 3, 'final uses round-2 vote'); assert.strictEqual(G.lastVotes[1], HR, 'kept round-1 vote');
    assert.strictEqual(G.toNight(), null);
    // Skip penalty only after round 2
    const S = setEvent(table({ mana: 1 }), 'redesign'); S.phase = 'MORNING'; S.toVote(); S.closeVote(); assert.strictEqual(S.skipStreak, 0); S.openRound2(); S.closeVote(); assert.strictEqual(S.skipStreak, 1);
    // control: non-#19 day goes straight to VOTE_RESULT
    const C = table(); C.phase = 'MORNING'; C.toVote(); assert.strictEqual(C.voteRound, 0); C.closeVote(); assert.strictEqual(C.phase, 'VOTE_RESULT'); assert.strictEqual(C.common().voteRound, undefined);
  },
  status() {     // 🛠️ night report withheld: public sees Burnout names, one on-call gets the full report
    const mk = () => { const G = table({ mana: 2 }); G.phase = 'NIGHT'; G.night = { [HR]: curse(0) }; G.deck = [...G.deck.filter(x => x !== 'status'), 'status']; return G; };
    const G = mk(); G.closeNight();
    assert.strictEqual(G.phase, 'MORNING'); assert(G.evIs('status'));
    assert.strictEqual(G.report.length, 2, 'headline + announcement only');
    assert(G.report[0].includes('P0'), 'Burnout name public'); assert(/วิศวกรเวร 1 คน/.test(G.report[1]));
    const onCall = G.event.onCall; assert(G.P(onCall).alive);
    const holders = G.players.filter(p => G.intel[p.id].some(i => /สรุปเมื่อคืน \(วิศวกรเวร\)/.test(i.text)));
    assert.deepStrictEqual(holders.map(p => p.id), [onCall], 'exactly one on-call receives it');
    assert(G.intel[onCall].some(i => /Mana/.test(i.text)), 'full report incl. Mana line');
    const other = onCall === 5 ? 4 : 5;
    assert(!JSON.stringify(G.viewFor(other)).includes('onCall') && !JSON.stringify(G.viewFor(other)).includes('fullReport'));
    assert.strictEqual(G.modView(false).onCall, undefined); assert.strictEqual(G.modView(true).onCall, onCall);
    assert(G.modView(false).statusReport.length > 1 && G.modView(false).statusReport.some(l => /Mana/.test(l)), 'moderator keeps the full report');
    assert.strictEqual(G.common().mana, G.mana); assert.strictEqual(G.common().manaMax, 6);
    assert(!JSON.stringify(G.common()).includes('onCall') && !JSON.stringify(G.pubPlayers(G.P(5), false)).includes('onCall'));
    // Meeting Hijack trap + NDA-silenced player: both status lines withheld from public, both in on-call intel and moderator statusReport
    const T = mk(); T.traps = [{ kind: 'hijack', target: null, day: T.day, fresh: false, triggered: false }]; T.P(5).silencedNext = true;
    T.closeNight();
    const pub = [...T.common().report, ...T.common().feed.map(f => f.text)].join('\n');
    assert.doesNotMatch(pub, /Meeting Hijack/, 'hijack line not public'); assert.doesNotMatch(pub, /NDA Silence/, 'NDA line not public');
    const onT = T.event.onCall; assert(T.P(onT).alive);
    assert.match(intel(T, onT), /Meeting Hijack/, 'on-call gets hijack line'); assert.doesNotMatch(intel(T, onT), /\sถูกปิดปาก \(พิมพ์แชทและโหวตไม่ได้วันนี้\)/, 'on-call must not learn who was silenced');
    const sr = T.modView(false).statusReport.join('\n');
    assert.match(sr, /Meeting Hijack/);
    // control: another card publishes the full report as before
    const C = mk(); C.deck = ['approve']; C.closeNight(); assert(C.report.some(l => /Mana/.test(l)), 'full report public'); assert.strictEqual(C.modView(false).statusReport, undefined);
    // Chaos Intern + #20 in one night: no crash
    const X = mk(); X.P(5).role = 'chaos_intern'; X.P(5).faction = ROLES.chaos_intern.f; assert.doesNotThrow(() => X.closeNight());
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
// Blame Shifting: cancels the top-voted ejection of any faction, Severance Seeker included (blocks his eject-win)
{
  const run = target => {
    const G = table(); G.phase = 'VOTE'; G.votes = {}; G.traps = [{ kind: 'blame', owner: HR, day: G.day - 1 }];
    G.alive().forEach(p => { if (p.id !== target) G.castVote(p.id, target); });
    G.closeVote(); return G;
  };
  const light = run(0); assert(light.P(0).alive, 'Blame cancels a light ejection'); assert.match(light.voteResult.text, /Blame Shifting/);
  const dark = run(DEVOPS); assert(dark.P(DEVOPS).alive, 'Blame cancels a dark ejection');
  const sk = run(10); assert(sk.P(10).alive && !sk.P(10).soloWon, 'Blame stops the Severance Seeker eject-win'); assert.match(sk.voteResult.text, /Blame Shifting/);
  console.log('  ok   Blame Shifting any faction, Seeker included');
}

// No-repeat targeting: a targeted skill / curse / trap target cannot be the same player as last night's chosen target
{
  const REPEAT = /ห้ามเลือกเป้าหมายเดิม/;
  const nextNight = G => { G.phase = 'VOTE_RESULT'; G.toNight(); return G; };
  const firstNight = () => { const G = table(); G.phase = 'NIGHT'; G.night = {}; return G; };
  // (a) skill target repeat rejected, a different target accepted
  let G = firstNight();
  assert.strictEqual(G.submitNight(1, skill(0)), null);
  nextNight(G);
  assert.match(G.submitNight(1, skill(0)), REPEAT, 'same skill target two nights in a row');
  assert(!G.candidates(G.P(1)).some(x => x.id === 0), 'candidates hide last night target');
  assert.deepStrictEqual(G.viewFor(1).me.repeatBlocked, [0], 'view reports the blocked target');
  assert.strictEqual(G.submitNight(1, skill(2)), null);
  // (b) a night without a targeted skill resets the restriction
  G = firstNight(); G.submitNight(1, skill(0)); nextNight(G);
  setEvent(G, 'snack'); assert.strictEqual(G.submitNight(1, { type: 'REST' }), null);
  nextNight(G); assert.strictEqual(G.submitNight(1, skill(0)), null, 'REST night resets the rule');
  // (c) dark CURSE target repeat rejected
  G = firstNight();
  assert.strictEqual(G.submitNight(HR, { type: 'SKILL', targets: [0], side: 'CURSE', sideTargets: [3] }), null);
  nextNight(G);
  assert.match(G.submitNight(HR, { type: 'SKILL', targets: [1], side: 'CURSE', sideTargets: [3] }), REPEAT, 'same curse target');
  assert.strictEqual(G.submitNight(HR, { type: 'SKILL', targets: [1], side: 'CURSE', sideTargets: [4] }), null);
  // (d) not enough other choices -> rule waived (QA Hunter needs 2 targets, only 3 players left)
  G = firstNight(); G.players.forEach(p => { if (![0, 1, 2].includes(p.id)) p.alive = false; });
  assert.strictEqual(G.submitNight(2, skill(0, 1)), null);
  nextNight(G);
  assert.strictEqual(G.submitNight(2, skill(0, 1)), null, 'waived when fewer than 2 other choices remain');
  assert.deepStrictEqual(G.viewFor(2).me.repeatBlocked, [], 'nothing shown as blocked when waived');
  console.log('  ok   No-repeat targeting (skill / curse, reset, waiver)');
}

process.exit(failed ? 1 : 0);

