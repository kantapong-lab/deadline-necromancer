// Quick-reply phrases (QUICK_REPLIES in src/shared/data.js) go through the unchanged chat() path.
//   node test/quick-replies.js
const assert = require('assert');
const { Game } = require('../src/engine');
const { ROLES, QUICK_REPLIES } = require('../src/shared/data');
const { EMOJIS, PURGE_LEN } = require('../src/engine/constants');

const ROLE_SET = ['senior_dev', 'oracle_pm', 'qa_hunter', 'rune_ux', 'data_oracle', 'coffee_admin', 'chrono_tech_lead',
  'shadow_hr', 'shadow_legal', 'chaos_devops', 'severance_seeker', 'glory_thief'];
function table({ purge = false } = {}) {
  const G = new Game(ROLE_SET.map((_, i) => 'P' + i));
  G.players.forEach((p, i) => { p.role = ROLE_SET[i]; p.faction = ROLES[p.role].f; });
  G.day = 2; G.mana = 2; G.manaMax = 6; G.phase = 'MORNING';
  if (purge) { G.event = { id: 'purge', accepted: null, pending: false, votes: {} }; G.chatUsed = {}; }
  return G;
}
const Q = QUICK_REPLIES;
const tests = {
  'list: 23 unique phrases, all valid'() {
    assert.strictEqual(Q.length, 23);
    assert.strictEqual(new Set(Q).size, 23);
    Q.forEach(p => {
      assert(typeof p === 'string' && p && p === p.trim());
      assert(!EMOJIS.includes(p));
      assert(Array.from(p).length <= PURGE_LEN, p);
    });
    assert.strictEqual(Q[12], 'ขอโหวต Skip รอบนี้');
    assert.strictEqual(Q[0], 'ซัสสส ชัดเจน');
    assert.strictEqual(Q[22], 'ฝ่ายมืดคืนนี้นอนไม่หลับแน่');
  },
  'purge: phrase counts 1'() {
    const G = table({ purge: true });
    assert.strictEqual(G.viewFor(0).me.chatLeft, 3);
    for (const [i, left] of [[0, 2], [5, 1]]) {
      assert.strictEqual(G.chat(0, Q[i]), null);
      assert.strictEqual(G.viewFor(0).me.chatLeft, left);
      const f = G.feed[G.feed.length - 1];
      assert.strictEqual(f.text, Q[i]); assert.strictEqual(f.kind, 'chat'); assert.strictEqual(f.who, 0);
    }
  },
  'no purge: unlimited, uncounted'() {
    const G = table();
    for (let i = 0; i < 5; i++) assert.strictEqual(G.chat(0, Q[i]), null);
    assert.strictEqual(G.chatUsed[0], undefined);
    assert.strictEqual(G.viewFor(0).me.chatLeft, undefined);
  },
  'purge quota 0: phrase rejected, emoji ok'() {
    const G = table({ purge: true });
    for (let i = 0; i < 3; i++) assert.strictEqual(G.chat(0, Q[i]), null);
    const n = G.feed.length;
    assert.match(G.chat(0, Q[3]), /โควตาแชทวันนี้หมด/);
    assert.strictEqual(G.feed.length, n);
    assert.strictEqual(G.viewFor(0).me.chatLeft, 0);
    assert.strictEqual(G.chat(0, '👍'), null);
  },
  'silence: phrase rejected, emoji ok'() {
    for (const purge of [false, true]) {
      const G = table({ purge }); G.P(0).silenced = true;
      const n = G.feed.length;
      Q.forEach(p => assert.match(G.chat(0, p), /NDA Silence/));
      assert.strictEqual(G.feed.length, n);
      if (purge) assert.deepStrictEqual(G.chatUsed, {});
      assert.strictEqual(G.chat(0, '😂'), null);
    }
  },
  'altered phrase takes the typed path'() {
    let G = table();
    assert.strictEqual(G.chat(0, Q[0] + 'x'), null);
    assert.strictEqual(G.feed[G.feed.length - 1].text, Q[0] + 'x');
    G = table({ purge: true });
    assert.strictEqual(Array.from(Q[15]).length, 29);
    assert.match(G.chat(0, Q[15] + 'xy'), /ยาวเกิน 30/);
    assert.strictEqual(G.chatUsed[0], undefined);
    assert.strictEqual(G.chat(0, Q[15]), null);
    assert.strictEqual(G.chat(1, ' ' + Q[3] + ' '), null);
    assert.strictEqual(G.feed[G.feed.length - 1].text, Q[3]);
    G = table(); G.P(0).silenced = true;
    assert.match(G.chat(0, Q[0] + 'x'), /NDA Silence/);
  },
  'skip phrase is chat only'() {
    for (const phase of ['MORNING', 'VOTE_INTERIM']) {
      const G = table(); G.phase = phase;
      const snap = () => JSON.stringify([G.votes, G.mana, G.skipStreak, G.voteResult]);
      const before = snap();
      assert.strictEqual(G.chat(0, Q[12]), null);
      assert.strictEqual(snap(), before);
    }
  },
};
let fail = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n' + e.stack); }
}
if (fail) process.exit(1);
console.log('quick-replies: all passed');
