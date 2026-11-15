'use strict';
// Morning chat and the dark faction's night chat.
const { EMOJIS } = require('./constants');

// Chat
module.exports = {
  chat(pid, text) {
    const p = this.P(pid); if (!p || !p.alive) return 'ผู้เล่นที่ออกจากเกมแล้วพิมพ์ไม่ได้';
    if (this.phase !== 'MORNING' && this.phase !== 'VOTE_INTERIM') return 'พิมพ์แชทได้เฉพาะช่วงประชุมเช้า';
    text = String(text || '').trim().slice(0, 200); if (!text) return 'ข้อความว่าง';
    if (p.silenced && !EMOJIS.includes(text)) return 'คุณถูก NDA Silence — ส่งได้แค่อีโมจิ';
    this.feed.push({ kind: 'chat', who: pid, name: p.name, text, ts: Date.now() });
    return null;
  },
  darkSay(pid, text) {
    const p = this.P(pid); if (!p || !p.alive || p.faction !== 'dark') return 'ไม่มีสิทธิ์';
    if (this.phase !== 'NIGHT') return 'แชทลับใช้ได้เฉพาะช่วงกลางคืน';
    text = String(text || '').trim().slice(0, 200); if (!text) return 'ข้อความว่าง';
    this.darkChat.push({ name: p.name, text, ts: Date.now() });
    return null;
  },
};
