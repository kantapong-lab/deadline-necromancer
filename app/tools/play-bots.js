// Plays a whole game with socket bots against a RUNNING server (the real client path: chat, votes, night skills).
// The script also acts as the moderator, so you can watch it live on /mod3d.html.
//
//   npm start                                   (in one terminal)
//   node tools/play-bots.js                     (in another; or: npm run bots -- --pace 2000)
//
// Options:  --port 3000   --players 7 (min..max per the server)   --pace 3000 (ms between steps)
//           --no-wait     start immediately instead of waiting for you to open the 3D page
// Watching: the script prints a one-line snippet. Paste it into the browser console on the server's origin
//           (any page of it), then open /mod3d.html and press Enter in this terminal.
const { io } = require('socket.io-client');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const PORT = arg('port', process.env.PORT || 3000), N = +arg('players', 7), PACE = +arg('pace', 3000), NOWAIT = !!arg('no-wait', false);
const URL = 'http://localhost:' + PORT;
const em = (s, ev, d) => new Promise(r => s.emit(ev, d, r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const rnd = a => a[Math.floor(Math.random() * a.length)];
const say = ['ฉันว่ามีคนแอบอู้', 'ใครส่งงานจริงบ้าง?', 'ดูแปลกๆ นะ', '🤔', 'ขอเวลาคิด', 'อย่าเพิ่งโหวตมั่ว'];

(async () => {
  const mod = io(URL, { forceNew: true });
  const c = await em(mod, 'mod:create', {});
  if (!c || !c.code) { console.error('mod:create failed — is the server running on ' + URL + ' ?'); process.exit(1); }
  console.log('ห้อง', c.code);
  console.log('วางในคอนโซลเบราว์เซอร์ (origin ' + URL + ') แล้วเปิด ' + URL + '/mod3d.html :');
  console.log(`localStorage.setItem('dn-mod', JSON.stringify({code:'${c.code}',modToken:'${c.modToken}'}))`);
  if (!NOWAIT) { console.log('\nกด Enter เพื่อเริ่มเกม...'); await new Promise(r => process.stdin.once('data', r)); }

  const ps = [];
  for (let i = 0; i < N; i++) {
    const s = io(URL, { forceNew: true }); s.on('state', v => { s.v = v; });
    const r = await em(s, 'player:join', { code: c.code, name: 'Bot' + (i + 1) });
    if (!r || !r.ok) { console.error('join failed:', r && r.error); process.exit(1); }
    ps.push(s);
  }
  await wait(1500);
  const md = (action, payload) => em(mod, 'mod:do', { action, payload });
  const st = await md('start'); if (!st || !st.ok) { console.error('start failed:', st && st.error); process.exit(1); }
  await wait(2000);

  for (let guard = 0; guard < 80; guard++) {
    const v = ps[0].v, ph = v.phase;
    if (ph === 'OVER') break;
    console.log(`-- ${ph} (วัน ${v.day})`);
    if (ph === 'MORNING') {
      for (const s of ps) {
        if (s.v.me.alive && Math.random() < .7) await em(s, 'p:chat', { text: rnd(say) });
        if (s.v.event && s.v.event.pending) await em(s, 'p:event', { accept: Math.random() < .5 });
        if (s.v.booster && s.v.booster.open) await em(s, 'p:booster', { key: 'NONE' });
      }
      await wait(PACE * 2);
      await md('closeEventVote'); await md('closeBoosterVote'); await md('toVote');
    } else if (ph === 'VOTE') {
      for (const s of ps) if (s.v.me.alive) await em(s, 'p:vote', { target: Math.random() < .2 ? 'SKIP' : rnd(s.v.voteCandidates) });
      await wait(PACE); await md('closeVote');
    } else if (ph === 'VOTE_RESULT') {
      await wait(PACE); await md('toNight');
    } else if (ph === 'NIGHT') {
      for (const s of ps) {
        const me = s.v.me; if (!me.alive) continue;
        let a = { type: 'REST' };
        if (me.skillOK && me.spec && me.candidates.length && Math.random() < .85)
          a = { type: 'SKILL', targets: [...me.candidates].sort(() => Math.random() - .5).slice(0, Math.max(1, me.spec.t || 1)) };
        if (me.spec && me.spec.t === 0) a = { type: 'SKILL', targets: [] };
        if (s.v.dark && s.v.dark.lights.length) a.side = Math.random() < .5 ? 'SABOTAGE' : 'FAKE';
        const r = await em(s, 'p:night', a); if (r && !r.ok) await em(s, 'p:night', { type: 'REST' });
      }
      await wait(PACE * 2); await md('closeNight');
    } else await wait(1000);
    await wait(PACE);
  }
  const o = ps[0].v.over;
  console.log('\nจบเกม:', o ? `${o.side} — ${o.why}` : '(ไม่จบในจำนวนรอบที่กำหนด)');
  if (o) console.log(o.roles.map(r => `${r.name}=${r.role}(${r.faction})`).join('  '));
  process.exit(o ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
