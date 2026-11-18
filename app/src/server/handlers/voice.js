const { MAX_PLAYERS } = require('../../engine');

const SIG_MAX = 600, SIG_WINDOW_MS = 1000, ON_MAX = 20;
const SDP_MAX = 10000, CAND_MAX = 512, STR_MAX = 64, ICE_MAX = 8;

const ack = (cb, v) => { if (typeof cb === 'function') cb(v); };
const isObj = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const isInt = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;

// VOICE_ICE_SERVERS (JSON array of RTCIceServer) -> sanitised array. Pure; warns once on garbage.
function parseIceServers(str) {
  if (str === undefined || str === null || String(str).trim() === '') return [];
  let v;
  try { v = JSON.parse(String(str)); } catch (e) { console.warn('VOICE_ICE_SERVERS is not valid JSON; using none'); return []; }
  if (!Array.isArray(v)) { console.warn('VOICE_ICE_SERVERS must be a JSON array; using none'); return []; }
  const out = [];
  for (const e of v) {
    if (out.length >= ICE_MAX) break;
    if (!isObj(e)) continue;
    const u = e.urls;
    const okUrls = typeof u === 'string' || (Array.isArray(u) && u.length > 0 && u.every(x => typeof x === 'string'));
    if (!okUrls) continue;
    const o = { urls: u };
    if (typeof e.username === 'string') o.username = e.username;
    if (typeof e.credential === 'string') o.credential = e.credential;
    out.push(o);
  }
  return out;
}
const ICE_SERVERS = parseIceServers(process.env.VOICE_ICE_SERVERS);

const vroom = r => r.voice || (r.voice = { gen: 0, mod: null, links: new Set(), peersKey: '[]', game: r.game || null });

function dropLinks(vr, pred) { for (const k of [...vr.links]) if (pred(k)) vr.links.delete(k); }
const from = k => k.split('>')[0], to = k => k.split('>')[1];
const linksOfSpeaker = pid => k => from(k) === String(pid);
const linksTouching = pid => k => from(k) === String(pid) || to(k) === String(pid);

const regSock = m => (m.voice && m.sockets.has(m.voice.sock) ? m.voice.sock : null);
function peersList(r) {
  const out = [];
  for (const m of r.members) if (m.voice && m.pid != null && regSock(m)) out.push({ to: m.pid, gen: m.voice.gen });
  out.sort((a, b) => a.to - b.to);
  if (r.voice.mod && r.fullSockets && r.fullSockets.has(r.voice.mod.sock)) out.push({ to: 'mod', gen: r.voice.mod.gen });
  return out;
}
// Emit voice:peers (own pid omitted per recipient) when the list changed, or always when force.
function emitPeers(io, r, force) {
  const list = peersList(r), key = JSON.stringify(list);
  if (!force && key === r.voice.peersKey) return;
  r.voice.peersKey = key;
  for (const m of r.members) { const sid = regSock(m); if (sid && m.pid != null) io.to(sid).emit('voice:peers', { peers: list.filter(p => p.to !== m.pid) }); }
}
// voice:drop {pid} to every registered player socket except pid's own, and to the registered 3D socket.
function emitDrop(io, r, pid) {
  for (const m of r.members) { const sid = regSock(m); if (sid && m.pid !== pid) io.to(sid).emit('voice:drop', { pid }); }
  if (r.voice.mod && r.fullSockets && r.fullSockets.has(r.voice.mod.sock)) io.to(r.voice.mod.sock).emit('voice:drop', { pid });
}

// Re-evaluate every registration against the live game. Called as the last statement of pushState.
function syncVoice(io, r) {
  const vr = r && r.voice; if (!vr) return;
  const g = r.game || null;
  if (g !== vr.game) {
    vr.game = g; vr.links.clear();
    for (const m of r.members) if (m.voice) m.voice.gen = ++vr.gen;
    if (vr.mod) vr.mod.gen = ++vr.gen;
  }
  const drops = [];
  for (const m of r.members) {
    const v = m.voice; if (!v) continue;
    const pid = m.pid;
    const can = !!g && pid != null && g.canSpeak(pid);
    const pub = !!g && pid != null && g.canSpeak(pid, { publicOnly: true });
    if (can !== v.can) { for (const sid of m.sockets) io.to(sid).emit('voice:permit', { permit: can }); v.can = can; }
    if (v.pub && (!pub || pid !== v.pid)) { dropLinks(vr, linksOfSpeaker(v.pid)); drops.push(v.pid); }
    if (!can && pid != null) dropLinks(vr, linksOfSpeaker(pid));
    v.pid = pid; v.pub = pub;
  }
  for (const pid of drops.sort((a, b) => a - b)) emitDrop(io, r, pid);
  emitPeers(io, r, false);
}

function unregisterPlayer(io, r, m) {
  const vr = r.voice, pid = m.voice && m.voice.pid;
  m.voice = null;
  if (pid != null) { dropLinks(vr, linksTouching(pid)); emitDrop(io, r, pid); }
  emitPeers(io, r, false);
}
function unregisterMod(io, r) {
  r.voice.mod = null; dropLinks(r.voice, k => to(k) === 'mod');
  emitPeers(io, r, false);
}

module.exports = function registerVoice(socket, { io, ctx, member }) {
  const bucket = { sig: { start: 0, n: 0 }, on: { start: 0, n: 0 } };
  const allow = (b, max) => {
    const now = Date.now();
    if (now - b.start >= SIG_WINDOW_MS) { b.start = now; b.n = 0; }
    return ++b.n <= max;
  };

  socket.on('voice:on', (data, cb) => {
    try {
      if (!allow(bucket.on, ON_MAX)) return ack(cb, { ok: false, error: 'ช้าลงหน่อย' });
      const d = isObj(data) ? data : {};
      const on = d.on === true;
      const r = ctx(); if (!r) return ack(cb, { ok: false, error: 'ไม่ได้อยู่ในห้อง' });
      if (socket.data.mod) {
        if (!(r.fullSockets && r.fullSockets.has(socket.id))) return ack(cb, { ok: false, error: 'ไม่ใช่หน้าจอ 3D' });
        const vr = vroom(r);
        if (!on) {
          if (vr.mod && vr.mod.sock === socket.id) unregisterMod(io, r);
          return ack(cb, { ok: true });
        }
        if (vr.mod && vr.mod.sock === socket.id) return ack(cb, { ok: true, iceServers: ICE_SERVERS, gen: vr.mod.gen });
        vr.mod = { sock: socket.id, gen: ++vr.gen };
        dropLinks(vr, k => to(k) === 'mod');
        emitPeers(io, r, false);
        return ack(cb, { ok: true, iceServers: ICE_SERVERS, gen: vr.mod.gen });
      }
      const m = member();
      if (!m || !r.game || m.pid == null) return ack(cb, { ok: false, error: 'ยังไม่ได้เริ่มเกม' });
      const vr = vroom(r);
      if (!on) {
        if (m.voice && m.voice.sock === socket.id) unregisterPlayer(io, r, m);
        return ack(cb, { ok: true });
      }
      const g = r.game;
      const can = g.canSpeak(m.pid);
      if (m.voice && m.voice.sock === socket.id && m.voice.pid === m.pid) {
        return ack(cb, { ok: true, iceServers: ICE_SERVERS, permit: can, gen: m.voice.gen, peers: peersList(r).filter(p => p.to !== m.pid) });
      }
      const replaced = !!m.voice;
      dropLinks(vr, linksTouching(m.pid));
      m.voice = { sock: socket.id, gen: ++vr.gen, pid: m.pid, can, pub: g.canSpeak(m.pid, { publicOnly: true }) };
      if (replaced) emitDrop(io, r, m.pid);
      emitPeers(io, r, false);
      return ack(cb, { ok: true, iceServers: ICE_SERVERS, permit: can, gen: m.voice.gen, peers: peersList(r).filter(p => p.to !== m.pid) });
    } catch (e) { console.error('voice:on', e); ack(cb, { ok: false, error: 'ผิดพลาด' }); }
  });

  socket.on('v:sig', data => {
    try {
      if (!allow(bucket.sig, SIG_MAX)) return;
      if (!isObj(data)) return;
      const { kind } = data, tgt = data.to;
      if (!(tgt === 'mod' || isInt(tgt, 0, MAX_PLAYERS - 1))) return;
      if (kind !== 'offer' && kind !== 'answer' && kind !== 'ice') return;
      let payload;
      if (kind === 'ice') {
        const c = data.cand;
        if (c === null) payload = { kind, cand: null };
        else {
          if (!isObj(c) || typeof c.candidate !== 'string' || c.candidate.length > CAND_MAX) return;
          if (!(c.sdpMid === null || (typeof c.sdpMid === 'string' && c.sdpMid.length <= STR_MAX))) return;
          if (!(c.sdpMLineIndex === null || isInt(c.sdpMLineIndex, 0, 64))) return;
          if (!(c.usernameFragment === undefined || (typeof c.usernameFragment === 'string' && c.usernameFragment.length <= STR_MAX))) return;
          const cand = { candidate: c.candidate, sdpMid: c.sdpMid, sdpMLineIndex: c.sdpMLineIndex };
          if (c.usernameFragment !== undefined) cand.usernameFragment = c.usernameFragment;
          payload = { kind, cand };
        }
      } else {
        const s = data.sdp;
        if (typeof s !== 'string' || s.length < 1 || s.length > SDP_MAX) return;
        payload = { kind, sdp: s };
      }
      const r = ctx(); if (!r || !r.voice) return;
      const vr = r.voice, g = r.game;
      let me, m = null;
      if (socket.data.mod) {
        if (!(r.fullSockets && r.fullSockets.has(socket.id) && vr.mod && vr.mod.sock === socket.id)) return;
        me = 'mod';
      } else {
        m = member();
        if (!m || m.pid == null || !m.voice || m.voice.sock !== socket.id || !g) return;
        me = m.pid;
      }
      if (tgt === me) return;
      let tsock = null;
      if (tgt === 'mod') {
        if (me === 'mod') return;
        if (vr.mod && r.fullSockets && r.fullSockets.has(vr.mod.sock)) tsock = vr.mod.sock;
      } else {
        const tm = r.members.find(x => x.pid === tgt);
        if (tm) tsock = regSock(tm);
      }
      if (!tsock) return;
      const sp = me === 'mod' ? false : g && g.canSpeak(me);
      if (kind === 'offer') {
        if (me === 'mod' || !sp) return;
        vr.links.add(me + '>' + tgt);
      } else if (kind === 'answer') {
        if (!vr.links.has(tgt + '>' + me)) return;
      } else {
        const out = vr.links.has(me + '>' + tgt) && sp;
        const back = vr.links.has(tgt + '>' + me);
        if (!out && !back) return;
      }
      io.to(tsock).emit('v:sig', { from: me, ...payload });
    } catch (e) { console.error('v:sig', e); }
  });

  socket.on('disconnect', () => {
    try {
      const r = ctx(); if (!r || !r.voice) return;
      if (socket.data.mod) { if (r.voice.mod && r.voice.mod.sock === socket.id) unregisterMod(io, r); return; }
      const m = member();
      if (m && m.voice && m.voice.sock === socket.id) unregisterPlayer(io, r, m);
    } catch (e) { console.error('voice disconnect', e); }
  });
};
module.exports.syncVoice = syncVoice;
module.exports.parseIceServers = parseIceServers;
module.exports.SIG_MAX = SIG_MAX;
module.exports.SIG_WINDOW_MS = SIG_WINDOW_MS;
module.exports.ON_MAX = ON_MAX;
