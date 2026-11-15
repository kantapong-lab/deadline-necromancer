// Golden-master test for the game engine.
//   node test/golden/run.js                 compare against snapshot.json (exit 1 on any difference)
//   node test/golden/run.js --record        (re)write snapshot.json; refuses if the coverage gate fails
//   node test/golden/run.js --dump out.json also write the full per-step JSON (diff a dump from baseline vs now)
const fs = require('fs');
const path = require('path');
const { Game } = require('./targets');
const { playGame, Coverage } = require('./bot');

const SNAP = path.join(__dirname, 'snapshot.json');
const args = process.argv.slice(2);
const record = args.includes('--record');
const dumpIdx = args.indexOf('--dump');
const dumpFile = dumpIdx >= 0 ? args[dumpIdx + 1] : null;
const SEEDS = Number(process.env.GOLDEN_SEEDS || 45);

const cov = new Coverage();
const games = [], dump = {};
for (let n = 6; n <= 12; n++) for (let i = 0; i < SEEDS; i++) {
  const seed = n * 1000 + i, key = n + ':' + seed;
  const steps = [];
  const res = playGame(Game, n, seed, cov, dumpFile ? (label, ret, g, view) => steps.push({ label, ret: ret === undefined ? null : ret, view: JSON.parse(view()) }) : null);
  games.push({ key, ...res });
  if (dumpFile) dump[key] = steps;
}
if (dumpFile) fs.writeFileSync(dumpFile, JSON.stringify(dump, null, 1));

const missing = cov.missing();
console.log(`golden: ${games.length} games, ${games.reduce((s, g) => s + g.steps, 0)} steps, coverage ${cov.required().length - missing.length}/${cov.required().length}`);
if (missing.length) { console.log('COVERAGE GATE FAILED, missing: ' + missing.join(', ')); if (record) process.exit(1); }

if (record) {
  fs.writeFileSync(SNAP, JSON.stringify({ seeds: SEEDS, games }, null, 1) + '\n');
  console.log('snapshot recorded: ' + SNAP);
  process.exit(0);
}
if (missing.length) process.exit(1);
if (!fs.existsSync(SNAP)) { console.log('no snapshot.json (run with --record on the baseline)'); process.exit(1); }
const snap = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
let bad = 0;
if (snap.games.length !== games.length) { console.log(`game count ${games.length} != snapshot ${snap.games.length}`); bad++; }
snap.games.forEach((s, i) => {
  const g = games[i];
  if (!g || JSON.stringify(g) !== JSON.stringify(s)) { bad++; if (bad <= 5) console.log('DIFF ' + s.key + '\n  want ' + JSON.stringify(s) + '\n  got  ' + JSON.stringify(g)); }
});
console.log(bad ? `GOLDEN FAILED: ${bad} game(s) differ` : 'GOLDEN OK');
process.exit(bad ? 1 : 0);
