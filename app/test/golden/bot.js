// Golden-master bot: drives a Game directly (no sockets) with a seeded PRNG and a fixed clock.
// Everything the bot does draws from Math.random (the same stream the engine uses), so any change in the
// engine's Math.random call order changes the recorded hash chain. That is intended.
const crypto = require('crypto');
const { ROLES, TRAPS, BOOSTERS, EVENTS } = require('./targets').data;   // role/card tables (read-only, used to pick valid targets)

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = a => a[Math.floor(Math.random() * a.length)];
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

// Play one whole game. onStep(label, ret, game) is called after every engine call.
function playGame(Game, N, seed, cov, onStep) {
  const realRandom = Math.random, realNow = Date.now;
  Math.random = mulberry32(seed);
  let clock = 1700000000000; Date.now = () => (clock += 1000);
  try {
    // per-game bias so different seeds explore different behaviours (all derived from the seed stream)
    const bias = { trap: 0.35 + Math.random() * 0.5, skill: 0.5 + Math.random() * 0.5, skip: Math.random() * 0.6, idle: Math.random() * 0.25, accept: Math.random(), plus1: Math.random() * 0.8, smart: Math.random() < 0.5 ? 0.6 + Math.random() * 0.4 : 0 };
    const names = Array.from({ length: N }, (_, i) => 'P' + i);
    const g = new Game(names);
    let chain = '', steps = 0;
    const view = () => JSON.stringify({ v: names.map((_, i) => g.viewFor(i)), m1: g.modView(true), m0: g.modView(false) });
    const step = (label, ret) => {
      steps++;
      const h = sha(chain + '|' + label + '|' + JSON.stringify(ret === undefined ? null : ret) + '|' + view());
      chain = h; observe(g, cov);
      if (onStep) onStep(label, ret, g, view);
      return ret;
    };
    const call = (label, fn) => step(label, fn());
    step('init', null);
    let guard = 0;
    while (g.phase !== 'OVER' && guard++ < 60) {
      const ph = g.phase;
      if (ph === 'MORNING') {
        call('toNight-bad', () => g.toNight());
        call('castVote-bad', () => g.castVote(0, 1));
        call('submitNight-bad', () => g.submitNight(0, { type: 'REST' }));
        for (const p of g.players) {
          if (Math.random() < 0.7) call('chat:' + p.id, () => g.chat(p.id, Math.random() < 0.3 ? rnd(['👍', '🤔', '😡', '😂', '🙏']) : 'hi ' + p.name));
          if (g.event?.pending && Math.random() < 0.85) call('event:' + p.id, () => g.castEventChoice(p.id, Math.random() < bias.accept));
          if (g.booster.open && Math.random() < 0.85) call('booster:' + p.id, () => g.castBooster(p.id, rnd(['NONE', 'NONE', ...Object.keys(BOOSTERS), 'bogus'])));
        }
        call('chat-empty', () => g.chat(0, '  '));
        call('darkSay-day', () => g.darkSay(0, 'x'));
        if (g.event?.pending && Math.random() < 0.4) call('closeEventVote', () => g.closeEventVote());
        if (g.booster.open && Math.random() < 0.4) call('closeBoosterVote', () => g.closeBoosterVote());
        call('toVote', () => g.toVote());
      } else if (ph === 'VOTE') {
        const alive = g.alive();
        for (const p of alive) {
          if (Math.random() < bias.idle) continue;
          const others = alive.filter(x => x.id !== p.id);
          const darks = others.filter(x => x.faction === 'dark');
          // "smart" games: light voters often hit a real dark player (god knowledge) so light purge wins are reached
          const t = Math.random() < bias.skip ? 'SKIP' : (p.faction === 'light' && darks.length && g.day >= (bias.smart > 0.8 ? 3 : 1) && Math.random() < bias.smart) ? rnd(darks).id : rnd(others).id;
          call('vote:' + p.id, () => g.castVote(p.id, t));
        }
        call('vote-bad', () => g.castVote(alive[0].id, alive[0].id));
        call('closeVote', () => g.closeVote());
      } else if (ph === 'VOTE_RESULT') {
        call('toVote-bad', () => g.toVote());
        call('toNight', () => g.toNight());
      } else if (ph === 'NIGHT') {
        for (const p of g.alive()) {
          if (Math.random() < bias.idle) continue;   // did not submit -> closeNight defaults
          const me = g.viewFor(p.id).me, dk = g.viewFor(p.id).dark;
          let a;
          if (me.skillOK && !me.skillsBanned && !(me.once && Math.random() < 0.5) && (bias.smart > 0.8 || Math.random() < bias.skill)) {
            const t = Math.max(me.spec.t, 0);
            let c = me.candidates.slice().sort(() => Math.random() - 0.5);
            // Glory Thief follows light players so it can collect Credit
            if (me.role === 'glory_thief' && Math.random() < 0.8) c = c.sort((x, y) => ((g.players[y].faction === 'light') - (g.players[x].faction === 'light')) || (x - y));
            a = { type: 'SKILL', targets: c.slice(0, t) };
            if (me.role === 'soul_recruiter' && !me.plus1Used && Math.random() < bias.plus1) a.plus1 = true;
            if (Math.random() < 0.04) a.targets = [];   // invalid on purpose (error string is part of the chain)
          } else a = { type: 'REST' };
          if (me.faction === 'dark') {
            const r = Math.random();
            if (r < bias.trap && dk.trapFree > 0) {
              const k = rnd(Object.keys(dk.trapNeed)), need = dk.trapNeed[k];
              a.side = 'TRAP'; a.trapId = k;
              if (need) {
                const pool = g.viewFor(p.id).players.filter(x => x.alive && (need === 'any' || (need === 'dark' ? (x.mate || x.me) : !(x.mate || x.me))));
                a.sideTargets = [rnd(pool).id];
              }
            } else if (r < bias.trap + 0.15 && !dk.curseBlocked && !(bias.smart > 0.8)) { a.side = 'CURSE'; a.sideTargets = [rnd(dk.lights)]; }
            else a.side = Math.random() < (bias.smart > 0.8 ? 0.9 : 0.5) ? 'SABOTAGE' : 'FAKE';
          }
          let ret = call('night:' + p.id, () => g.submitNight(p.id, a));
          if (ret && a.side) { a.side = 'FAKE'; delete a.trapId; a.sideTargets = []; ret = call('night-retry:' + p.id, () => g.submitNight(p.id, a)); }
          if (!ret) { cov.add('skill:' + p.role, a.type === 'SKILL'); if (a.side === 'TRAP') cov.add('trapPlaced:' + a.trapId, true); }
          if (p.faction === 'dark' && Math.random() < 0.5) call('dark:' + p.id, () => g.darkSay(p.id, 'plan ' + p.id));
        }
        call('chat-night', () => g.chat(0, 'x'));
        call('closeNight', () => g.closeNight());
      }
    }
    call('toVote-over', () => g.toVote());
    return { n: N, seed, steps, final: chain, over: g.over && { side: g.over.side, why: g.over.why, winners: g.over.winners }, day: g.day };
  } finally { Math.random = realRandom; Date.now = realNow; }
}

// ---- coverage observation (reads game state after every step) ----
function observe(g, cov) {
  const add = (k, c = true) => cov.add(k, c);
  if (g.event) { add('event:' + g.event.id); if (g.event.accepted === true) add('event:' + g.event.id + ':accept'); if (g.event.accepted === false) add('event:' + g.event.id + ':reject'); }
  if (g.hijackVoter != null) add('hijack');
  g.players.forEach(p => {
    if (p.alive && p.silenced) add('silence');
    if (p.alive && p.zero) add('zeroVote');
    if (p.alive && p.dbl) add('dblVote');
    if (p.dodgeUsed) add('freelanceDodge');
    if (p.cause === 'burnout') add('burnoutDeath');
    if (p.role === 'chaos_intern' && p.alive && g.day >= 4) add('chaosInternDouble');
  });
  g.traps.forEach(t => add('trapOnBoard:' + t.kind));
  const text = g.feed.map(f => f.text).join('\n') + '\n' + g.report.join('\n') + '\n' + g.timeline.map(t => t.title + ' ' + t.text).join('\n');
  Object.entries(TRAPS).forEach(([k, t]) => { if (text.includes('Trap Card ทำงาน: ' + t.n)) add('trapTriggered:' + k); });
  Object.entries(BOOSTERS).forEach(([k, b]) => { if (text.includes('Sprint Booster เปิดใช้: ' + b.n)) add('booster:' + k); });
  if (text.includes('Hotfix Rollback: คำสาปและบั๊ก')) add('chronoRollback');
  if (g.over) {
    add('over:' + g.over.side + (g.over.why.startsWith('หมดวันศุกร์') ? ':timeout' : g.over.why.startsWith('Mana') ? ':mana' : g.over.why.startsWith('ไล่') ? ':purge' : ':majority'));
    g.over.winners.forEach(id => { const r = g.players[id].role; if (ROLES[r].f === 'indie') add('indieWin:' + r); });
  }
}

class Coverage {
  constructor() { this.keys = new Map(); }
  add(k, c = true) { if (c) this.keys.set(k, (this.keys.get(k) || 0) + 1); }
  has(k) { return this.keys.has(k); }
  // trapTriggered:insurance only fires inside a Chrono rollback night, so it covers "rollback incl. Insurance"
  required() {
    const req = [];
    Object.keys(EVENTS).forEach(k => { req.push('event:' + k); if (EVENTS[k].choice) req.push('event:' + k + ':accept', 'event:' + k + ':reject'); });
    Object.keys(BOOSTERS).forEach(k => req.push('booster:' + k));
    Object.keys(TRAPS).forEach(k => req.push('trapPlaced:' + k, 'trapTriggered:' + k));
    Object.keys(ROLES).forEach(k => req.push('skill:' + k));
    req.push('hijack', 'silence', 'zeroVote', 'dblVote', 'freelanceDodge', 'chronoRollback','burnoutDeath', 'chaosInternDouble',
      'over:light:mana', 'over:light:purge', 'over:dark:majority', 'over:dark:timeout',
      'indieWin:severance_seeker', 'indieWin:soul_recruiter', 'indieWin:glory_thief', 'indieWin:chaos_intern');
    return req;
  }
  missing() { return this.required().filter(k => !this.has(k)); }
}

module.exports = { playGame, Coverage, mulberry32 };
