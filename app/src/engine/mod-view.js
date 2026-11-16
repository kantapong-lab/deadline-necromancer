'use strict';
const MANA_LINE = /Mana Task [+-−]?\d|ตอนนี้ \d+\/\d+/;
// Moderator view: pending votes, guidance text and the full moderator state.
const { EVENTS } = require('../shared/data');

// Moderator view
module.exports = {
  // `names`: who is still pending. Moderator screens may face the players, so names are only sent while Secrets are on
  // (the Moderator otherwise sees counts only: a slow submitter would give away the Dark faction, who must pick two actions).
  pending(names = true) {
    const G = this, al = G.alive();
    const list = (arr) => names ? arr.map(p => p.name) : null;
    if (G.phase === 'MORNING') {
      const out = {};
      if (G.event?.pending) out.event = { done: al.filter(p => G.event.votes[p.id] !== undefined).length, total: al.length, waiting: list(al.filter(p => G.event.votes[p.id] === undefined)) };
      if (G.booster.open) out.booster = { done: al.filter(p => G.booster.votes[p.id] !== undefined).length, total: al.length, waiting: list(al.filter(p => G.booster.votes[p.id] === undefined)) };
      return out;
    }
    if (G.phase === 'VOTE') { const need = al.filter(p => !p.silenced && p.id !== G.hijackVoter); return { vote: { done: need.filter(p => G.votes[p.id] !== undefined).length, total: need.length, waiting: list(need.filter(p => G.votes[p.id] === undefined)) } }; }
    if (G.phase === 'VOTE_INTERIM') return {};
    if (G.phase === 'NIGHT') return { night: { done: al.filter(p => G.night[p.id]).length, total: al.length, waiting: list(al.filter(p => !G.night[p.id])) } };
    return {};
  },
  guidance() {
    const G = this, pd = G.pending();
    switch (G.phase) {
      case 'MORNING': {
        const steps = [G.evIs('status') ? 'ประกาศเฉพาะชื่อคนที่ Burnout — วันนี้ห้ามประกาศรายงานเมื่อคืนและหลอด Mana (หน้าสถานะล่ม)' : `ประกาศผลเมื่อคืนและหลอด Mana (${G.mana}/${G.manaMax}) ให้ทุกคนฟัง`];
        if (G.event) steps.push(`อ่านการ์ด Event #${EVENTS[G.event.id].n} "${EVENTS[G.event.id].t}"${G.event.pending ? ' แล้วให้ทุกคนโหวตรับ/ปฏิเสธ' : ''}`);
        if (G.booster.open) steps.push(`เปิดโหวต Sprint Booster (เหลือโควตา ${G.boosterCharges}) — ผู้เล่นโหวตแบบไม่ระบุตัวตน`);
        steps.push('เปิดห้องประชุมให้ถกเถียง' + (G.evIs('marathon') ? ' (ประชุมมาราธอน: เวลาครึ่งเดียว)' : G.hijackVoter != null ? ' (Meeting Hijack: ลดเวลา 30%)' : ''));
        return { title: 'ช่วงเช้า / ห้องประชุม', steps, next: 'เมื่อหมดเวลาคุย กด "ไปเฟสโหวตไล่ออก"' + (pd.event || pd.booster ? ' (ระบบจะปิดโหวตที่ค้างให้อัตโนมัติ)' : '') };
      }
      case 'VOTE': return { title: 'เฟสโหวตไล่ออก', steps: ['บอกให้ทุกคนโหวตเลือกคนที่จะไล่ออกหรือ Skip', G.evIs('marathon') ? 'วันนี้ห้าม Skip' : 'ใครไม่โหวตจะถูกนับเป็น Skip'], next: 'เมื่อโหวตครบ หรือหมดเวลา กด "ปิดโหวตและประกาศผล"' };
      case 'VOTE_INTERIM': return { title: 'พักโหวต — ผลรอบแรก', steps: ['อ่านคะแนนรอบแรก (ยังไม่ตัดสิน) ให้ทุกคนฟัง: ' + (G.interim ? G.interim.tally.map(r => r.name + ' ' + r.n).concat('Skip ' + G.interim.skip).join(', ') : ''), 'ให้ทุกคนคุยกันก่อนโหวตรอบสอง'], next: 'กด "เปิดโหวตรอบสอง" เมื่อพร้อม' };
      case 'VOTE_RESULT': return { title: 'ประกาศผลโหวต', steps: ['อ่านผลโหวตให้ทุกคนฟัง: ' + (G.voteResult?.text || '')], next: 'กด "เข้าสู่กลางคืน" เมื่อพร้อม' };
      case 'NIGHT': return { title: 'กลางคืน — แอ็กชันลับ', steps: ['บอกให้ทุกคนหลับตา/ดูหน้าจอตัวเอง แล้วเลือกแอ็กชันลับ', 'ฝ่ายมืดคุยกันในห้องแชทลับได้'], next: 'เมื่อทุกคนส่งแล้ว (หรือหมดเวลา) กด "ปิดกลางคืนและประมวลผล" — ผู้ที่ไม่ส่งจะถูกตั้งค่าเริ่มต้น' };
      case 'OVER': return { title: 'จบเกม', steps: ['ประกาศผู้ชนะและเปิดบทบาททุกคน'], next: 'กด "เริ่มห้องใหม่" เพื่อเล่นรอบใหม่ด้วยผู้เล่นชุดเดิม' };
      default: return { title: '', steps: [], next: '' };
    }
  },
  modView(secrets) {
    const G = this, base = G.common();
    const hide = base.manaHidden && !secrets;   // จอ Moderator ที่ไม่เปิด Secrets อาจหันเข้าหาผู้เล่น: ห้ามหลุดค่า Mana
    return {
      ...base, role: 'moderator', secrets: !!secrets,
      // จอ Moderator อาจหันเข้าหาผู้เล่น: วัน Status Page Down เห็น Mana เฉพาะตอนเปิด Secrets
      ...(base.manaHidden && secrets ? { mana: G.mana, manaHidden: false } : {}),
      players: G.players.map(p => {
        const rv = secrets || G.phase === 'OVER' || (!p.alive && p.cause !== 'burnout');
        const o = { id: p.id, name: p.name, alive: p.alive, cause: p.alive ? null : p.cause, silenced: !!secrets && p.alive && p.silenced, role: rv ? p.role : null, faction: rv ? p.faction : null };
        if (secrets) Object.assign(o, { zero: p.zero, dbl: p.dbl, locked: p.locked, credit: G.credit[p.id], target: p.target });
        return o;
      }),
      pending: G.pending(!!secrets), guidance: G.guidance(), timeline: G.timeline.slice(-200).map(t => hide ? { ...t, text: t.text.split(' | ').filter(x => !MANA_LINE.test(x)).join(' | ') } : t),
      traps: secrets ? G.traps.map(t => ({ kind: t.kind, target: t.target, day: t.day })) : G.traps.length,
      trapCharges: G.trapCharges, hijackSet: G.hijackVoter != null,
      nightActions: secrets && G.phase !== 'MORNING' ? G.night : null,
      ...(G.evIs('status') && G.event.fullReport ? { statusReport: hide ? G.event.fullReport.filter(x => !MANA_LINE.test(x)) : G.event.fullReport } : {}),
      ...(G.evIs('status') && secrets ? { onCall: G.event.onCall ?? null } : {}),
    };
  },
};
