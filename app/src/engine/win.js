'use strict';
// Win check and end of game.

// Win check
module.exports = {
  checkEnd() {
    const L = this.alive().filter(p => p.faction === 'light').length, D = this.alive().filter(p => p.faction === 'dark').length;
    if (this.mana >= this.manaMax) return this.endGame('light', 'Mana Task เต็ม 100% — ส่งงานทัน Deadline!');
    if (D === 0) return this.endGame('light', 'ไล่ฝ่ายมืดออกจากบริษัทจนหมดแล้ว!');
    if (D >= L) return this.endGame('dark', 'ฝ่ายมืดมีจำนวนมากกว่าหรือเท่ากับฝ่ายแสงแล้ว — บริษัทล่มสลาย');
    return false;
  },
  endGame(side, why) {
    if (side === 'timeout') why = 'หมดวันศุกร์แล้ว โปรเจกต์ยังไม่เสร็จ — ลัทธิอู้งานยื้อสำเร็จ';
    const winners = this.players.filter(p => {
      if (p.faction === 'light') return side === 'light';
      if (p.faction === 'dark') return side === 'dark' || side === 'timeout';
      if (p.role === 'severance_seeker') return p.soloWon;
      if (p.role === 'soul_recruiter') return this.P(p.target).votedOut;
      if (p.role === 'glory_thief') return side === 'light' && p.alive && this.credit[p.id] >= 2;
      if (p.role === 'chaos_intern') return side === 'timeout' && p.alive;
      return false;
    }).map(p => p.id);
    this.over = { side: side === 'timeout' ? 'dark' : side, why, winners };
    this.phase = 'OVER';
    this.sys('🏁 จบเกม: ' + why); this.log('จบเกม', why);
    return true;
  },
};
