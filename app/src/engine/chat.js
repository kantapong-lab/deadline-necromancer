'use strict';
// Morning chat and the dark faction's night chat.
const { EMOJIS, PURGE_MSGS, PURGE_LEN } = require('./constants');

// Chat
module.exports = {
  chat(pid, text) {
    const p = this.P(pid); if (!p || !p.alive) return 'ผู้เล่นที่ออกจากเกมแล้วพิมพ์ไม่ได้';
    if (this.phase !== 'MORNING' && this.phase !== 'VOTE_INTERIM') return 'พิมพ์แชทได้เฉพาะช่วงประชุมเช้า';
    const raw = String(text || '').trim(); if (!raw) return 'ข้อความว่าง';
    if (p.silenced && !EMOJIS.includes(raw.slice(0, 200))) return 'คุณถูก NDA Silence — ส่งได้แค่อีโมจิ';
    let counted = false;
    if (this.evIs('purge')) {   // Meeting Purge: reject (never truncate) over-long text; emoji-only is exempt
      const stripped = EMOJIS.reduce((s, e) => s.split(e).join(''), raw).trim();
      if (stripped) {
        if (this.chatCount(stripped) > PURGE_LEN) return `ข้อความยาวเกิน ${PURGE_LEN} ตัวอักษร (Meeting Purge) — ไม่ได้ส่ง ไม่เสียโควตา`;
        if ((this.chatUsed[pid] || 0) >= PURGE_MSGS) return `โควตาแชทวันนี้หมดแล้ว (Meeting Purge: ${PURGE_MSGS} ข้อความ)`;
        counted = true;
      }
    }
    text = raw.slice(0, 200);
    this.feed.push({ kind: 'chat', who: pid, name: p.name, text, ts: Date.now() });
    if (counted) this.chatUsed[pid] = (this.chatUsed[pid] || 0) + 1;
    return null;
  },
  chatCount(s) { return Array.from(s).length; },
  darkSay(pid, text) {
    const p = this.P(pid); if (!p || !p.alive || p.faction !== 'dark') return 'ไม่มีสิทธิ์';
    if (this.phase !== 'NIGHT') return 'แชทลับใช้ได้เฉพาะช่วงกลางคืน';
    text = String(text || '').trim().slice(0, 200); if (!text) return 'ข้อความว่าง';
    this.darkChat.push({ name: p.name, text, ts: Date.now() });
    return null;
  },
};
