// Demo players for watching the 3D Moderator screen (public/mod3d.html) without a table of people.
//   1) npm start            2) open /mod and create a room (note the 4-letter code)
//   3) node tools/demo-bots.js ROOMCODE [players=9] [url=http://localhost:3000]
//   4) open /mod3d.html (same browser, so it picks up the saved Moderator session), start the game from /mod, and drive the phases.
// The bots follow tips from docs/deadline_necromancer_strategy.md (role-aware votes / night actions, Booster picks, Trap use, morning chat
// + the dark faction's night chat) so the 3D screen sees varied play. The Moderator still advances every phase.
// STRATEGY=0 falls back to the old purely random bots.
const { io } = require('socket.io-client');
const [code, countArg, urlArg] = process.argv.slice(2);
if (!code) { console.log('usage: node tools/demo-bots.js ROOMCODE [players=9] [url=http://localhost:3000]'); process.exit(1); }
const N = Math.max(6, Math.min(12, Number(countArg) || 9)), URL = urlArg || 'http://localhost:3000';
const NAMES = ['มด', 'พี่เอก', 'น้องฟ้า', 'โอ๊ต', 'มิ้นท์', 'บอส', 'ฝน', 'ต้น', 'เจ', 'ปลา', 'แพร', 'ก้อง'];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const STRAT = process.env.STRATEGY !== '0';
// one-liners distilled from docs/deadline_necromancer_strategy.md
const SAY = {
  light: ['ไม่ Skip ถ้าไม่จำเป็น — Mana ขึ้นช้าไป', 'เมื่อเช้า Mana ขึ้นน้อยกว่าที่ควร น่าจะมีคนวางบั๊ก', 'ใครโหวตเปลี่ยนใจนาทีสุดท้ายบ้าง ขอดู Ledger หน่อย', 'ผลส่องขัดกับพฤติกรรม ขอรอหลักฐานอีกนิด',
    'สายสืบเปิดตัวเมื่อมีหลักฐานนะ อย่ารีบ', 'ไล่คนที่น่าสงสัยที่สุด ดีกว่า Skip', 'ใครอยากให้ตัวเองโดนไล่ผิดปกติ ระวังฝ่ายอิสระ', 'ไขว้ข้อมูลหลายทางก่อนโหวตนะ', 'วันนี้ขอฮีลคนที่เชื่อใจได้ไว้โหวต 2 เท่า'],
  dark: ['รอข้อมูลอีกวันดีไหม ยังไม่ชัวร์', 'ผมว่าอย่าเพิ่งรีบไล่ เสี่ยงไล่คนผิด', 'คนที่พูดเก่งเกินไปน่าสงสัยนะ', 'Skip บ้างก็ได้ ไม่เห็นเป็นไร', 'คนนั้นโหวตตามกลุ่มตลอดเลย ดูแปลก',
    'Blame Shifting โผล่มา ใครกันที่ได้ประโยชน์', 'ผลส่องอาจโดนบิดนะ Honeypot ก็มี', 'เมื่อคืนผมส่งงานจริงนะ ไม่ได้วางบั๊ก'],
  indie: ['ผมแค่ดูอยู่เฉย ๆ ครับ', 'ขอ Retro เปิดชื่อเลยดีไหม', 'ใครว่างเรามาเรียงลำดับความสงสัยกัน', 'อย่าเพิ่งไล่ รอดูอีกคืน', 'Reply All ไปทำไมเนี่ย 555'],
  dark_night: ['คืนนี้ใครสาป ใครวางบั๊ก?', 'อย่าวางบั๊กซ้อนกัน หักได้สูงสุด -1', 'ฆ่าสายสืบก่อน', 'ลอง reroll Trap หาใบที่เข้ากับสถานการณ์', 'คืนนี้วางบั๊กดีกว่าสาป เป้าน่าจะโดนกัน', 'เก็บ Deploy ไว้คืนชี้ขาด'],
};
const EMO = ['👍', '😅', '🤔', '🔥', '☕'];
const say = (s, ev, text) => emit(s, ev, { text });
const emit = (s, ev, data) => new Promise(r => s.emit(ev, data, r));

const LIMITED = ['release_alchemist', 'chrono_tech_lead'];   // strategy 16/17: keep limited-use skills for the late / critical nights
function bot(name) {
  const s = io(URL, { forceNew: true }), done = new Set();
  const once = (k, fn) => { if (done.has(k)) return; done.add(k); fn(); };
  const later = (fn, a = 400, b = 2500) => setTimeout(fn, a + Math.random() * b);
  s.on('connect', async () => { const r = await emit(s, 'player:join', { code, name }); if (!r.ok) console.log(name + ': ' + r.error); });
  s.on('state', v => {
    s.last = v;
    if (!v || v.role !== 'player' || !v.me || !v.me.alive) return;
    const me = v.me, key = `${v.day}:${v.phase}`, fac = me.faction || 'light', others = v.players.filter(x => x.alive && !x.me);
    // ---- morning chat (also at the half-time break): 1-3 lines from the faction's strategy pool, sometimes an emoji or a name-drop
    if (STRAT && (v.phase === 'MORNING' || v.phase === 'VOTE_INTERIM')) once(key + 'chat', () => {
      const n = 1 + Math.floor(Math.random() * 3), cap = v.chatLimit;
      for (let k = 0; k < n; k++) setTimeout(() => {
        let t = Math.random() < .2 || me.silenced ? rnd(EMO) : rnd(SAY[fac] || SAY.light);
        if (!me.silenced && !cap && others.length && Math.random() < .3) t = `${rnd(others).name} ${rnd(['น่าสงสัยนะ', 'เมื่อคืนทำอะไรอยู่', 'ช่วยอธิบายหน่อย'])} — ${t}`;
        if (cap) t = rnd(EMO);   // Meeting Purge: stay inside the quota
        say(s, 'p:chat', t);
      }, 600 + k * 1500 + Math.random() * 2500);
    });
    if (v.phase === 'MORNING') {
      if (v.event && v.event.pending && me.eventVote === undefined) once(key + 'e', () => setTimeout(() => emit(s, 'p:event', { accept: STRAT ? Math.random() < (fac === 'dark' ? .35 : .6) : Math.random() < .5 }), 400 + Math.random() * 2500));
      if (v.boosterOpen && me.boosterVote === undefined) once(key + 'b', () => setTimeout(() => {
        // strategy 19: suspect bent intel → Debug Scanner · room dithering → Retrospective · critical night → Emergency Freeze
        const pick = !STRAT ? rnd(['scanner', 'retro', 'freeze', 'NONE']) : fac === 'dark' ? rnd(['NONE', 'NONE', 'retro']) : v.day >= 4 ? rnd(['freeze', 'retro', 'scanner']) : v.day === 1 ? 'NONE' : rnd(['scanner', 'retro', 'NONE']);
        emit(s, 'p:booster', { key: pick });
      }, 600 + Math.random() * 3000));
    } else if (v.phase === 'VOTE' && me.voted === undefined && !me.silenced) {
      once(key + 'v', () => setTimeout(() => {
        const c = v.voteCandidates.filter(id => id !== me.id), P = id => v.players.find(x => x.id === id) || {};
        let t;
        if (!STRAT) t = Math.random() < .2 ? 'SKIP' : rnd(v.voteCandidates);
        else if (fac === 'dark') { const lights = c.filter(id => !P(id).mate); t = (v.day % 2 === 0 && Math.random() < .5) || !lights.length ? 'SKIP' : rnd(lights); }   // strategy 2: don't be the only Skip caller → alternate
        else if (me.role === 'chaos_intern') t = v.day >= 4 && Math.random() < .5 ? 'SKIP' : rnd(c);                                                                      // strategy 18-19
        else t = Math.random() < (v.day === 1 ? .3 : .08) ? 'SKIP' : rnd(c.length ? c : v.voteCandidates);                                                                  // strategy 1: don't Skip unless needed
        emit(s, 'p:vote', { target: t });
      }, 500 + Math.random() * 3000));
    } else if (v.phase === 'NIGHT' && !me.submitted) {
      once(key + 'n', () => setTimeout(async () => {
        let a = { type: 'REST' }; try {
        let dk = v.dark;
        const holdBack = STRAT && LIMITED.includes(me.role) && v.day < 3;
        if (me.skillOK && !me.skillsBanned && !holdBack && Math.random() < (STRAT ? .92 : .85)) {
          const t = Math.max(me.spec.t, 0), c = me.candidates.slice().sort(() => Math.random() - .5);
          a = { type: 'SKILL', targets: c.slice(0, t) };
          if (me.role === 'soul_recruiter' && !me.plus1Used && Math.random() < (STRAT && v.day >= 3 ? .8 : .3)) a.plus1 = true;   // strategy 11: spend the +1 on the decisive day
        }
        if (me.faction === 'dark') {
          if (STRAT) {
            if (dk.canReroll && Math.random() < .5) { await emit(s, 'p:traproll', {}); await new Promise(r => setTimeout(r, 400)); if (s.last && s.last.dark) dk = s.last.dark; }   // strategy 16: free reroll (then use the fresh hand)
            if (Math.random() < .8) say(s, 'p:dark', rnd(SAY.dark_night));                        // strategy 4: plan in the secret chat
          }
          const r = Math.random(), monday = STRAT && v.day === 1;                                  // strategy 5: Monday = intel night, no killing
          if (r < (STRAT ? .35 : .25) && dk.trapFree > 0 && dk.trapHand.length) {
            const k = rnd(dk.trapHand), need = dk.trapNeed[k]; a.side = 'TRAP'; a.trapId = k;
            if (need) { const pool = v.players.filter(x => x.alive && (need === 'any' || (need === 'dark' ? (x.mate || x.me) : !(x.mate || x.me)))); if (pool.length) a.sideTargets = [rnd(pool).id]; }
          } else if (!monday && r < .6 && !dk.curseBlocked && dk.lights.length) { a.side = 'CURSE'; a.sideTargets = [rnd(dk.lights)]; }
          else a.side = Math.random() < (STRAT ? .7 : .5) ? 'SABOTAGE' : 'FAKE';                   // strategy 9: bug instead of a kill that will be blocked
        }
        } catch (e) { console.log(name, 'night plan failed:', e.message); a = { type: 'REST', ...(me.faction === 'dark' ? { side: 'FAKE' } : {}) }; }
        let res = await emit(s, 'p:night', a);
        if (!res.ok) {
          if (process.env.BOT_DEBUG) console.log(name, 'night rejected:', res.error, JSON.stringify(a));
          const side = me.faction === 'dark' ? { side: 'FAKE' } : {};
          const t = Math.max(me.spec.t, 0), c = me.candidates.slice().sort(() => Math.random() - .5);
          const tries = [{ type: 'REST', ...side }, ...(me.skillOK && c.length >= t ? [{ type: 'SKILL', targets: c.slice(0, t), ...side }] : [])];   // some events force everyone to use their skill → retry as SKILL
          for (const x of tries.reverse()) { res = await emit(s, 'p:night', x); if (res.ok) break; }   // SKILL first, then REST
        }
      }, 600 + Math.random() * 3500));
    }
  });
  return s;
}
Array.from({ length: N }, (_, i) => bot(NAMES[i])).forEach((s, i) => console.log('bot', NAMES[i]));
console.log(`${N} bots joined room ${code} at ${URL}. Start the game from /mod, then drive the phases (Ctrl+C stops the bots).`);
