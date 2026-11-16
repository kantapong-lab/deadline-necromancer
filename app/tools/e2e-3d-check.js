// Browser-side end-to-end check for public/mod3d.html — paste this whole file into the DevTools console of /mod3d.html
// (see tools/e2e-3d.js, which prepares the room + bots and prints the exact steps).
//
// It joins the room twice more as Moderator: a "truth" spectator socket (full view, like the 3D page itself) and a controller
// socket that plays Moderator (start → close polls → vote → night → …) until the game is over. After every step it waits for the
// 3D page to finish playing its fx queue and then compares the scene with what the ENGINE says:
//   day / mana / phase label + lighting phase, desk count, every player's alive|fired|burnout state, role, card art, label text,
//   and the fx stream (same count, order and kind as the engine emitted, each one completed without error).
// Result: window.__e2e = { fails:[…], checks, done, log, summary }   — an empty `fails` means the screen matched the game.
(async function () {
  const E = window.__e2e = { log: [], fails: [], checks: 0, done: false, step: 'init' };
  const sleep = ms => new Promise(r => setTimeout(r, ms)), fail = m => { E.fails.push(m); };
  window.__jsErrs = window.__jsErrs || [];
  addEventListener('error', e => window.__jsErrs.push('ERR ' + e.message));
  addEventListener('unhandledrejection', e => window.__jsErrs.push('REJ ' + String(e.reason && e.reason.stack || e.reason).slice(0, 300)));
  const origErr = console.error; console.error = (...a) => { window.__jsErrs.push('console.error ' + a.map(x => String(x && x.stack || x)).join(' ').slice(0, 300)); origErr(...a); };
  try {
    const sv = JSON.parse(localStorage.getItem('dn-mod')); if (!sv) throw new Error('no dn-mod session in localStorage (run tools/e2e-3d.js first)');
    const mk = full => new Promise(res => { const s = io({ forceNew: true }); s.st = null; s.fx = []; s.on('state', v => (s.st = v)); s.on('fx', b => s.fx.push(...b)); s.on('connect', () => s.emit('mod:join', { ...sv, full }, () => res(s))); });
    const truth = await mk(true), ctl = await mk(false);
    const act = (a, p) => new Promise(r => ctl.emit('mod:do', { action: a, payload: p }, r));
    const waitFor = async (fn, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(300); } E.log.push('timeout: ' + what); return false; };
    const M = () => window.__mod3d;
    const settle = async tag => { let calm = 0; const t0 = Date.now(); while (Date.now() - t0 < 150000) { const m = M(); if (m && !m.busy && m.played.length >= truth.fx.length) { if (++calm >= 5) return true; } else calm = 0; await sleep(300); } fail(`${tag}: page never drained its fx queue (played ${M() && M().played.length} of ${truth.fx.length})`); return false; };
    const PHASE_LABEL = { MORNING: 'ประชุมเช้า', VOTE: 'โหวตไล่ออก', VOTE_INTERIM: 'พักโหวต — ผลรอบแรก', VOTE_RESULT: 'ประกาศผลโหวต', NIGHT: 'กลางคืน — แอ็กชันลับ', OVER: 'จบเกม' };
    const SCENE = { MORNING: 'MORNING', VOTE: 'VOTE', VOTE_INTERIM: 'VOTE', VOTE_RESULT: 'VOTE', NIGHT: 'NIGHT', OVER: 'MORNING' };
    const sig = f => f.role || f.key || f.trap || '';
    const check = tag => {
      E.checks++; const T = truth.st, m = M(); if (!T || !m) return fail(tag + ': no state');
      if (!m.reveal) { m.setReveal(true); E.revealed = true; }   // the screen hides secrets by default; this check needs them shown
      if (m.day !== T.day) fail(`${tag}: day scene=${m.day} engine=${T.day}`);
      if (m.mana !== T.mana) fail(`${tag}: mana scene=${m.mana} engine=${T.mana}`);
      const lab = document.getElementById('phase').textContent; if (lab !== PHASE_LABEL[T.phase]) fail(`${tag}: phase label "${lab}" vs engine ${T.phase}`);
      if (m.phase !== SCENE[T.phase]) fail(`${tag}: scene lighting phase ${m.phase} vs expected ${SCENE[T.phase]} (engine ${T.phase})`);
      if (!m.secrets) fail(tag + ': spectator screen is not in secrets mode');
      const want = p => p.alive ? 'alive' : (p.cause === 'burnout' ? 'burnout' : 'fired');
      if (m.desks.length !== T.players.length) fail(`${tag}: desks ${m.desks.length} vs players ${T.players.length}`);
      T.players.forEach(p => {
        const d = m.desks[p.id]; if (!d) return fail(`${tag}: no desk for ${p.name}`);
        if (d.state !== want(p)) fail(`${tag}: ${p.name} engine=${want(p)} scene=${d.state}`);
        if (!p.role) fail(`${tag}: engine did not send a role for ${p.name} to the spectator`); else if (d.role !== p.role) fail(`${tag}: ${p.name} role engine=${p.role} scene=${d.role}`);
        if (!d.front.material.map) fail(`${tag}: ${p.name} card art missing`);
        if (d.el.textContent.indexOf(p.name) < 0) fail(`${tag}: name plate lost name for ${p.name}`);
      });
      const f = truth.fx, pl = m.played; if (pl.length !== f.length) fail(`${tag}: fx count scene=${pl.length} engine=${f.length}`);
      for (let i = 0; i < Math.min(f.length, pl.length); i++) {
        if (f[i].kind !== pl[i].kind || sig(f[i]) !== sig(pl[i])) { fail(`${tag}: fx #${i} engine=${f[i].kind}/${sig(f[i])} scene=${pl[i].kind}/${sig(pl[i])}`); break; }
        if (!pl[i].done) { fail(`${tag}: fx #${i} ${pl[i].kind} not completed ${pl[i].err || ''}`); break; }
      }
    };
    E.step = 'start'; await act('start'); await waitFor(() => M() && M().desks.length && truth.st && truth.st.phase === 'MORNING', 30000, 'game start'); await settle('start'); check('start');
    const pd = () => truth.st.pending || {};
    for (let guard = 0; guard < 80 && truth.st.phase !== 'OVER'; guard++) {
      const ph = truth.st.phase, d = truth.st.day; E.step = `${ph} d${d}`; await settle(E.step); check('before ' + E.step);
      E.log.push(`${E.step} mana=${truth.st.mana} alive=${truth.st.players.filter(p => p.alive).length} fx=${truth.fx.length}`);
      if (ph === 'MORNING') {
        await waitFor(() => !pd().event || pd().event.done === pd().event.total, 20000, 'event votes'); if (pd().event) await act('closeEvent');
        await waitFor(() => !pd().booster || pd().booster.done === pd().booster.total, 20000, 'booster votes'); if (pd().booster) await act('closeBooster');
        await settle(E.step + ' polls'); check('morning polls closed d' + d); await act('toVote');
      } else if (ph === 'VOTE') { await waitFor(() => { const v = pd().vote; return !v || v.done === v.total; }, 25000, 'votes'); await act('closeVote'); }
      else if (ph === 'VOTE_INTERIM') await act('openRound2');
      else if (ph === 'VOTE_RESULT') await act('toNight');
      else if (ph === 'NIGHT') { await waitFor(() => { const v = pd().night; return !v || v.done === v.total; }, 30000, 'night actions'); await act('closeNight'); }
      await sleep(500);
    }
    E.step = 'end'; await settle('end'); check('game over'); E.log.push('OVER: ' + JSON.stringify((truth.st.over && (truth.st.over.why || truth.st.over.side)) || ''));
    E.summary = {}; M().played.forEach(r => { const k = r.kind + (r.role ? ':' + r.role : r.key ? ':' + r.key : r.trap ? ':' + r.trap : ''); E.summary[k] = (E.summary[k] || 0) + 1; });
  } catch (e) { fail('CRASH ' + (e && e.stack || e)); }
  window.__jsErrs.forEach(x => fail('page error: ' + x));
  E.done = true; console.log(E.fails.length ? `E2E FAILED (${E.fails.length}):\n` + E.fails.join('\n') : `E2E OK — ${E.checks} checks, ${M().played.length} fx played, screen matched the engine`, E);
})();
