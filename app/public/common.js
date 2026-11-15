// helper ใช้ร่วมกันของหน้าผู้เล่นและ Moderator
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emit = (socket, ev, data) => new Promise(res => socket.emit(ev, data, res));
const PHASES = { LOBBY: '🪑 ล็อบบี้', MORNING: '☀️ ห้องประชุมเช้า', VOTE: '🗳️ โหวตไล่ออก (PIP)', VOTE_INTERIM: '🗳️ พักรอบโหวต', VOTE_RESULT: '📋 ผลโหวต', NIGHT: '🌙 ทำงานลับกลางคืน', OVER: '🏁 จบเกม' };
const CAUSE = { burnout: '💀 Burnout', fired: '🔥 ถูกไล่ออก', seeker: '💰 ชิ่งออก' };

function topbar(s, extra = '') {
  const pct = Math.round(s.mana / s.manaMax * 100);
  return `<div class="top">
    <div class="brand">🧙 Deadline Necromancer</div>
    <div class="days">${DAYS.map((d, i) => `<span class="day ${i + 1 === s.day ? 'now' : i + 1 < s.day ? 'past' : ''}">${d.slice(0, 3)}</span>`).join('')}</div>
    <div class="mana"><small>Mana Task ${s.mana}/${s.manaMax}${s.skipStreak ? ` · Skip ติดกัน ${s.skipStreak}` : ''}</small><div class="bar"><div class="fill" style="width:${pct}%"></div></div></div>
    <div class="phase">${PHASES[s.phase] || ''} ${s.paused ? '⏸️' : ''}</div>
    <div class="timer" id="timer"></div>${typeof DNAudio !== 'undefined' ? DNAudio.controlHTML() : ''}${extra}
  </div>`;
}

// ตัวจับเวลา (แสดงอย่างเดียว — Moderator เป็นคนสั่งเปลี่ยนเฟส)
let timerState = null;
function setTimerFrom(state) { timerState = state?.timer && state.timer.phase === state.phase ? state.timer : null; tickTimer(); }
function tickTimer() {
  const el = $('#timer'); if (!el) return;
  if (!timerState) { el.textContent = ''; return; }
  const left = Math.max(0, Math.ceil((timerState.endsAt - Date.now()) / 1000));
  el.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  el.classList.toggle('low', left <= 10);
}
setInterval(tickTimer, 500);

function feedHTML(feed, scrollKeep) {
  return feed.map(m => m.kind === 'sys' ? `<div class="msg sys">${esc(m.text)}</div>`
    : `<div class="msg ${m.kind === 'anon' ? 'anon' : m.mine ? 'you' : ''}"><b>${esc(m.name)}:</b> ${esc(m.text)}</div>`).join('');
}
// คะแนนรวมรอบแรก (#19) — มีเฉพาะจำนวน ไม่มีชื่อผู้โหวต
function interimVotesHTML(s) {
  const it = s.interim || { tally: [], skip: 0 };
  const rows = (it.tally || []).filter(t => t.n > 0).map(t => `${esc(t.name)} — ${t.n} คะแนน`);
  if (!rows.length) rows.push('ยังไม่มีใครโหวต');
  rows.push(`⏭️ Skip — ${it.skip || 0}`);
  return `<div class="votes">${rows.join('<br>')}</div>`;
}
function keepScroll(sel, render) {
  const el = $(sel), atBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 40, old = el?.scrollTop;
  render();
  const n = $(sel); if (n) n.scrollTop = atBottom ? n.scrollHeight : old;
}
function playersListHTML(players, opts = {}) {
  return `<div class="plist">${players.map(p => {
    const tags = [];
    if (p.me) tags.push('<span class="tag">คุณ</span>');
    if (p.mate) tags.push('<span class="tag dark">😈 พวกเดียวกัน</span>');
    if (p.role) tags.push(`<span class="tag ${p.faction}">${esc(ROLES[p.role].n)}</span>`);
    if (!p.alive) tags.push(`<span class="tag">${CAUSE[p.cause] || 'ออกจากเกม'}</span>`);
    if (p.alive && p.silenced) tags.push('<span class="tag">🤐 ปิดปาก</span>');
    if (opts.extra) tags.push(...opts.extra(p));
    return `<div class="pl ${p.me ? 'me' : ''} ${p.alive ? '' : 'out'}"><div class="av">${esc(p.name[0] || '?')}</div><div><div class="nm">${esc(p.name)}</div><div class="sub">${tags.join('')}</div></div></div>`;
  }).join('')}</div>`;
}
function eventCardHTML(ev, extra = '') {
  if (!ev) return '';
  return `<div class="report" style="border-color:var(--light)"><img src="${EVTHUMB + ev.img}" onerror="this.onerror=null;this.src='${EVIMG + ev.img}'" onclick="window.open('${EVIMG + ev.img}')" alt="" style="float:right;width:110px;margin:0 0 8px 12px;border-radius:8px;cursor:zoom-in"><div><b>📞 Event Card #${ev.n}: ${esc(ev.t)}</b></div><div>${esc(ev.d)}</div>${extra}<div style="clear:both"></div></div>`;
}
function overHTML(s) {
  const o = s.over, w = o.winners;
  const roles = o.roles.map(r => `<div class="rc ${w.includes(r.id) ? 'win' : ''}"><img src="${ROLETHUMB + ROLES[r.role].img}" onerror="this.onerror=null;this.src='${IMG + ROLES[r.role].img}'" alt=""><b>${esc(r.name)}</b><br>${esc(ROLES[r.role].n)}${w.includes(r.id) ? ' 🏆' : ''}</div>`).join('');
  return `<div class="card stage over ${o.side}"><h2>${o.side === 'light' ? '🌟 Team Deliver ชนะ!' : '😈 Cult of Burnout ชนะ!'}</h2><p>${esc(o.why)}</p>
    <div class="report">${o.roles.filter(r => w.includes(r.id)).map(r => `<div>🏆 ${esc(r.name)} — ${esc(ROLES[r.role].n)}${ROLES[r.role].f === 'indie' ? ' (ชนะส่วนตัว)' : ''}</div>`).join('')}</div>
    <div class="grid">${roles}</div></div>`;
}
