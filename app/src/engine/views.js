'use strict';
// Per-player views (what each seat is allowed to see).
const { ROLES, EVENTS, TRAPS, FNAME, DAYS, useLimit } = require('../shared/data');
const { PURGE_MSGS, PURGE_LEN } = require('./constants');

// Views
module.exports = {
  revealed(p, viewer, god) {
    return god || this.phase === 'OVER' || p.id === viewer?.id || (!p.alive && p.cause !== 'burnout') || (viewer?.faction === 'dark' && p.faction === 'dark');
  },
  pubPlayers(viewer, god) {
    return this.players.map(p => {
      const rv = this.revealed(p, viewer, god);
      return {
        id: p.id, name: p.name, alive: p.alive, cause: p.alive ? null : p.cause, silenced: p.alive && p.silenced && (god || p.id === viewer?.id),   // ห้ามเปิดเผยคนอื่น: คนที่โดนสกิลฝ่ายมืดต้องไม่ใช่ฝ่ายมืด
        role: rv ? p.role : null, faction: rv ? p.faction : null,
        me: p.id === viewer?.id, mate: !!viewer && viewer.faction === 'dark' && p.faction === 'dark' && p.id !== viewer.id,
      };
    });
  },
  common() {
    const ev = this.event, e = ev ? EVENTS[ev.id] : null;
    return {
      day: this.day, dayName: DAYS[this.day - 1], phase: this.phase, mana: this.mana, manaMax: this.manaMax, skipStreak: this.skipStreak,
      boosterCharges: this.boosterCharges, boosterOpen: this.booster.open, paused: this.paused, timer: this.timer,
      report: this.report, feed: this.feed.slice(-80),
      event: ev ? { id: ev.id, n: e.n, t: e.t, d: e.d, img: e.img, choice: !!e.choice, yes: e.yes, no: e.no, pending: ev.pending, accepted: ev.accepted, ...(ev.id === 'hands' && ev.extra ? { extra: ev.extra } : {}) } : null,
      voteResult: this.phase === 'VOTE_INTERIM' ? null : this.voteResult, over: this.over && { ...this.over, roles: this.players.map(p => ({ id: p.id, name: p.name, role: p.role, faction: p.faction })) },
      marathon: this.evIs('marathon'),
      ...(this.evIs('redesign') && (this.phase === 'VOTE' || this.phase === 'VOTE_INTERIM') ? { voteRound: this.voteRound } : {}),
      ...(this.phase === 'VOTE_INTERIM' && this.interim ? { interim: this.interim } : {}),
      ...(this.evIs('purge') ? { chatLimit: { msgs: PURGE_MSGS, len: PURGE_LEN } } : {}),
    };
  },
  viewFor(pid) {
    const p = this.P(pid), s = this.spec(p), r = ROLES[p.role];
    const night = this.night[pid];
    const base = this.common();
    const goal = p.faction === 'light' ? 'ปั่น Mana ให้เต็ม หรือไล่ฝ่ายมืดให้หมด' : p.faction === 'dark' ? 'ยื้อถึงวันศุกร์ หรือให้ฝ่ายมืด ≥ ฝ่ายแสง' : r.win;
    return {
      ...base, role: 'player', youId: pid, players: this.pubPlayers(p, false),
      me: {
        id: pid, name: p.name, role: p.role, roleName: r.n, sub: r.sub, faction: p.faction, factionName: FNAME[p.faction], img: r.img,
        skill: r.skill, desc: r.d, goal, alive: p.alive, silenced: p.silenced, dbl: p.dbl, zero: p.zero, locked: p.locked,
        once: !!useLimit(r), usesMax: useLimit(r), usesLeft: Math.max(0, useLimit(r) - p.usedN), used: p.used, plus1Used: p.plus1Used, dodgeUsed: p.dodgeUsed, credit: this.credit[pid],
        target: p.role === 'soul_recruiter' ? p.target : null, targetName: p.role === 'soul_recruiter' ? this.nm(p.target) : null,
        copy: p.copy, copyName: p.copy ? ROLES[p.copy].n : null,
        spec: s ? { skill: s.skill, t: s.t, d: s.d, pool: s.pool } : null,
        skillOK: this.hasSkill(p), canRest: this.canRest(p), skillsBanned: this.skillsBanned(), snack: this.evIs('snack'),
        candidates: this.phase === 'NIGHT' && p.alive ? this.candidates(p).map(x => x.id) : [],
        // เป้าที่ถูกห้ามเพราะซ้ำคืนก่อน (แสดงเป็นปุ่ม disabled) — ว่างถ้ากฎถูกยกเว้น
        repeatBlocked: this.phase === 'NIGHT' && p.alive ? (() => { const ok = this.candidates(p).map(x => x.id); return this.candidatesRaw(p).map(x => x.id).filter(id => !ok.includes(id)); })() : [],
        intel: this.intel[pid],
        night, submitted: !!night,
        voted: this.votes[pid], hijacked: this.hijackVoter === pid,
        eventVote: this.event?.votes?.[pid], boosterVote: this.booster.votes[pid],
        ...(this.evIs('purge') ? { chatLeft: Math.max(0, PURGE_MSGS - (this.chatUsed[pid] || 0)) } : {}),
      },
      dark: p.faction === 'dark' ? {
        trapCharges: this.trapCharges, trapHand: this.trapHand, canReroll: this.phase === 'NIGHT' && this.trapHand.length > 0 && !this.trapRerolled && !Object.values(this.night).some(n => n.side === 'TRAP'), chat: this.darkChat, curseBlocked: this.curseBlocked(),
        // โควตา Trap ที่ยังว่างจริง ๆ คืนนี้ (หักใบที่เพื่อนร่วมลัทธิจองไว้แล้ว)
        trapFree: this.phase === 'NIGHT' ? this.trapCharges - Object.entries(this.night).filter(([id, n]) => +id !== pid && n.side === 'TRAP').length : this.trapCharges,
        mates: this.players.filter(x => x.faction === 'dark' && x.id !== pid).map(x => ({ id: x.id, name: x.name, alive: x.alive })),
        lights: this.alive().filter(x => x.faction !== 'dark').map(x => x.id),
        prevSide: p.prevSide,   // เป้าแอ็กชันก่อกวนคืนก่อน — UI ใช้ disable (ยกเว้นเมื่อไม่เหลือทางเลือก)
        trapNeed: Object.fromEntries(Object.entries(TRAPS).map(([k, t]) => [k, t.need])),
      } : null,
      voteCandidates: this.phase === 'VOTE' ? this.alive().filter(x => x.id !== pid).map(x => x.id) : [],
    };
  },
};
