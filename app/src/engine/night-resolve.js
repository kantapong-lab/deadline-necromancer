'use strict';
// Night resolution (one ordered pipeline; the order is rule-critical).
const { ROLES, TRAPS, FNAME } = require('../shared/data');
const { shuffle, rnd } = require('./random');

// Night resolution
module.exports = {
  resolveNight() {
    const G = this, P = id => G.P(id), nm = id => G.nm(id), alive = () => G.alive(), er = p => G.er(p);
    const notes = {}, add = (pid, text) => (notes[pid] = notes[pid] || []).push({ text });
    const rep = [];
    const A = [];
    alive().forEach(p => {
      const n = G.night[p.id] || { type: 'REST', targets: [] };
      A.push({ p, type: n.type, targets: n.targets || [], plus1: n.plus1 });
      if (n.side) A.push({ p, type: n.side, targets: n.sideTargets || [], side: true, trapId: n.trapId });
    });
    const act = pid => A.find(a => a.p.id === pid && !a.side);
    const skills = role => A.filter(a => a.type === 'SKILL' && er(a.p) === role && a.targets !== undefined);
    A.forEach(a => { if (a.type === 'SKILL' && ROLES[a.p.role].once) a.p.used = true; });

    // Trap Card
    G.fixNotes = []; let placedNow = 0;
    A.filter(a => a.side && a.type === 'TRAP').forEach(a => {
      if (G.trapCharges > 0 && a.trapId) {
        G.trapCharges--; placedNow++;
        G.traps.push({ kind: a.trapId, target: a.targets[0], day: G.day, fresh: true, triggered: false });
        add(a.p.id, `หมอบ Trap Card: ${TRAPS[a.trapId].n}${a.targets[0] != null ? ' ที่ ' + nm(a.targets[0]) : ''} (โควตา Trap เหลือ ${G.trapCharges})`);
      } else { a.type = 'FAKE'; add(a.p.id, 'โควตา Trap หมดแล้ว — กลายเป็นส่งงานหลอก'); }
    });
    G.lastTrapPlaced = placedNow > 0;
    const honeyOn = tid => !G.cleanSprint && G.traps.find(t => t.kind === 'honeypot' && t.target === tid && t.fresh);
    const alibiOn = pid => G.traps.find(t => t.kind === 'alibi' && t.target === pid && t.fresh);
    if (G.skillsBanned()) A.forEach(a => { if (a.type === 'SKILL') { a.type = 'REST'; a.targets = []; } });
    // Hot Desking
    if (G.evIs('hotdesk')) {
      const base = A.filter(a => !a.side), withT = base.filter(a => a.type === 'SKILL' && a.targets.length);
      const pool = withT.length >= 2 ? withT : base;
      if (pool.length >= 2) {
        const [x, y] = shuffle(pool).slice(0, 2);
        [x.targets, y.targets] = [y.targets, x.targets];
        rep.push(`🪑 Hot Desking เฉลย: ระบบสลับเป้าหมายสกิลของ ${x.p.name} กับ ${y.p.name} เมื่อคืน${withT.length >= 2 ? '' : ' (ไม่ค่อยมีผล)'}`);
      }
    }
    // 1. Scope Creep
    skills('chaos_scrum').forEach(sc => {
      if (sc.targets.length !== 2) return;
      const x = act(sc.targets[0]), y = act(sc.targets[1]);
      if (x && y) { [x.targets, y.targets] = [y.targets || [], x.targets || []]; add(sc.p.id, `Scope Creep: สลับเป้าหมายของ ${nm(x.p.id)} กับ ${nm(y.p.id)} แล้ว`); }
    });
    // 2. Locks
    const evId = G.event?.id, evYes = G.event?.accepted === true;
    const lockProtect = (evId === 'down' || (evId === 'ot' && evYes)) && !G.freeze;
    const devops = skills('chaos_devops').length > 0 || lockProtect;
    const chrono = skills('chrono_tech_lead').length > 0;
    if (skills('chaos_devops').length) rep.push('⚠️ ระบบ Deploy ตอนเย็นวันศุกร์ — ระบบป้องกันล่มทั้งหมดเมื่อคืนนี้');
    // 3. Shield / Heal
    const shield = {}, heal = {};
    if (!devops) {
      skills('oracle_pm').forEach(a => { if (a.targets[0] != null) shield[a.targets[0]] = a.p.id; });
      skills('coffee_admin').forEach(a => { if (a.targets[0] != null) heal[a.targets[0]] = a.p.id; });
    }
    skills('coffee_admin').forEach(a => { if (a.targets[0] != null && P(a.targets[0]).alive) { P(a.targets[0]).dblNext = true; add(a.p.id, `Espresso Elixir: ${nm(a.targets[0])} จะมีพลังโหวต x2 เช้าถัดไป`); } });
    const curseT = A.filter(a => a.type === 'CURSE' && a.targets[0] != null).map(a => a.targets[0]);
    const immune = {};
    skills('coffee_admin').forEach(a => { const t = a.targets[0]; if (t != null && (t in heal) && !curseT.includes(t)) { immune[t] = true; add(a.p.id, `Espresso Elixir: ${nm(t)} ไม่โดนสาป Burnout จึงได้ภูมิคุ้มกัน NDA Silence/PIP Curse คืนนี้`); } });
    // Production Crisis (รับ): ฝ่ายแสง 1 คนแบบสุ่มได้คุ้มกันจากคำสาป Burnout คืนนี้
    let prodShield = null;
    if (evId === 'prod' && evYes) {
      const ls = alive().filter(p => p.faction === 'light');
      if (ls.length) { prodShield = rnd(ls).id; add(prodShield, '🛡️ Production Crisis: คุณได้รับคุ้มกันจากคำสาป Burnout คืนนี้ (สุ่ม)'); rep.push('🛡️ Production Crisis: ฝ่ายแสง 1 คน (สุ่ม) ได้รับคุ้มกันจากคำสาป Burnout คืนนี้'); }
    }
    // 4. Curse
    const deaths = []; let blocked = 0;
    if (!chrono) {
      A.filter(a => a.type === 'CURSE' && a.targets[0] != null && !G.curseBlocked()).forEach(c => {
        const t = P(c.targets[0]); if (!t.alive) return;
        // คำสาปที่ไม่ได้ผลทุกสาเหตุ (เกราะ PM / ฮีล / คุ้มกันการ์ด / ขนม / Freelance Dodge) ให้ผลเหมือนกันทุกประการ
        // ฝ่ายมืดจึงแยกไม่ได้ว่าเป้าหมายเป็น Freelancer หรือแค่ถูกป้องกัน
        const guarded = (t.id in shield) || (t.id in heal) || t.id === prodShield || (G.evIs('snack') && act(t.id)?.type === 'REST');
        const dodged = !guarded && t.faction === 'indie' && !t.dodgeUsed;
        if (guarded || dodged) {
          if (dodged) { t.dodgeUsed = true; add(t.id, '🛡️ Freelance Dodge: เกราะของคุณรับคำสาป Burnout ไว้ — เกราะถูกทำลายแล้ว (ครั้งต่อไปจะไม่รอด)'); }   // แจ้ง Freelancer เจ้าของเกราะทุกกรณี (ฝ่ายมืดยังเห็นข้อความเดียวกับการถูกป้องกันทุกแบบ)
          blocked++; add(c.p.id, `คำสาปใส่ ${t.name} ไม่ทำงาน (ถูกสกัด — ไม่ทราบสาเหตุ)`); return;
        }
        if (!deaths.includes(t.id)) deaths.push(t.id);
      });
      // Production Crisis (ปฏิเสธ): คำสาป Burnout แบบสุ่ม 1 คน (ผ่านเกราะ/ฮีล/Dodge ตามปกติ, Hotfix Rollback ยกเลิกได้)
      if (evId === 'prod' && G.event.accepted === false) {
        const pool = alive().filter(p => p.faction !== 'dark');   // สุ่มจากฝ่ายแสงและฝ่ายอิสระเท่านั้น (ไม่รวมฝ่ายมืด)
        const t = pool.length ? rnd(pool) : null;
        rep.push('🎲 Production Crisis (ปฏิเสธ): คำสาป Burnout แบบสุ่มถูกปล่อยออกมา!');
        if (!t) { /* ไม่มีเป้าหมาย */ }
        else if ((t.id in shield) || (t.id in heal) || (G.evIs('snack') && act(t.id)?.type === 'REST')) blocked++;
        else if (t.faction === 'indie' && !t.dodgeUsed) {
          // คำสาปสุ่มจากการ์ด: แจ้ง Freelancer ที่เกราะรับไว้
          t.dodgeUsed = true; blocked++;
          add(t.id, '🛡️ Freelance Dodge: เกราะของคุณรับคำสาป Burnout ไว้ — เกราะถูกทำลายแล้ว (ครั้งต่อไปจะไม่รอด) (คำสาปสุ่มจาก Production Crisis)');
        }
        else if (!deaths.includes(t.id)) deaths.push(t.id);
      }
    } else rep.push('⏪ Hotfix Rollback: คำสาปและบั๊กทั้งหมดของเมื่อคืนถูกยกเลิก');
    if (blocked) rep.push(`🛡️ มีคำสาป Burnout ถูกสกัดไว้ ${blocked} ครั้ง`);
    Object.entries(shield).forEach(([tid, pmId]) => {
      const t = P(+tid); if (t.faction !== 'dark') return;
      const al = alibiOn(t.id); if (al) { al.triggered = true; return; }
      P(pmId).lockedNext = true;
      add(pmId, `Stand-up Shield: เป้าหมาย ${t.name} มีออร่ามืด! 😈 บาเรียแตก — คุณใช้สกิลคืนถัดไปไม่ได้`);
    });
    skills('illusionist_sales').forEach(a => { if (a.targets[0] != null) { P(a.targets[0]).overpromised = true; add(a.p.id, `Overpromise: Log ของ ${nm(a.targets[0])} คืนนี้ดูเหมือนวางบั๊ก`); } });
    skills('shadow_hr').forEach(a => { if (a.targets[0] != null) { const t = P(a.targets[0]); if (immune[t.id]) { add(a.p.id, `PIP Curse: ${t.name} ดูเหมือนมีภูมิคุ้มกัน (ถูกต้านทาน)`); return; } t.zeroNext = true; add(a.p.id, `PIP Curse: ${t.name} เป็น ${ROLES[t.role].n} (${FNAME[t.faction]}) — พลังโหวตพรุ่งนี้เป็น 0`); } });
    skills('shadow_legal').forEach(a => { if (a.targets[0] != null) { const t = P(a.targets[0]); if (immune[t.id]) { add(a.p.id, `NDA Silence: ${t.name} ดูเหมือนมีภูมิคุ้มกัน (ถูกต้านทาน)`); return; } t.silencedNext = true; add(a.p.id, `NDA Silence: ปิดปาก ${t.name} แล้ว`); } });
    // 5. Mana
    const lightsAlive = A.filter(a => !a.side && a.p.faction === 'light');
    let passive = 1 - (G.noPenalty ? 0 : Math.min(G.skipStreak, 2));
    if (evId === 'restart') passive = Math.min(passive, 0);
    if (evId === 'scope' && evYes) passive += 1;
    if (evId === 'bonus' && evYes) passive += 1;
    const bugCap = evId === 'scope' && evYes ? 2 : 1;
    const insurance = G.traps.find(t => t.kind === 'insurance' && t.fresh);
    if (chrono && insurance) insurance.triggered = true;
    const bugCount = (chrono && !insurance) ? 0 : A.filter(a => a.type === 'SABOTAGE').length;
    const bugs = evId === 'bonus' && evYes ? (bugCount ? 2 : 0) : Math.min(bugCap, bugCount);
    const before = G.mana;
    G.mana = Math.max(0, Math.min(G.manaMax, G.mana + passive - bugs));
    rep.push(`📊 Mana Task ${G.mana >= before ? '+' : ''}${G.mana - before} (ตอนนี้ ${G.mana}/${G.manaMax}) — ปั่นงานปกติ ${passive >= 0 ? '+' : ''}${passive}${passive < 1 ? ' (ประชุมเสียเวลา)' : ''}${bugs ? `, บั๊ก −${bugs}` : ''}`);
    // intel
    const shown = a => {
      const p = a.p;
      if (p.overpromised || (er(p) === 'severance_seeker' && a.type === 'SKILL')) return 'bug';
      if (p.faction === 'light') return 'work';
      const side = A.find(x => x.side && x.p === p);
      return side?.type === 'SABOTAGE' ? 'bug' : side?.type === 'FAKE' ? 'work' : 'none';
    };
    const blackout = evId === 'blackout';
    const intelSkills = role => {
      if (!blackout) return skills(role);
      skills(role).forEach(a => add(a.p.id, `${G.spec(a.p).skill}: ไฟดับ/เน็ตหลุด ไม่ได้ข้อมูลเลย 🔌`));
      return [];
    };
    const sLabel = x => x === 'work' ? 'ส่งงานจริง ✅' : x === 'bug' ? 'แอบวางบั๊ก 🐛' : 'ไม่ได้ส่งงานเมื่อคืน';
    intelSkills('senior_dev').forEach(a => {
      const tids = [a.targets[0]];
      if (evId === 'audit') { const extra = alive().filter(x => x.id !== a.p.id && x.id !== a.targets[0]); if (extra.length) tids.push(rnd(extra).id); }
      tids.forEach(tid => {
        const t = act(tid); if (!t) return;
        const truth = shown(t); let sh = truth;
        const al = alibiOn(tid), hp = honeyOn(tid);
        if (al && t.p.faction === 'dark') { sh = 'work'; al.triggered = true; }
        if (hp) { sh = truth === 'bug' ? 'work' : 'bug'; hp.triggered = true; }
        const mk = x => `Code Review${tid !== a.targets[0] ? ' (ลูกค้าตรวจเพิ่ม)' : ''}: ${t.p.name} → ${sLabel(x)}`;
        add(a.p.id, mk(sh));
        if (sh !== truth) G.fixNotes.push({ pid: a.p.id, text: '(Debug Scanner แก้ข้อมูล) ' + mk(truth) });
      });
    });
    intelSkills('qa_hunter').forEach(a => {
      if (a.targets.length < 2) return;
      const truth = a.targets.some(id => P(id).faction === 'dark');
      let hit = a.targets.some(id => P(id).faction === 'dark' && !alibiOn(id));
      a.targets.forEach(id => { const al = alibiOn(id); if (al && P(id).faction === 'dark') al.triggered = true; });
      const hp = a.targets.map(honeyOn).find(Boolean); if (hp) { hit = !hit; hp.triggered = true; }
      const mk = h => `Bug Bounties: ใน ${a.targets.map(nm).join(' และ ')} ${h ? 'มีฝ่ายมืดอย่างน้อย 1 คน 😈' : 'ไม่มีฝ่ายมืดเลย ✅'}`;
      add(a.p.id, mk(hit));
      if (hit !== truth) G.fixNotes.push({ pid: a.p.id, text: '(Debug Scanner แก้ข้อมูล) ' + mk(truth) });
    });
    intelSkills('data_oracle').forEach(a => add(a.p.id, `KPI Forecast: งานเสร็จจริง ${lightsAlive.length} ชิ้น vs บั๊กแฝง ${A.filter(x => x.type === 'SABOTAGE').length} ชิ้น`));
    intelSkills('rune_ux').forEach(a => {
      const tid = a.targets[0]; if (tid == null) return;
      const all = A.filter(x => x.p.id !== a.p.id && (x.type === 'SKILL' || x.type === 'CURSE') && x.targets?.includes(tid)).map(x => x.p);
      const hp = honeyOn(tid); if (hp) hp.triggered = true;
      const who = (hp ? all.filter(p => p.faction !== 'dark') : all).map(p => p.name);
      const mk = list => `Wireframe Trap: คนที่ใช้สกิลใส่ ${nm(tid)} เมื่อคืน → ${list.length ? list.join(', ') : 'ไม่มีใครเลย'}`;
      add(a.p.id, mk(who));
      if (hp && who.length !== all.length) G.fixNotes.push({ pid: a.p.id, text: '(Debug Scanner แก้ข้อมูล) ' + mk(all.map(p => p.name)) });
    });
    skills('glory_thief').forEach(a => {
      const tid = a.targets[0]; if (tid == null) return;
      const ta = act(tid);
      if (ta && ta.type === 'SKILL' && ta.p.faction === 'light' && !G.skillsBanned()) {
        G.credit[a.p.id]++;
        const stolen = notes[tid] || []; delete notes[tid];
        add(a.p.id, `Take Credit: ${nm(tid)} ใช้สกิลสำเร็จ — คุณได้ +1 Credit (รวม ${G.credit[a.p.id]}/2)${stolen.length ? ' และขโมยแจ้งเตือน: ' + stolen.map(x => x.text).join(' | ') : ''}`);
        stolen.forEach(x => (notes[a.p.id] = notes[a.p.id] || []).push({ text: '(ขโมยมา) ' + x.text }));
      } else add(a.p.id, `Take Credit: ${nm(tid)} ไม่ได้ใช้สกิลสำเร็จคืนนี้ (หรือไม่ใช่ฝ่ายแสง) — ไม่ได้ Credit`);
    });
    skills('soul_recruiter').forEach(a => {
      const tid = a.p.target;
      if (a.plus1 && !a.p.plus1Used) { a.p.plus1Used = true; G.pendingBonus.push({ to: tid }); add(a.p.id, `Poach Offer: แอบยัดคะแนนโหวต +1 ใส่ ${nm(tid)} ในวันพรุ่งนี้ (ใช้สิทธิ์ 1 ครั้ง/เกมแล้ว)`); }
      else { const v = Object.entries(G.lastVotes).filter(([, t]) => t === tid).map(([v]) => nm(+v)); add(a.p.id, `Poach Offer: เป้าหมายของคุณคือ ${nm(tid)} — โหวตรอบล่าสุดโดน: ${v.length ? v.join(', ') : 'ยังไม่มีใครโหวต'}`); }
    });
    skills('severance_seeker').forEach(a => { G.pendingBonus.push({ to: a.p.id }); add(a.p.id, 'Fake Bug Trace: ทิ้งรอยบั๊กปลอมใน Log ของคุณแล้ว และแอบเพิ่มคะแนนโหวต +1 ใส่ตัวเองในวันพรุ่งนี้'); });
    // Reply All
    const broadcast = [];
    skills('chaos_intern').forEach(a => {
      const victims = shuffle(Object.keys(notes).map(Number).filter(id => id !== a.p.id && notes[id].length));
      broadcast.push(victims.length ? `[Reply All] ${notes[victims[0]][0].text}` : '[Reply All] ไม่มีแจ้งเตือนให้ป่าวประกาศเลย');
    });
    G.traps.filter(t => t.fresh && t.triggered).forEach(t => rep.push(`🪤 Trap Card ทำงาน: ${TRAPS[t.kind].n}`));
    G.traps = G.traps.filter(t => !['honeypot', 'alibi', 'insurance'].includes(t.kind));
    G.traps.forEach(t => t.fresh = false);
    // deaths
    deaths.forEach(id => { const t = P(id); t.alive = false; t.cause = 'burnout'; });
    if (deaths.length) rep.unshift('💀 ' + deaths.map(id => nm(id)).join(', ') + ' ติดสถานะ Burnout! (บทบาทไม่ถูกเปิดเผยจนจบเกม)');
    else rep.unshift(G.day === 1 ? 'คืนแรกผ่านไปอย่างสงบ (Grace Period)' : '😮‍💨 เมื่อคืนไม่มีใคร Burnout');
    G.players.filter(p => p.role === 'soul_recruiter' && p.alive && !P(p.target).alive && !P(p.target).votedOut).forEach(p => {
      const pool = alive().filter(x => x.id !== p.id);
      if (pool.length) { p.target = rnd(pool).id; add(p.id, `เป้าหมายเดิมออกจากเกมแล้ว — เป้าหมายลับใหม่ของคุณคือ ${nm(p.target)}`); }
    });
    G.players.forEach(p => {
      (notes[p.id] || []).forEach(n => { if (G.blockIntel === p.id) return; G.intel[p.id].push({ day: G.day, text: n.text }); });
    });
    G.report = rep;
    broadcast.forEach(t => G.feed.push({ kind: 'anon', who: -1, name: 'ไม่ระบุชื่อ', text: t, ts: Date.now() }));
    rep.forEach(r => G.sys(r));
    G.blockIntel = null;
    G.players.forEach(p => p.overpromised = false);
    G.log('ประมวลผลกลางคืน', rep.join(' | '));
  },
};
