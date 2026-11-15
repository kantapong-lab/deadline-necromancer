// ทดสอบ end-to-end: Moderator + ผู้เล่นหลายคนผ่าน Socket.IO จนจบเกม (ไม่ต้องเปิดเบราว์เซอร์)
process.env.PORT = process.env.TEST_PORT || '3111';
const { io: Client } = require('socket.io-client');
const { httpServer } = require('../src/server/index');
const URL = 'http://localhost:' + process.env.PORT;
const rnd = a => a[Math.floor(Math.random() * a.length)];
const emit = (s, ev, data) => new Promise(res => s.emit(ev, data, res));
const wait = ms => new Promise(r => setTimeout(r, ms));

const STATS = { prodGames: 0, prodAccept: 0, prodReject: 0, genericBlock: 0 };
async function playGame(N, verbose) {
  const mod = Client(URL); const modState = {}; mod.on('state', s => Object.assign(modState, { v: s }));
  const created = await emit(mod, 'mod:create'); const code = created.code;
  const players = [];
  for (let i = 0; i < N; i++) {
    const s = Client(URL); const p = { s, name: 'P' + i, v: null }; s.on('state', v => p.v = v);
    const r = await emit(s, 'player:join', { code, name: p.name }); if (!r.ok) throw new Error('join ' + r.error);
    p.token = r.token; players.push(p);
  }
  await wait(50);
  const bad = await emit(players[0].s, 'p:vote', { target: 1 }); if (bad.ok) throw new Error('vote before start should fail');
  const st = await emit(mod, 'mod:do', { action: 'start' }); if (!st.ok) throw new Error('start ' + st.error);
  await wait(50);
  const errs = []; let steps = 0;
  const md = async (a, payload) => { const r = await emit(mod, 'mod:do', { action: a, payload }); if (!r.ok) errs.push(a + ': ' + r.error); await wait(5); };
  while (modState.v.phase !== 'OVER' && steps++ < 200) {
    const ph = modState.v.phase;
    // ความลับต้องไม่รั่ว: ผู้เล่นต้องไม่เห็นบทบาทของคนอื่น
    for (const p of players) for (const q of p.v.players) if (!q.me && q.role && q.alive && !q.mate && p.v.phase !== 'OVER') throw new Error('role leak to ' + p.name);
    if (ph === 'MORNING') {
      for (const p of players) { if (!p.v.me.alive) continue;
        await emit(p.s, 'p:chat', { text: 'hello ' + p.name });
        if (p.v.event?.pending) await emit(p.s, 'p:event', { accept: Math.random() < .5 });
        if (p.v.boosterOpen) await emit(p.s, 'p:booster', { key: rnd(['NONE', 'NONE', 'scanner', 'retro', 'freeze']) }); }
      await md('toVote');
    } else if (ph === 'VOTE') {
      for (const p of players) { if (!p.v.me.alive || p.v.me.silenced || p.v.me.hijacked) continue;
        const t = Math.random() < .35 && !p.v.marathon ? 'SKIP' : rnd(p.v.voteCandidates);
        const r = await emit(p.s, 'p:vote', { target: t }); if (!r.ok) errs.push('vote ' + r.error); }
      await md('closeVote');
    } else if (ph === 'VOTE_INTERIM') {
      const p = players.find(x => x.v.me.alive); if (p) await emit(p.s, 'p:chat', { text: 'interim ' + p.name });
      await md('openRound2');
    } else if (ph === 'VOTE_RESULT') await md('toNight');
    else if (ph === 'NIGHT') {
      const sent = {};
      for (const p of players) { const me = p.v.me; if (!me.alive) continue;
        let a;
        if (me.skillOK && !me.skillsBanned && !(me.once && Math.random() < .6)) {
          const t = Math.max(me.spec.t, 0), c = me.candidates.slice().sort(() => Math.random() - .5);
          a = { type: 'SKILL', targets: c.slice(0, t) };
          if (me.role === 'soul_recruiter' && !me.plus1Used && Math.random() < .3) a.plus1 = true;
        } else a = { type: 'REST' };
        if (me.faction === 'dark') {
          const lights = p.v.dark.lights; const r = Math.random();
          if (r < .25) { a.side = 'FAKE'; } else if (r < .5) a.side = 'SABOTAGE';
          else if (r < .75 && !p.v.dark.curseBlocked) { a.side = 'CURSE'; a.sideTargets = [rnd(lights)]; }
          else if (p.v.dark.trapCharges > 0 && p.v.dark.trapHand.length) { const k = rnd(p.v.dark.trapHand); const need = p.v.dark.trapNeed[k];
            a.side = 'TRAP'; a.trapId = k; if (need) { const pool = p.v.players.filter(x => x.alive && (need === 'any' || (need === 'dark' ? x.mate || x.me : !(x.mate || x.me)))); a.sideTargets = [rnd(pool).id]; } }
          else a.side = 'FAKE';
        }
        let r = await emit(p.s, 'p:night', a);
        if (!r.ok && /โควตา Trap|เพื่อนจอง Trap/.test(r.error)) { a.side = 'FAKE'; delete a.trapId; a.sideTargets = []; r = await emit(p.s, 'p:night', a); }   // อีกคนหมอบ Trap ใบสุดท้ายไปก่อน
        if (!r.ok) errs.push(`night ${me.roleName}: ${r.error} ${JSON.stringify(a)}`);
        await emit(p.s, 'p:dark', { text: 'plan' });
      }
      await md('closeNight');
    }
    await wait(5);
  }
  const tl = modState.v.timeline || [];
  if (tl.some(t => /Event Card #13/.test(t.title))) { STATS.prodGames++; tl.forEach(t => { if (/Production Crisis: ฝ่ายแสง 1 คน/.test(t.text)) STATS.prodAccept++; if (/Production Crisis \(ปฏิเสธ\)/.test(t.text)) STATS.prodReject++; }); }
  tl.forEach(t => { if (/ไม่ทราบสาเหตุ/.test(t.text)) STATS.genericBlock++; });
  const over = modState.v.over; const ok = !!over && errs.length === 0;
  mods(); function mods() { mod.close(); players.forEach(p => p.s.close()); }
  return { ok, side: over?.side, steps, errs: errs.slice(0, 5) };
}

(async () => {
  const sizes = (process.argv[2] || '8,6,12,9,7,10,11').split(',').map(Number);
  const rounds = Number(process.argv[3] || 3);
  let fail = 0; const tally = {};
  for (let r = 0; r < rounds; r++) for (const n of sizes) {
    const res = await playGame(n);
    tally[n] = tally[n] || { light: 0, dark: 0 }; tally[n][res.side]++;
    if (!res.ok) { fail++; console.log('FAIL N=' + n, JSON.stringify(res)); }
  }
  console.log('stats:', JSON.stringify(STATS));
  console.log('winners by size:', JSON.stringify(tally), fail ? `FAILED ${fail}` : 'ALL OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
