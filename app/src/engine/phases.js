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
    this.phase = 'VOTE'; this.votes = {};
    this.log('เริ่มเฟสโหวตไล่ออก', this.evIs('marathon') ? 'ประชุมมาราธอน: ห้าม Skip' : '');
    this.sys('🗳️ เริ่มเฟสโหวตไล่ออก (PIP Vote)');
    return null;
  },
  toNight() {
    if (this.phase !== 'VOTE_RESULT') return 'เปลี่ยนเฟสไม่ได้ในตอนนี้';
    this.phase = 'NIGHT'; this.night = {}; this.darkChat = [];
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
    G.resolveNight();
    G.cleanSprint = G.freeze = G.retro = G.noPenalty = false;
    if (G.checkEnd()) return null;
    if (G.day >= 5) { G.endGame('timeout'); return null; }
    G.day++;
    G.bonusVotes = G.pendingBonus; G.pendingBonus = [];
    G.alive().forEach(p => { p.locked = p.lockedNext; p.lockedNext = false; p.silenced = p.silencedNext; p.zero = p.zeroNext; p.dbl = p.dblNext; p.silencedNext = p.zeroNext = p.dblNext = false; });
    G.players.filter(p => !p.alive).forEach(p => p.silenced = p.zero = p.dbl = false);
    const sil = G.alive().filter(p => p.silenced).map(p => p.name);
    if (sil.length) G.report.push('🤐 NDA Silence: ' + sil.join(', ') + ' ถูกปิดปาก (พิมพ์แชทและโหวตไม่ได้วันนี้)');
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
      const m = '🪤 Trap Card ทำงาน: Meeting Hijack — เวลาคุยลด 30% และมีผู้เล่น 1 คนถูกบังคับให้ Skip';
      G.report.push(m); G.sys(m);
      if (G.hijackVoter != null) G.intel[G.hijackVoter].push({ day: G.day, text: '🎤 ไมค์ของคุณถูกยึด (Meeting Hijack) — วันนี้คุณถูกบังคับให้โหวต Skip' });
    }
    G.drawEvent();
    G.checkEnd();
    return null;
  },
};
