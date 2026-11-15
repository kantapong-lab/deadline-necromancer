'use strict';
// Moderator phase transitions.
const { DAYS } = require('../shared/data');
const { rnd } = require('./random');

// Phase control (Moderator)
module.exports = {
  toVote() {
    if (this.phase !== 'MORNING') return 'เปลี่ยนเฟสไม่ได้ในตอนนี้';
    if (this.event?.pending) this.closeEventVote();
    if (this.booster.open) this.closeBoosterVote();
    if (this.phase === 'OVER') return null;
    this.phase = 'VOTE'; this.votes = {}; this.voteRound = this.evIs('redesign') ? 1 : 0;
    this.log('เริ่มเฟสโหวตไล่ออก', this.evIs('marathon') ? 'ประชุมมาราธอน: ห้าม Skip' : '');
    this.sys('🗳️ เริ่มเฟสโหวตไล่ออก (PIP Vote)');
    return null;
  },
  toNight() {
    if (this.phase !== 'VOTE_RESULT') return 'เปลี่ยนเฟสไม่ได้ในตอนนี้';
    // จำเป้าที่เลือกจริงเมื่อคืนก่อน (ห้ามซ้ำติดกัน) — พัก/ถูกห้ามใช้สกิล/ไม่ส่งแอ็กชัน = ว่าง = รีเซ็ต
    this.players.forEach(p => {
      const n = this.night[p.id];
      p.prevTargets = n?.type === 'SKILL' ? [...n.targets] : [];
      p.prevSide = n && (n.side === 'CURSE' || n.side === 'TRAP') ? [...(n.sideTargets || [])] : [];
    });
    this.phase = 'NIGHT'; this.night = {}; this.darkChat = []; this.trapRerolled = false;
    this.setCopies();
    this.log('เริ่มกลางคืน', 'ผู้เล่นเลือกแอ็กชันลับพร้อมกัน');
    this.sys('🌙 เข้าสู่กลางคืน — ทุกคนเลือกแอ็กชันลับ');
    return null;
  },
  closeNight() {
    if (this.phase !== 'NIGHT') return 'เปลี่ยนเฟสไม่ได้ในตอนนี้';
    const G = this;
    // ผู้ที่ไม่ส่งแอ็กชัน → ค่าเริ่มต้น (พัก / ส่งงานหลอก)
    G.alive().forEach(p => {
      if (G.night[p.id]) return;
      const n = { type: 'REST', targets: [] };
      if (p.faction === 'dark') { n.side = 'FAKE'; n.sideTargets = []; }
      G.night[p.id] = n;
    });
    G.resolveNight({ defer: true });
    G.cleanSprint = G.freeze = G.retro = G.noPenalty = false;
    if (G.checkEnd()) { G.publishNight({ gated: false }); return null; }
    if (G.day >= 5) { G.publishNight({ gated: false }); G.endGame('timeout'); return null; }
    G.day++;
    G.bonusVotes = G.pendingBonus; G.pendingBonus = [];
    G.alive().forEach(p => { p.locked = p.lockedNext; p.lockedNext = false; p.silenced = p.silencedNext; p.zero = p.zeroNext; p.dbl = p.dblNext; p.silencedNext = p.zeroNext = p.dblNext = false; });
    G.players.filter(p => !p.alive).forEach(p => p.silenced = p.zero = p.dbl = false);
    // ไม่ประกาศชื่อผู้ถูก NDA Silence ต่อสาธารณะ (เป็นการยืนยันว่าไม่ใช่ฝ่ายมืด) — แจ้งเฉพาะเจ้าตัวแบบลับ
    G.alive().filter(p => p.silenced && G.intel[p.id]).forEach(p => G.intel[p.id].push({ day: G.day, text: '🤐 NDA Silence: คุณถูกปิดปาก (พิมพ์แชทได้แค่อีโมจิ และโหวตไม่ได้วันนี้)' }));
    G.phase = 'MORNING'; G.votes = {}; G.timer = null;
    G.sys('— เช้าวัน' + DAYS[G.day - 1] + ' —');
    G.log('เริ่มเช้าวัน' + DAYS[G.day - 1], 'ประกาศผลเมื่อคืนและเปิดห้องประชุม');
    G.booster = { open: G.boosterCharges > 0, votes: {} };
    G.hijackVoter = null;
    const hj = G.traps.find(t => t.kind === 'hijack' && t.day === G.day - 1);
    if (hj) {
      const pool = G.alive().filter(p => !p.silenced);
      if (pool.length) G.hijackVoter = rnd(pool).id;
      G.traps = G.traps.filter(t => t !== hj);
      const m = '🪤 Trap Card ทำงาน: Meeting Hijack';
      G.addNightLine(m, { sys: true });
      if (G.hijackVoter != null) G.intel[G.hijackVoter].push({ day: G.day, text: '🎤 ไมค์ของคุณถูกยึด (Meeting Hijack) — วันนี้คุณถูกบังคับให้โหวต Skip' });
    }
    G.drawEvent();
    G.publishNight({ gated: G.evIs('status') });
    G.checkEnd();
    return null;
  },
};
