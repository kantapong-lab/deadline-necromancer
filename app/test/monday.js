// Monday rules: no expulsion vote on day 1; ManaMax = floor(N/2) + 1.   node test/monday.js
const assert = require('assert');
const { Game } = require('../src/engine');

const mk = n => new Game(Array.from({ length: n }, (_, i) => 'P' + i));
for (let n = 6; n <= 12; n++) assert.strictEqual(mk(n).manaMax, Math.floor(n / 2) + 1, 'manaMax N=' + n);

const G = mk(9); G.booster = { open: false, votes: {} }; G.boosterCharges = 0; G.event = null;
assert.strictEqual(G.day, 1);
assert.strictEqual(G.toVote(), null);
assert.strictEqual(G.phase, 'VOTE_RESULT', 'Monday skips the vote phase');
assert.strictEqual(G.alive().length, 9); assert.strictEqual(G.skipStreak, 0);
assert.notStrictEqual(G.castVote(0, 1), null, 'castVote rejected on Monday');
assert.strictEqual(G.toNight(), null); assert.strictEqual(G.phase, 'NIGHT');

const H = mk(9); H.booster = { open: false, votes: {} }; H.event = null; H.day = 2; H.phase = 'MORNING';
assert.strictEqual(H.toVote(), null); assert.strictEqual(H.phase, 'VOTE');
assert.strictEqual(H.castVote(0, 1), null, 'Tuesday vote works');
console.log('monday: ok');
