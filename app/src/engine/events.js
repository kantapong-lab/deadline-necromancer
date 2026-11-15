'use strict';
// Event-card vote, Sprint Booster vote, event draw and the Reply-All leak.
const { EVENTS, BOOSTERS } = require('../shared/data');
const { shuffle } = require('./random');

// Choice event + booster votes (MORNING), event draw
module.exports = {
  castEventChoice(pid, accept) {
    const p = this.P(pid); if (!p?.alive) return 'ไม่มีสิทธิ์โหวต';
    if (this.phase !== 'MORNING' || !this.event?.pending) return 'ตอนนี้ไม่มีการ์ดให้โหวต';
    this.event.votes[pid] = !!accept; return null;
  },
  closeEventVote() {
    const ev = this.event; if (!ev?.pending) return;
    const e = EVENTS[ev.id];
    let yes = 0, no = 0;
    Object.entries(ev.votes).forEach(([pid, v]) => { if (this.P(+pid).alive) (v ? yes++ : no++); });
    ev.accepted = yes > no; ev.pending = false;
    if (ev.accepted && ev.id === 'ot') this.mana = Math.min(this.manaMax, this.mana + 1);
    if (ev.id === 'prod' && !ev.accepted) this.mana = Math.max(0, this.mana - 2);   // รับ = +0, ปฏิเสธ = −2 + คำสาปสุ่มคืนนี้
    const msg = `ทีมโหวต ${e.yes} ${yes} / ${e.no} ${no} → ${ev.accepted ? e.yes : e.no}`;
    this.sys('📞 ' + msg); this.report.push('📞 ' + e.t + ': ' + msg);
    this.log('ปิดโหวตการ์ดเหตุการณ์', msg);
    this.checkEnd();
  },
  castBooster(pid, key) {
    const p = this.P(pid); if (!p?.alive) return 'ไม่มีสิทธิ์โหวต';
    if (this.phase !== 'MORNING' || !this.booster.open) return 'ตอนนี้ไม่มีการโหวต Sprint Booster';
    if (key !== 'NONE' && !BOOSTERS[key]) return 'ตัวเลือกไม่ถูกต้อง';
    this.booster.votes[pid] = key; return null;
  },
  closeBoosterVote() {
    if (!this.booster.open) return;
    this.booster.open = false;
    const keys = Object.keys(BOOSTERS), tally = { NONE: 0 }; keys.forEach(k => tally[k] = 0);
    this.alive().forEach(p => { tally[this.booster.votes[p.id] || 'NONE']++; });
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    const win = top[0], tie = top[1] && top[1][1] === win[1];
    const counts = keys.map(k => BOOSTERS[k].n + ' ' + tally[k]).join(' / ') + ' / ไม่เปิด ' + tally.NONE;
    if (win[0] === 'NONE' || tie) { const m = `🚀 โหวต Sprint Booster: ไม่เปิดใช้ (${counts})`; this.sys(m); this.log('ปิดโหวต Sprint Booster', 'ไม่เปิดใช้ · ' + counts); return; }
    const id = win[0]; this.boosterCharges--;
    let m = `🚀 Sprint Booster เปิดใช้: ${BOOSTERS[id].n} (เหลือโควตา ${this.boosterCharges})`;
    if (id === 'scanner') {
      m += ` — เมื่อคืน${this.lastTrapPlaced ? 'มี' : 'ไม่มี'} Trap Card ถูกหมอบ`;
      this.fixNotes.forEach(f => this.intel[f.pid].push({ day: this.day, text: f.text }));
      this.fixNotes = [];
    }
    if (id === 'retro') this.retro = true;
    if (id === 'freeze') this.freeze = true;
    this.sys(m); this.report.push(m); this.log('Sprint Booster เปิดใช้', BOOSTERS[id].n + ' · ' + counts);
  },
  drawEvent() {
    this.event = null;
    if (this.day < 2 || !this.deck.length) return;
    const id = this.deck.pop(), e = EVENTS[id];
    this.event = { id, accepted: null, pending: !!e.choice, votes: {} };
    this.sys('📞 Client Event: ' + e.t + ' — ' + e.d);
    this.log('เปิด Event Card #' + e.n, e.t + ' — ' + e.d);
    if (e.now) this.mana = Math.max(0, Math.min(this.manaMax, this.mana + e.now));
    if (id === 'leak') this.replyAllLeak();
  },
  replyAllLeak() {
    const key = p => { const n = this.night[p.id]; return n ? n.type + '/' + (n.side || '') : null; };
    const pool = this.alive().filter(p => key(p));
    if (pool.length < 2) return;
    const [a, b] = shuffle(pool).slice(0, 2);
    const msg = `📧 Reply-All Leak: เมื่อคืน ${a.name} กับ ${b.name} ทำแอ็กชัน${key(a) === key(b) ? '"เหมือนกัน"' : '"ต่างกัน"'}`;
    this.sys(msg); this.report.push(msg);
  },
};
