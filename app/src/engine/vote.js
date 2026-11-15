'use strict';
// Day vote: casting and closing (tally, outcome, traps).
const { ROLES, FNAME } = require('../shared/data');
const { rnd } = require('./random');

// Day vote
module.exports = {
  castVote(pid, target) {
    const p = this.P(pid); if (!p?.alive) return 'ไม่มีสิทธิ์โหวต';
    if (this.phase !== 'VOTE') return 'ยังไม่ถึงเฟสโหวต';
    if (p.silenced) return 'คุณถูก NDA Silence — โหวตไม่ได้ในรอบนี้';
    if (pid === this.hijackVoter) return 'ไมค์ของคุณถูกยึด (Meeting Hijack) — คุณถูกบังคับให้ Skip';
    if (target === 'SKIP') { if (this.evIs('marathon')) return 'ประชุมมาราธอน: วันนี้ห้ามกด Skip'; }
    else if (!this.P(target)?.alive || target === pid) return 'เป้าหมายไม่ถูกต้อง';
    this.votes[pid] = target; return null;
  },
  // Pure: who voted what and the weighted tally (no writes, no bonusVotes).
  tallyVotes() {
    const G = this, P = id => G.P(id);
    const votes = {};
    G.alive().forEach(p => {
      if (p.silenced) return;
      if (p.id === G.hijackVoter) { votes[p.id] = 'SKIP'; return; }
      const v = G.votes[p.id];
      votes[p.id] = v !== undefined ? v : (G.evIs('marathon') ? undefined : 'SKIP');   // ไม่โหวต = Skip (มาราธอนไม่นับ)
      if (votes[p.id] === undefined) delete votes[p.id];
    });
    const tally = {}; let skip = 0;
    Object.entries(votes).forEach(([vid, t]) => {
      const v = P(+vid), w = (v.zero ? 0 : v.dbl ? 2 : 1) * (v.role === 'chaos_intern' && G.day >= 4 ? 2 : 1);
      if (t === 'SKIP') skip += w; else tally[t] = (tally[t] || 0) + w;
    });
    return { votes, tally, skip };
  },
  // Redesign round 1 only: publish counts, keep every other vote effect for the final close.
  closeRound1() {
    const G = this;
    const { tally, skip } = G.tallyVotes();
    const rows = Object.entries(tally).map(([id, n]) => ({ name: G.nm(+id), n })).sort((a, b) => b.n - a.n);
    G.interim = { tally: rows, skip };
    G.phase = 'VOTE_INTERIM'; G.timer = null;
    const txt = rows.map(r => `${r.name} ${r.n}`).join(', ') + (rows.length ? ', ' : '') + `Skip ${skip}`;
    G.sys('🗳️ ผลโหวตรอบแรก (ยังไม่ตัดสิน): ' + txt); G.log('ปิดโหวตรอบแรก', txt);
    return null;
  },
  openRound2() {
    const G = this;
    if (G.phase !== 'VOTE_INTERIM') return 'เปลี่ยนเฟสไม่ได้ในตอนนี้';
    G.phase = 'VOTE'; G.voteRound = 2; G.interim = null; G.timer = null;
    G.log('เปิดโหวตรอบสอง', 'โหวตใหม่ได้ ใครไม่โหวตใหม่ใช้คะแนนรอบแรก');
    G.sys('🗳️ เปิดโหวตรอบสอง — โหวตใหม่ได้');
    return null;
  },
  closeVote() {
    const G = this, P = id => G.P(id), nm = id => G.nm(id);
    if (G.evIs('redesign') && G.voteRound === 1) return G.closeRound1();
    const { votes, tally, skip } = G.tallyVotes();
    G.bonusVotes.forEach(b => { if (P(b.to).alive) tally[b.to] = (tally[b.to] || 0) + 1; });
    const bonusUsed = G.bonusVotes.length; G.bonusVotes = [];
    G.lastVotes = votes;
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    let outcome = null, text;
    if (sorted.length && sorted[0][1] > 0 && (!sorted[1] || sorted[0][1] > sorted[1][1]) && sorted[0][1] > skip) outcome = +sorted[0][0];
    const trapMsgs = [];
    if (outcome !== null) {
      const bl = G.traps.find(t => t.kind === 'blame' && t.day === G.day - 1);
      if (bl && P(outcome).faction === 'dark') { outcome = null; G.traps = G.traps.filter(t => t !== bl); trapMsgs.push('🪤 Trap Card ทำงาน: Blame Shifting — ยกเลิกการไล่ออก ผลโหวตกลายเป็น Skip'); }
    }
    if (outcome !== null) {
      const ex = G.traps.find(t => t.kind === 'exit' && t.day === G.day - 1 && t.target === outcome);
      if (ex) {
        G.traps = G.traps.filter(t => t !== ex); G.mana = Math.max(0, G.mana - 1);
        const lights = G.alive().filter(p => p.faction === 'light' && p.id !== outcome);
        if (lights.length) G.blockIntel = rnd(lights).id;
        trapMsgs.push('🪤 Trap Card ทำงาน: Exit Scam — Mana −1 และแจ้งเตือนลับของฝ่ายแสง 1 คนจะถูกบล็อกพรุ่งนี้เช้า');
      }
    }
    const lines = G.alive().map(p => p.silenced ? `${p.name}: 🤐 ถูกปิดปาก โหวตไม่ได้` : (votes[p.id] === undefined ? `${p.name}: (ไม่ลงคะแนน)` : `${p.name} → ${votes[p.id] === 'SKIP' ? 'Skip' : nm(votes[p.id])}`));
    if (bonusUsed) lines.push(`🎯 มีคะแนนโหวตลับ +1 จากสกิล ${bonusUsed} คะแนนถูกนับรวม`);
    if (outcome === null) {
      if (G.retro) { G.noPenalty = true; text = 'คะแนนเสมอหรือ Skip ชนะ — ไม่มีใครถูกไล่ออก (Retrospective: ยกเลิกโทษ Skip รอบนี้)'; }
      else {
        G.skipStreak++;
        text = `คะแนนเสมอหรือ Skip ชนะ — ไม่มีใครถูกไล่ออก ⏳ ประชุมเสียเวลา คืนนี้ Mana ปั่นงานได้ ${1 - Math.min(G.skipStreak, 2)} แทน +1 (Skip ติดกัน ${G.skipStreak} รอบ)`;
      }
    } else {
      G.skipStreak = 0;
      const t = P(outcome); t.alive = false;
      if (t.role === 'severance_seeker') {
        t.soloWon = true; t.cause = 'seeker';
        text = `${t.name} ถูกโหวตไล่ออก... และเผยว่าเป็น Severance Seeker! คว้าเงินชดเชยแล้วชิ่งออกจากเกม (ชนะส่วนตัว)`;
      } else {
        t.votedOut = true; t.cause = 'fired';
        text = `${t.name} ถูกไล่ออก! บทบาทคือ ${ROLES[t.role].n} (${FNAME[t.faction]})`;
        if (t.faction === 'dark') { G.mana = Math.min(G.manaMax, G.mana + 2); G.cleanSprint = true; text += ' — กำจัดตัวถ่วงสำเร็จ Mana +2! (Clean Sprint: คืนนี้สายสืบเจาะ Honeypot Bug ได้)'; }
      }
    }
    if (trapMsgs.length) text += ' · ' + trapMsgs.join(' · ');
    G.traps = G.traps.filter(t => t.day >= G.day);
    G.voteResult = { lines, text, tally: Object.entries(tally).map(([id, n]) => ({ name: nm(+id), n })).sort((a, b) => b.n - a.n), skip };
    G.phase = 'VOTE_RESULT'; G.voteRound = 0;
    G.sys('ผลโหวต: ' + text); G.log('ปิดโหวต — ประกาศผล', text);
    G.checkEnd();
  },
};
