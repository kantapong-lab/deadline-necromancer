// Game engine (server-authoritative) — พอร์ตกติกาจาก poc/index.html เป็นโมดูลไม่มี UI/บอท
// Moderator เป็นคนสั่งเปลี่ยนเฟส ผู้เล่นส่งแอ็กชันของตัวเองผ่าน method ด้านล่าง
const { ROLES, EVENTS, TRAPS, DAYS, LIGHT, DARK, INDIE } = require('../shared/data');
const { shuffle, rnd } = require('./random');
const { COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS } = require('./constants');
const chat = require('./chat');
const events = require('./events');
const vote = require('./vote');
const nightInput = require('./night-input');
const nightResolve = require('./night-resolve');
const phases = require('./phases');
const win = require('./win');
const views = require('./views');
const modViewPart = require('./mod-view');

// Mixes the method groups of src/engine/*.js onto Game.prototype (non-enumerable, like class methods).
// Throws if a name is already defined, so two parts can never silently shadow each other.
function mixin(target, ...parts) {
  for (const part of parts) {
    for (const key of Reflect.ownKeys(part)) {
      if (Object.prototype.hasOwnProperty.call(target.prototype, key)) throw new Error('Game mixin: duplicate method ' + String(key));
      Object.defineProperty(target.prototype, key, { ...Object.getOwnPropertyDescriptor(part, key), enumerable: false });
    }
  }
}

class Game {
  constructor(names) {
    const N = names.length;
    if (!COMP[N]) throw new Error('จำนวนผู้เล่นต้อง ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' คน');
    const [l, d, i] = COMP[N];
    const roles = shuffle([...shuffle(LIGHT).slice(0, l), ...shuffle(DARK).slice(0, d), ...shuffle(INDIE).slice(0, i)]);
    this.players = names.map((name, id) => ({
      id, name, role: roles[id], faction: ROLES[roles[id]].f, alive: true, used: false, copy: null, copyFrom: null,
      silenced: false, zero: false, dbl: false, silencedNext: false, zeroNext: false, dblNext: false,
      overpromised: false, dodgeUsed: false, plus1Used: false, locked: false, lockedNext: false,
      votedOut: false, soloWon: false, cause: null, target: null,
    }));
    this.day = 1; this.phase = 'MORNING';
    this.mana = 1; this.manaMax = Math.floor(N / 2); this.skipStreak = 0;
    this.trapCharges = N <= 9 ? 1 : 2; this.boosterCharges = 1;   // โควตา Sprint Booster 1 ครั้ง/เกม ทุกขนาดห้อง
    // Trap ฝ่ายมืด: ระบบสุ่มแจกตามโควตาตอนเริ่มเกม (ทั้งทีมถือร่วมกัน) · ขอสุ่มเปลี่ยนใบที่ยังไม่ใช้ได้ 1 ครั้ง/คืน
    this.trapHand = shuffle(Object.keys(TRAPS)).slice(0, this.trapCharges); this.trapRerolled = false;
    this.pendingBonus = []; this.bonusVotes = []; this.traps = []; this.fixNotes = [];
    this.cleanSprint = false; this.retro = false; this.noPenalty = false; this.freeze = false;
    this.hijackVoter = null; this.blockIntel = null; this.lastTrapPlaced = false;
    this.deck = shuffle(Object.keys(EVENTS)); this.event = null;
    this.booster = { open: false, votes: {} };
    this.night = {}; this.votes = {}; this.voteResult = null; this.lastVotes = {};
    this.feed = []; this.darkChat = []; this.intel = {}; this.report = []; this.timeline = [];
    this.voteRound = 0; this.interim = null; this.nightStash = null; this.chatUsed = {};
    this.credit = {}; this.over = null; this.paused = false; this.timer = null;
    this.players.forEach(p => { this.credit[p.id] = 0; this.intel[p.id] = []; });
    const rec = this.players.find(p => p.role === 'soul_recruiter');
    if (rec) rec.target = rnd(this.players.filter(p => p.id !== rec.id)).id;
    this.log('เริ่มเกม', `ผู้เล่น ${N} คน (แสง ${l} / มืด ${d} / อิสระ ${i}) · เป้า Mana ${this.manaMax} · เริ่มที่ 1 (Kickoff)`);
    this.report = [`สัปดาห์ใหม่เริ่มแล้ว! Deadline คือวันศุกร์นี้ ปั่นหลอด Mana ให้เต็ม ${this.manaMax} หน่วย (เริ่มต้นที่ 1 จาก Kickoff)`];
    this.sys('เข้าสู่ห้องประชุมเช้าวัน' + DAYS[0]);
    this.booster = { open: this.boosterCharges > 0, votes: {} };
  }

  // ---------- helpers ----------
  P(id) { return this.players[id]; }
  nm(id) { return this.players[id].name; }
  alive() { return this.players.filter(p => p.alive); }
  er(p) { return p.role === 'mystery_intern' ? p.copy : p.role; }
  spec(p) { return ROLES[this.er(p)]; }
  hasSkill(p) { const s = this.spec(p); return !!s && !(ROLES[p.role].once && p.used) && !p.locked; }
  evIs(id) { return this.event?.id === id; }
  skillsBanned() { return this.event?.id === 'prod' && this.event.accepted === true; }
  curseBlocked() { return this.day === 1 || this.event?.id === 'watch'; }
  sys(text) { this.feed.push({ kind: 'sys', text, ts: Date.now() }); }
  log(title, text) { this.timeline.push({ ts: Date.now(), day: this.day, phase: this.phase, title, text: text || '' }); }
  candidates(p) {
    const s = this.spec(p); if (!s) return [];
    return this.alive().filter(x => {
      if (s.pool === 'any') return true;
      if (x.id === p.id) return false;
      if (s.pool === 'nondark') return x.faction !== 'dark';
      return true;
    });
  }
  canRest(p) {
    return !this.hasSkill(p) || !!ROLES[p.role].once || this.skillsBanned() || this.evIs('snack');
  }
}

mixin(Game, chat, events, vote, nightInput, nightResolve, phases, win, views, modViewPart);

module.exports = { Game, COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS };
