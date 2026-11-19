// Playwright e2e: 12 real player screens + the Moderator 3D screen play one full game through the UI.
//   PLAYWRIGHT_DIR=<node_modules dir with playwright-core> [CHROME=<chromium binary>] node tools/e2e-pw.js
// Env: E2E_PORT (default 3340), E2E_OUT (screenshots, default <tmp>/dn-e2e-pw), E2E_HEADED=1 to watch.
// The server runs in-process. Players join through the join form and act only by clicking (event/booster polls, votes,
// night actions); the Moderator phase buttons are driven over its socket. One light seat is made the Data Oracle so the
// Data Correlation flow is always covered: 2-target picker, morning result line, mod3d fx {targets, result:{same}}.
// Exit 0 = every check passed. Screenshots: day<N>-<phase>-p<seat>.png, sheet-*.png (12 phones), mod3d-*.png.
const os = require('os'), path = require('path'), fs = require('fs');
const C = require('./e2e-pw-common');
C.initEnv('3340');
const OUT = process.env.E2E_OUT || path.join(os.tmpdir(), 'dn-e2e-pw');
fs.mkdirSync(OUT, { recursive: true });
const { N, sleep, clickIf } = C;
const { results, check } = C.makeChecker();

async function main() {
  const pw = C.loadPw();
  if (!pw) { console.log('SKIP playwright not found (npm i playwright-core elsewhere and set PLAYWRIGHT_DIR=<its node_modules>)'); return 0; }
  const { ROLES } = require('../src/shared/data');
  const room0 = await C.startRoom();
  const { code, act, pushState, rooms } = room0;
  console.log(`room ${code} · screenshots → ${OUT}`);

  const browser = await C.launchBrowser(pw);
  const errs = [];
  const watch = C.makeWatch(errs);

  // ---- 12 player phones ----
  const { pages } = await C.joinPlayers(browser, room0, { watch });
  check('12 players joined through the join form', rooms.get(code).members.size >= N || pages.length === N);

  // ---- mod3d (desktop) ----
  const { m3 } = await C.openMod3d(browser, room0, { watch });
  const { room, G, seat } = await C.startGame(room0, m3, check);

  // guarantee a Data Oracle on a light seat (swap roles with whoever holds it, or take the first light non-oracle seat)
  let oracle = G.players.findIndex(p => p.role === 'data_oracle');
  if (oracle < 0) {
    oracle = G.players.findIndex(p => p.faction === 'light' && !ROLES[p.role].once && !ROLES[p.role].uses);
    G.players[oracle].role = 'data_oracle'; G.players[oracle].faction = ROLES.data_oracle.f;
    pushState(room); await sleep(400);
  }
  const oraclePage = pages[G.players.map((p, i) => i).find(i => seat(i) === oracle) ?? oracle];
  console.log(`Data Oracle seat ${oracle} (${G.players[oracle].name})`);

  const alivePages = () => pages.filter((_, i) => G.players[seat(i)]?.alive);
  const shotAll = async tag => {
    await Promise.all(pages.map((p, i) => p.screenshot({ path: path.join(OUT, `${tag}-p${String(i + 1).padStart(2, '0')}.png`) })));
    await m3.screenshot({ path: path.join(OUT, `mod3d-${tag}.png`) });
  };
  const toGameTab = p => clickIf(p, `button[onclick="setTab('game')"]`);

  let oracleNights = 0, oracleResults = [], pickerSeen = false, guard = 0;
  while (G.phase !== 'OVER' && guard++ < 80) {
    const ph = G.phase, d = G.day;
    if (ph === 'MORNING') {
      for (const p of alivePages()) {
        await toGameTab(p);
        if (G.event?.pending) await clickIf(p, `button[onclick^="act('p:event',{accept:true"]`);
        if (G.booster?.open) await clickIf(p, `button[onclick^="act('p:booster'"]`);
      }
      await sleep(300);
      if (G.event?.pending) await act('closeEvent');
      if (G.booster?.open) await act('closeBooster');
      await sleep(300);
      await shotAll(`day${d}-morning`);
      const r = await act('toVote'); if (!r.ok) console.log('toVote:', r.error);
    } else if (ph === 'VOTE') {
      for (const p of alivePages()) {
        await toGameTab(p);
        const opts = p.locator('button[onclick^="pickVote("]:not([disabled])');
        const n = await opts.count(); if (!n) continue;
        await opts.nth(Math.floor(Math.random() * n)).click();
        await clickIf(p, 'button[onclick="sendVote()"]');
      }
      await sleep(300);
      await shotAll(`day${d}-vote`);
      await act('closeVote');
    } else if (ph === 'VOTE_INTERIM') {
      await act('openRound2');
    } else if (ph === 'VOTE_RESULT') {
      await act('toNight');
    } else if (ph === 'NIGHT') {
      for (const [i, p] of pages.entries()) {
        const P = G.players[seat(i)]; if (!P?.alive) continue;
        await toGameTab(p);
        const need = await p.evaluate(() => Math.max(S.me.spec?.t || 0, 0));
        let ok = await clickIf(p, `button[onclick="chooseAction('SKILL')"]`);
        if (ok && need > 0) {
          const ts = p.locator('.targets button[onclick^="toggleT("]:not([disabled])');
          const n = await ts.count();
          if (n < need) ok = false;
          else for (let k = 0; k < need; k++) await ts.nth(k).click();
        }
        if (!ok) await clickIf(p, `button[onclick="chooseAction('REST')"]`);
        if (P.faction === 'dark') {
          const curse = Math.random() < 0.6 && await clickIf(p, `button[onclick="chooseSide('CURSE')"]`);
          if (curse) await clickIf(p, '.targets button[onclick^="toggleS("]:not([disabled])');
          else await clickIf(p, `button[onclick="chooseSide('${Math.random() < 0.5 ? 'SABOTAGE' : 'FAKE'}')"]`);
        }
        if (seat(i) === oracle && ok) {
          const txt = await p.locator('.hint', { hasText: 'เลือกเป้าหมาย 2 คน' }).first().textContent().catch(() => '');
          if (/เลือกแล้ว 2\/2/.test(txt)) pickerSeen = true;
          await p.screenshot({ path: path.join(OUT, `day${d}-night-oracle-picker.png`) });
        }
        await clickIf(p, 'button[onclick="sendNight()"]');
      }
      await sleep(400);
      const oracleAct = G.night[oracle];
      if (oracleAct?.type === 'SKILL') { oracleNights++; check(`night ${d}: oracle submitted 2 targets via the picker`, oracleAct.targets.length === 2 && !oracleAct.targets.includes(oracle), JSON.stringify(oracleAct.targets)); }
      await shotAll(`day${d}-night`);
      const intelBefore = G.intel[oracle].length, nightEvent = G.event?.id || '-';
      // who can legitimately take the oracle's result away tonight (Glory Thief steals notes; Scope Creep / Hot Desking swap targets)
      const meddlers = Object.entries(G.night).filter(([id, n]) => n.type === 'SKILL' && ['glory_thief', 'chaos_scrum'].includes(G.er(G.players[+id])) && n.targets.includes(oracle)).map(([id]) => G.er(G.players[+id]));
      if (nightEvent === 'hotdesk') meddlers.push('hotdesk');
      const r = await act('closeNight'); if (!r.ok) console.log('closeNight:', r.error);
      await sleep(500);
      const all = G.intel[oracle].slice(intelBefore).map(x => x.text);
      const lines = all.filter(t => t.startsWith('Data Correlation'));
      oracleResults.push(...lines.map(text => ({ text, ev: nightEvent })));
      console.log(`  night ${d} oracle notes: ${all.join(' | ') || '(none)'} · event ${nightEvent} · meddlers ${meddlers.join(',') || '-'}`);
      if (oracleAct?.type === 'SKILL' && !lines.length && !meddlers.length) check(`night ${d}: oracle used the skill and got a result line`, false, 'no result and no Glory Thief / Scope Creep / Hot Desking on the oracle');
      if (lines.length) {
        const op = oraclePage; await clickIf(op, `button[onclick="setTab('me')"]`); await sleep(200);
        const shown = await op.evaluate(() => document.body.innerText);
        check(`day ${d}: oracle screen shows the Data Correlation line`, lines.every(l => shown.includes(l)), lines.join(' | '));
        await op.evaluate(() => document.querySelector('.intel')?.scrollIntoView({ block: 'start' }));   // newest intel is listed first
        await sleep(150);
        await op.screenshot({ path: path.join(OUT, `day${d}-oracle-result.png`) });
        await toGameTab(op);
      }
    } else { console.log('unexpected phase', ph); break; }
    await sleep(200);
  }
  check('game reached OVER', G.phase === 'OVER', G.phase);
  await shotAll('end');

  // ---- Data Correlation checks ----
  check('oracle used Data Correlation at least once', oracleNights > 0, `${oracleNights} nights`);
  check('2-target picker showed "เลือกแล้ว 2/2"', pickerSeen);
  const outage = /^Data Correlation: ไฟดับ\/เน็ตหลุด ไม่ได้ข้อมูลเลย 🔌$/;
  check('every result line is same-team or different-team and names no team',
    oracleResults.length > 0 && oracleResults.every(({ text, ev }) => ev === 'blackout' ? outage.test(text) : /→ อยู่(ทีมเดียวกัน 🔗|คนละทีม ⛓️‍💥)$/.test(text) && !/Team Deliver|Cult|Severance|ฝ่ายแสง|ฝ่ายมืด|อิสระ/.test(text)),
    oracleResults.map(r => r.text).join(' | ') || 'none');
  if (oracleResults.some(r => r.ev === 'blackout')) check('Power Outage night gives the oracle no result', oracleResults.filter(r => r.ev === 'blackout').every(r => outage.test(r.text)));

  // ---- mod3d: wait for the fx queue to drain, then check the data_oracle fx ----
  await m3.waitForFunction(() => window.__mod3d && !window.__mod3d.busy, null, { timeout: 180000 }).catch(() => {});
  await sleep(1500);
  const m3s = await m3.evaluate(() => ({ played: (window.__mod3d.played || []).map(r => ({ kind: r.kind, role: r.role, done: r.done, err: r.err, targets: r.targets, result: r.result })) }));
  const fxOracle = m3s.played.filter(r => r.kind === 'skill' && r.role === 'data_oracle');
  check('mod3d played a data_oracle fx', fxOracle.length > 0, `${fxOracle.length} played`);
  check('every data_oracle fx completed without error', fxOracle.every(r => r.done && !r.err), JSON.stringify(fxOracle.filter(r => !r.done || r.err)).slice(0, 200));
  check('mod3d played every fx without error', m3s.played.every(r => r.done && !r.err), `${m3s.played.length} fx, failed: ${m3s.played.filter(r => !r.done || r.err).map(r => r.kind + ':' + (r.role || '')).join(',')}`);
  check('mod3d phase label shows game over', (await m3.evaluate(() => document.body.innerText)).includes('จบเกม'));
  await m3.screenshot({ path: path.join(OUT, 'mod3d-final.png') });

  // ---- contact sheets: 12 phones on one image per moment ----
  const sheetCtx = await browser.newContext({ viewport: { width: 6 * 390 / 2, height: 2 * 844 / 2 } });
  const sheet = await sheetCtx.newPage();
  const tags = [...new Set(fs.readdirSync(OUT).map(f => (f.match(/^(day\d+-(?:morning|vote|night)|end)-p01\.png$/) || [])[1]).filter(Boolean))];
  for (const t of tags) {
    const imgs = Array.from({ length: N }, (_, i) => 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, `${t}-p${String(i + 1).padStart(2, '0')}.png`)).toString('base64'));
    await sheet.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(6,195px);background:#111">${imgs.map(s => `<img src="${s}" style="width:195px;height:422px;object-fit:cover;object-position:top">`).join('')}</body>`);
    await sleep(300); await sheet.screenshot({ path: path.join(OUT, `sheet-${t}.png`) });
  }

  check('no JS errors on any page', errs.length === 0, errs.slice(0, 5).join(' || '));
  await browser.close(); room0.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${failed ? 'E2E FAILED' : 'E2E OK'}: ${results.length - failed}/${results.length} checks · ${G.day} days · winner ${JSON.stringify(G.over?.side || G.over?.why || G.winner || '')} · out ${OUT}`);
  return failed ? 1 : 0;
}

main().then(c => process.exit(c), e => { console.error(e); process.exit(1); });
