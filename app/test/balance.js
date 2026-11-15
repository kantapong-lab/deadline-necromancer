// Balance simulation: plays many headless games on the real engine and prints win rates per player count.
// Not part of `npm test` (random, slow-ish, no pass/fail). Run: npm run balance -- [rounds] [sizes] [acc]
//   rounds  games per size            (default 1000)
//   sizes   comma list of player counts (default 6,7,8,9,10,11,12)
//   acc     chance a light voter picks a real dark player instead of a random one (default 0.4)
// Env overrides BALANCE_COMP / BALANCE_MANA let you try rule changes before editing the engine.
// Bots are crude: skills hit random targets, so treat results as direction, not truth.
// Light win rate near 50% at every size is the goal; compare before/after a rules change.
const { Game } = require('../src/engine');
const { COMP } = require('../src/engine/constants');

// What-if overrides without editing the engine: BALANCE_COMP='9:6,2,1;10:7,2,1' (light,dark,freelancer)
// and BALANCE_MANA='9:5;10:6' (ManaMax per size).
const parse = v => Object.fromEntries((v || '').split(';').filter(Boolean).map(p => p.split(':')));
const MANA = parse(process.env.BALANCE_MANA);
for (const [n, c] of Object.entries(parse(process.env.BALANCE_COMP))) COMP[n] = c.split(',').map(Number);

const rnd = a => a[Math.floor(Math.random() * a.length)];
const ONCE = new Set(['chrono_tech_lead', 'chaos_devops']);

function play(N, o) {
  const G = new Game(Array.from({ length: N }, (_, i) => 'P' + i));
  if (MANA[N]) G.manaMax = Number(MANA[N]);
  for (let guard = 0; G.phase !== 'OVER' && guard < 50; guard++) {
    if (G.phase === 'MORNING') G.toVote();
    if (G.phase === 'VOTE') {
      for (const p of G.alive()) {
        const others = G.alive().filter(x => x.id !== p.id);
        let t;
        if (p.faction === 'dark') t = Math.random() < o.darkSkip ? 'SKIP' : rnd(others.filter(x => x.faction !== 'dark')).id;
        else {
          const darks = others.filter(x => x.faction === 'dark');
          if (Math.random() < o.skip) t = 'SKIP';
          else if (p.faction === 'light' && darks.length && Math.random() < o.acc) t = rnd(darks).id;
          else t = rnd(others).id;
        }
        G.castVote(p.id, t);
      }
      G.closeVote();
      if (G.phase === 'VOTE_INTERIM') { G.openRound2(); G.closeVote(); }
      if (G.phase === 'OVER') break;
    }
    if (G.phase === 'VOTE_RESULT') G.toNight();
    if (G.phase === 'NIGHT') {
      const darks = G.alive().filter(x => x.faction === 'dark');
      for (const p of G.alive()) {
        let a = { type: 'REST', targets: [] };
        if (G.hasSkill(p) && !G.skillsBanned() && !(ONCE.has(p.role) && Math.random() < .5)) {
          const need = Math.max(G.spec(p).t, 0), c = G.candidates(p).sort(() => Math.random() - .5);
          a = { type: 'SKILL', targets: c.slice(0, need).map(x => x.id) };
        }
        if (p.faction === 'dark') {
          // first dark sabotages, the rest curse (sabotage when curse is blocked)
          a.side = darks[0].id === p.id || G.curseBlocked() ? 'SABOTAGE' : 'CURSE';
          if (a.side === 'CURSE') a.sideTargets = [rnd(G.sideTargets(p, G.alive().filter(x => x.faction !== 'dark'))).id];
        }
        if (G.submitNight(p.id, a)) G.submitNight(p.id, p.faction === 'dark' ? { type: 'REST', targets: [], side: 'FAKE' } : { type: 'REST', targets: [] });
      }
      G.closeNight();
    }
  }
  return G.over ? G.over.side : 'none';
}

const rounds = Number(process.argv[2] || 1000);
const sizes = (process.argv[3] || '6,7,8,9,10,11,12').split(',').map(Number);
const acc = Number(process.argv[4] ?? 0.4);
const opts = { acc, skip: .15, darkSkip: .1 };

console.log(`balance: ${rounds} games per size, light vote accuracy ${acc}`);
console.log('players | light | dark  | other');
for (const N of sizes) {
  const c = { light: 0, dark: 0, none: 0 };
  for (let i = 0; i < rounds; i++) c[play(N, opts)]++;
  const f = k => (100 * c[k] / rounds).toFixed(0).padStart(4) + '%';
  console.log(`${String(N).padStart(7)} | ${f('light')} | ${f('dark')} | ${f('none')}`);
}
