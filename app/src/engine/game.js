// Game engine (server-authoritative) — พอร์ตกติกาจาก poc/index.html เป็นโมดูลไม่มี UI/บอท
// Moderator เป็นคนสั่งเปลี่ยนเฟส ผู้เล่นส่งแอ็กชันของตัวเองผ่าน method ด้านล่าง
const { ROLES, EVENTS, TRAPS, DAYS, LIGHT, DARK, INDIE, useLimit } = require('../shared/data');
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
const fx = require('./fx');

const FACTION_READERS = ['senior_dev', 'qa_hunter'];

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
    const lightRoles = shuffle(LIGHT).slice(0, l);
    // Small rooms (≤5 Light seats) always hold at least one Light role that can read a faction (Senior Dev / QA Hunter):
    // the Light pool is bigger than the room, so a table with no faction reader at all would be near-unwinnable for them.
    if (l <= 5 && !lightRoles.some(r => FACTION_READERS.includes(r))) lightRoles[lightRoles.length - 1] = rnd(FACTION_READERS);
    const roles = shuffle([...lightRoles, ...shuffle(DARK).slice(0, d), ...shuffle(INDIE).slice(0, i)]);
    this.players = names.map((name, id) => ({
      id, name, role: roles[id], faction: ROLES[roles[id]].f, alive: true, used: false, usedN: 0, copy: null, copyFrom: null,
      silenced: false, zero: false, dbl: false, silencedNext: false, zeroNext: false, dblNext: false,
      overpromised: false, dodgeUsed: false, plus1Used: false, locked: false, lockedNext: false,
      votedOut: false, soloWon: false, cause: null, target: null, prevTargets: [], prevSide: [],
    }));
    this.day = 1; this.phase = 'MORNING';
    this.mana = 1; this.manaMax = Math.floor(N / 2) + 1; this.skipStreak = 0;
    this.trapCharges = N <= 9 ? 1 : 2; this.boosterCharges = 1;   // โควตา Sprint Booster 1 ครั้ง/เกม ทุกขนาดห้อง
    // Trap ฝ่ายมืด: ระบบสุ่มแจกตามโควตาตอนเริ่มเกม (ทั้งทีมถือร่วมกัน) · ขอสุ่มเปลี่ยนใบที่ยังไม่ใช้ได้ 1 ครั้ง/คืน
    this.trapHand = shuffle(Object.keys(TRAPS)).slice(0, this.trapCharges); this.trapRerolled = false;
    this.usedTraps = []; this.eventsSeen = new Set();   // no Trap and no Event card is ever used twice in one game
    this.pendingBonus = []; this.bonusVotes = []; this.traps = []; this.fixNotes = [];
    this.cleanSprint = false; this.retro = false; this.noPenalty = false; this.freeze = false;
    this.hijackVoter = null; this.blockIntel = null; this.lastTrapPlaced = false;
    this.deck = shuffle(Object.keys(EVENTS)); this.event = null;
    this.booster = { open: false, votes: {} };
    this.night = {}; this.votes = {}; this.voteResult = null; this.lastVotes = {};
    this.fx = [];   // presentation events for the 3D Moderator screen (see fx.js) — never part of a view
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
  // usedN counts nights the skill was used; limited roles (once / uses:N) are done when it reaches the limit
  hasSkill(p) { const s = this.spec(p), lim = useLimit(ROLES[p.role]); return !!s && !(lim && (p.used || p.usedN >= lim)) && !p.locked; }
  evIs(id) { return this.event?.id === id; }
  skillsBanned() { return this.event?.id === 'prod' && this.event.accepted === true; }
  curseBlocked() { return this.day === 1 || this.event?.id === 'watch'; }
  sys(text) { this.feed.push({ kind: 'sys', text, ts: Date.now() }); }
  log(title, text) { this.timeline.push({ ts: Date.now(), day: this.day, phase: this.phase, title, text: text || '' }); }
  // กฎห้ามเป้าเดิมติดกัน: ตัดคนที่เลือกเมื่อคืนก่อนออก — ถ้าเหลือน้อยกว่า need ให้ยกเว้นกฎคืนนั้น
  avoidRepeat(list, prev, need) {
    if (!prev?.length) return list;
    const f = list.filter(x => !prev.includes(x.id));
    return f.length >= Math.max(need, 1) ? f : list;
  }
  candidatesRaw(p) {
    const s = this.spec(p); if (!s) return [];
    if (s.pool === 'burned') return this.players.filter(x => !x.alive && x.cause === 'burnout');   // Lantern Keeper: only night-Burnout victims (not vote-outs)
    return this.alive().filter(x => {
      if (s.pool === 'any') return true;
      if (x.id === p.id) return false;
      if (s.pool === 'nondark') return x.faction !== 'dark';
      return true;
    });
  }
  candidates(p) {
    const s = this.spec(p); if (!s) return [];
    return this.avoidRepeat(this.candidatesRaw(p), p.prevTargets, Math.max(s.t, 0));
  }
  // เป้าของแอ็กชันก่อกวนฝ่ายมืด (CURSE / TRAP ที่ต้องมีเป้า) หลังตัดเป้าคืนก่อน
  sideTargets(p, pool) { return this.avoidRepeat(pool, p.prevSide, 1); }
  canRest(p) {
    return !this.hasSkill(p) || !!useLimit(ROLES[p.role]) || this.skillsBanned() || this.evIs('snack');
  }
}

mixin(Game, chat, events, vote, nightInput, nightResolve, phases, win, views, modViewPart, fx);

module.exports = { Game, COMP, MIN_PLAYERS, MAX_PLAYERS, EMOJIS };
