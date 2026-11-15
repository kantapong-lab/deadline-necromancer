'use strict';
// Night action validation and the Mystery Intern copy.
const { ROLES, TRAPS } = require('../shared/data');
const { shuffle } = require('./random');

// Night actions
module.exports = {
  // action: { type:'SKILL'|'REST', targets:[], plus1?, side?:'FAKE'|'SABOTAGE'|'CURSE'|'TRAP', sideTargets?:[], trapId? }
  submitNight(pid, a) {
    const G = this, p = G.P(pid);
    if (!p?.alive) return 'ไม่มีสิทธิ์ส่งแอ็กชัน';
    if (G.phase !== 'NIGHT') return 'ยังไม่ถึงกลางคืน';
    if (!a || typeof a !== 'object') return 'ข้อมูลไม่ถูกต้อง';
    const out = { type: a.type, targets: (a.targets || []).map(Number) };
    if (out.type === 'SKILL') {
      if (!G.hasSkill(p) || G.skillsBanned()) return 'คืนนี้คุณใช้สกิลไม่ได้';
      const s = G.spec(p), need = Math.max(s.t, 0), cand = G.candidates(p).map(x => x.id);
      if (out.targets.length !== need || new Set(out.targets).size !== need || out.targets.some(t => !cand.includes(t))) return 'เป้าหมายสกิลไม่ถูกต้อง';
      if (a.plus1) { if (p.role !== 'soul_recruiter' || p.plus1Used) return 'ใช้ตัวเลือก +1 ไม่ได้'; out.plus1 = true; }
    } else if (out.type === 'REST') {
      if (!G.canRest(p)) return 'ทุกคนต้องใช้สกิลประจำตัวคืนนี้ (เว้นสกิลครั้งเดียว/สกิลที่ใช้ไม่ได้/การ์ดอนุญาต)';
      out.targets = [];
    } else return 'ชนิดแอ็กชันไม่ถูกต้อง';
    if (p.faction === 'dark') {
      const side = a.side, st = (a.sideTargets || []).map(Number);
      if (!['FAKE', 'SABOTAGE', 'CURSE', 'TRAP'].includes(side)) return 'ฝ่ายมืดต้องเลือกแอ็กชันก่อกวน';
      out.side = side; out.sideTargets = [];
      if (side === 'CURSE') {
        if (G.curseBlocked()) return 'คืนนี้สาป Burnout ไม่ได้';
        const t = G.P(st[0]); if (st.length !== 1 || !t?.alive || t.faction === 'dark') return 'เป้าหมายสาปไม่ถูกต้อง';
        out.sideTargets = st;
      }
      if (side === 'TRAP') {
        const others = Object.entries(G.night).filter(([id, n]) => +id !== pid && n.side === 'TRAP').length;
        if (G.trapCharges - others <= 0) return 'โควตา Trap หมดแล้ว';
        const tdef = TRAPS[a.trapId]; if (!tdef) return 'เลือก Trap Card';
        if (!G.trapHand.includes(a.trapId)) return 'ทีมไม่ได้ถือ Trap ใบนี้';
        if (Object.entries(G.night).some(([id, n]) => +id !== pid && n.side === 'TRAP' && n.trapId === a.trapId)) return 'เพื่อนจอง Trap ใบนี้ไปแล้ว';
        if (tdef.need) {
          const t = G.P(st[0]); if (st.length !== 1 || !t?.alive) return 'เลือกเป้าหมาย Trap';
          if (tdef.need === 'dark' && t.faction !== 'dark') return 'Trap นี้หมอบได้เฉพาะที่ฝ่ายมืด';
          if (tdef.need === 'nondark' && t.faction === 'dark') return 'Trap นี้หมอบที่ฝ่ายมืดไม่ได้';
          out.sideTargets = st;
        }
        out.trapId = a.trapId;
      }
    }
    G.night[pid] = out; return null;
  },
  // ฝ่ายมืดขอสุ่มเปลี่ยน Trap ที่ยังไม่ใช้ — 1 ครั้ง/คืน (ทั้งทีม) · ได้ใบใหม่ที่ไม่ซ้ำกับที่ถืออยู่
  rerollTraps(pid) {
    const G = this, p = G.P(pid);
    if (!p?.alive || p.faction !== 'dark') return 'ไม่มีสิทธิ์สุ่ม Trap';
    if (G.phase !== 'NIGHT') return 'สุ่ม Trap ได้เฉพาะช่วงกลางคืน';
    if (!G.trapHand.length) return 'ไม่มี Trap เหลือให้สุ่ม';
    if (G.trapRerolled) return 'คืนนี้ทีมสุ่ม Trap ไปแล้ว';
    if (Object.values(G.night).some(n => n.side === 'TRAP')) return 'มีเพื่อนจองหมอบ Trap ไว้แล้ว — สุ่มไม่ได้';
    const pool = shuffle(Object.keys(TRAPS).filter(k => !G.trapHand.includes(k)));
    G.trapHand = pool.slice(0, G.trapHand.length); G.trapRerolled = true;
    G.log('ฝ่ายมืดสุ่ม Trap ใหม่', '');
    return null;
  },
  setCopies() {
    this.players.forEach(p => {
      if (p.role !== 'mystery_intern' || !p.alive) return;
      p.copy = null; p.copyFrom = null;
      for (let i = 1; i < this.players.length; i++) {
        const q = this.players[(p.id + i) % this.players.length];
        if (q.alive && q.faction === 'light' && !ROLES[q.role].once) { p.copy = q.role; p.copyFrom = q.name; break; }
      }
    });
  },
};
