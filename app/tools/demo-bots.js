// Demo players for watching the 3D Moderator screen (public/mod3d.html) without a table of people.
//   1) npm start            2) open /mod and create a room (note the 4-letter code)
//   3) node tools/demo-bots.js ROOMCODE [players=9] [url=http://localhost:3000]
//   4) open /mod3d.html (same browser, so it picks up the saved Moderator session), start the game from /mod, and drive the phases.
// The bots vote, answer event / booster polls and submit random legal night actions; the Moderator still advances every phase.
const { io } = require('socket.io-client');
const [code, countArg, urlArg] = process.argv.slice(2);
if (!code) { console.log('usage: node tools/demo-bots.js ROOMCODE [players=9] [url=http://localhost:3000]'); process.exit(1); }
const N = Math.max(6, Math.min(12, Number(countArg) || 9)), URL = urlArg || 'http://localhost:3000';
const NAMES = ['มด', 'พี่เอก', 'น้องฟ้า', 'โอ๊ต', 'มิ้นท์', 'บอส', 'ฝน', 'ต้น', 'เจ', 'ปลา', 'แพร', 'ก้อง'];
const rnd = a => a[Math.floor(Math.random() * a.length)];
const emit = (s, ev, data) => new Promise(r => s.emit(ev, data, r));

function bot(name) {
  const s = io(URL, { forceNew: true }), done = new Set();
  const once = (k, fn) => { if (done.has(k)) return; done.add(k); fn(); };
  s.on('connect', async () => { const r = await emit(s, 'player:join', { code, name }); if (!r.ok) console.log(name + ': ' + r.error); });
  s.on('state', v => {
    if (!v || v.role !== 'player' || !v.me || !v.me.alive) return;
    const me = v.me, key = `${v.day}:${v.phase}`;
    if (v.phase === 'MORNING') {
      if (v.event && v.event.pending && me.eventVote === undefined) once(key + 'e', () => setTimeout(() => emit(s, 'p:event', { accept: Math.random() < .5 }), 400 + Math.random() * 2500));
      if (v.boosterOpen && me.boosterVote === undefined) once(key + 'b', () => setTimeout(() => emit(s, 'p:booster', { key: rnd(['scanner', 'retro', 'freeze', 'NONE']) }), 600 + Math.random() * 3000));
    } else if (v.phase === 'VOTE' && me.voted === undefined && !me.silenced) {
      once(key + 'v', () => setTimeout(() => emit(s, 'p:vote', { target: Math.random() < .2 ? 'SKIP' : rnd(v.voteCandidates) }), 500 + Math.random() * 3000));
    } else if (v.phase === 'NIGHT' && !me.submitted) {
      once(key + 'n', () => setTimeout(async () => {
        const dk = v.dark; let a = { type: 'REST' };
        if (me.skillOK && !me.skillsBanned && Math.random() < .85) {
          const t = Math.max(me.spec.t, 0), c = me.candidates.slice().sort(() => Math.random() - .5);
          a = { type: 'SKILL', targets: c.slice(0, t) };
          if (me.role === 'soul_recruiter' && !me.plus1Used && Math.random() < .4) a.plus1 = true;
        }
        if (me.faction === 'dark') {
          const r = Math.random();
          if (r < .25 && dk.trapFree > 0 && dk.trapHand.length) {
            const k = rnd(dk.trapHand), need = dk.trapNeed[k]; a.side = 'TRAP'; a.trapId = k;
            if (need) { const pool = v.players.filter(x => x.alive && (need === 'any' || (need === 'dark' ? (x.mate || x.me) : !(x.mate || x.me)))); a.sideTargets = [rnd(pool).id]; }
          } else if (r < .5 && !dk.curseBlocked && dk.lights.length) { a.side = 'CURSE'; a.sideTargets = [rnd(dk.lights)]; }
          else a.side = Math.random() < .5 ? 'SABOTAGE' : 'FAKE';
        }
        let res = await emit(s, 'p:night', a);
        if (!res.ok) { a = { type: 'REST', ...(me.faction === 'dark' ? { side: 'FAKE' } : {}) }; res = await emit(s, 'p:night', a); }
      }, 600 + Math.random() * 3500));
    }
  });
  return s;
}
Array.from({ length: N }, (_, i) => bot(NAMES[i])).forEach((s, i) => console.log('bot', NAMES[i]));
console.log(`${N} bots joined room ${code} at ${URL}. Start the game from /mod, then drive the phases (Ctrl+C stops the bots).`);
