// =====================================================================
//  Director — presentation-only library for the 3D Moderator scene.
//
//  It owns NO game rules: every function receives the already-decided outcome and just plays it
//  (cards, projectiles, props, stamps, badges).  The mock resolver in the POC page and — later — the real
//  engine (app/src/engine: night-resolve / events / vote / views) both drive it through the same API:
//
//    D.playSkill(roleKey,  { caster, targets:[desk…], result:{…} })                 // 17 roles
//    D.playEvent(eventKey, { accepted?, votes?:[{desk,yes}], targets?:[desk…], result?:{…}, mana? })   // 20 events
//    D.trapPlace(trapKey,  { owner, target? })      // secret: only visible in Moderator view     // 6 traps
//    D.trapTrigger(trapKey,{ owner, target?, inspector?, victim?, mana? })   // public: name only
//    D.playBooster(boosterKey, { votes?:[…], result?:{…} })                                    // 3 boosters
//    D.showVotes([{desk,yes}…])  D.clearNight()  D.update(dt,t)  D.postCamera()
//
//  desk = one entry of env.desks (…or just its index).  See the payload notes above each table below.
// =====================================================================
export function createDirector(env) {
  const { THREE, scene, camera, desks, N, NAMES, ROLE, ROLES, EVENTS, TRAPS, BOOSTERS, FCOL, ui, assets } = env;
  const state = { lightMul:1, shake:0 };
  const items = [];                                                  // per-frame updaters: fn(dt,t) → true when finished
  const update = (dt, t) => { for (let i = items.length - 1; i >= 0; i--) if (items[i](dt, t)) items.splice(i, 1); };

  // ---------- tiny utils ----------
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rand = a => a[Math.floor(Math.random()*a.length)];
  const D_ = x => (typeof x === 'number' ? desks[x] : x);
  const alive = () => desks.filter(d => d.state === 'alive');
  const fac = d => ROLE[d.role].f, isDark = d => fac(d) === 'dark';
  const nm = d => NAMES[d.i];
  const sec = () => ui.secrets();
  const wp = (d, y = .95) => { const p = new THREE.Vector3(); d.worker.getWorldPosition(p); p.y += y; return p; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const timed = (ms, fn) => new Promise(res => { let u = 0; items.push((dt, t) => { u += dt/(ms/1000); fn(Math.min(1, u), dt, t); if (u >= 1) { res(); return true; } return false; }); });
  const style = document.createElement('style');
  style.textContent = `.dstamp{position:fixed;left:50%;top:46%;transform:translate(-50%,-50%) rotate(-7deg) scale(2.4);font:900 54px "Segoe UI","Noto Sans Thai",system-ui;letter-spacing:2px;padding:6px 26px;border:7px solid;border-radius:14px;background:#0b0818cc;opacity:0;z-index:9;pointer-events:none;text-shadow:0 0 18px currentColor;animation:dstamp 2.1s ease-out forwards}
  @keyframes dstamp{0%{opacity:0;transform:translate(-50%,-50%) rotate(-7deg) scale(2.8)}14%{opacity:1;transform:translate(-50%,-50%) rotate(-7deg) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%) rotate(-7deg) scale(1)}}
  .dbub{position:fixed;left:0;top:0;pointer-events:none;z-index:4;font-weight:800;font-size:14px;padding:2px 9px;border-radius:99px;border:2px solid;background:#120f20e6;white-space:nowrap}
  .dbub.y{border-color:#5fe39a;color:#5fe39a}.dbub.n{border-color:#ff5c7a;color:#ff5c7a}
  .dtimer{position:fixed;left:50%;top:118px;transform:translateX(-50%);width:300px;height:14px;border:1px solid #33294f;border-radius:99px;background:#120f20e6;z-index:6;overflow:hidden}
  .dtimer i{display:block;height:100%;background:linear-gradient(90deg,#f5c451,#ff5c7a);transition:width 1.4s}`;
  document.head.appendChild(style);
  function stamp(text, color = '#f5c451') { const e = document.createElement('div'); e.className = 'dstamp'; e.textContent = text; e.style.color = color; e.style.borderColor = color; document.body.appendChild(e); setTimeout(() => e.remove(), 2200); }

  // ---------- emoji sprites + particle helpers ----------
  const emojiMaps = {};
  const emojiMap = e => emojiMaps[e] || (emojiMaps[e] = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '92px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })());
  const sprite = (e, s = .5) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map:emojiMap(e), transparent:true, depthWrite:false, toneMapped:false })); m.scale.set(s, s, 1); scene.add(m); return m; };
  const drop = list => list.forEach(s => scene.remove(s));
  async function rain(e, { n = 26, ms = 3200, size = .5, spread = 5.5, y0 = 8 } = {}) {
    const S = Array.from({ length:n }, () => { const s = sprite(e, size*(.7 + Math.random()*.6)); s.userData = { x:(Math.random() - .5)*spread*2, z:(Math.random() - .5)*spread*2, d:Math.random()*.45, w:Math.random()*6 }; return s; });
    await timed(ms, (u, dt, t) => S.forEach(s => { const k = Math.min(1, Math.max(0, (u - s.userData.d)/(1 - s.userData.d))); s.position.set(s.userData.x + Math.sin(t*2 + s.userData.w)*.3, y0 - k*(y0 - .4), s.userData.z); s.material.opacity = k > .85 ? (1 - k)/.15 : 1; s.visible = k > 0; }));
    drop(S);
  }
  async function burst(e, pos, { n = 12, ms = 1300, r = 2.2, size = .42, up = 1.6 } = {}) {
    const S = Array.from({ length:n }, (_, i) => { const s = sprite(e, size); const a = i/n*6.283 + Math.random()*.4; s.userData = { a, r:r*(.5 + Math.random()*.7), h:up*(.6 + Math.random()*.8) }; return s; });
    await timed(ms, u => S.forEach(s => { const k = 1 - Math.pow(1 - u, 2); s.position.set(pos.x + Math.cos(s.userData.a)*s.userData.r*k, pos.y + s.userData.h*Math.sin(u*Math.PI*.9), pos.z + Math.sin(s.userData.a)*s.userData.r*k); s.material.opacity = 1 - Math.pow(u, 3); }));
    drop(S);
  }
  async function orbit(e, { center = V(0, 2.6, 0), radius = 2.2, n = 8, ms = 5000, size = .5 } = {}) {
    const S = Array.from({ length:n }, () => sprite(e, size));
    await timed(ms, (u, dt, t) => S.forEach((s, i) => { const a = t*1.1 + i/n*6.283, f = Math.min(1, u*6, (1 - u)*6); s.position.set(center.x + Math.cos(a)*radius, center.y + Math.sin(t*2 + i)*.25, center.z + Math.sin(a)*radius); s.scale.setScalar(size*f); }));
    drop(S);
  }
  async function fly(e, a, b, ms = 900, size = .5, arc = 1.2) {
    const s = sprite(e, size);
    await timed(ms, u => { s.position.copy(a).lerp(b, u); s.position.y += Math.sin(Math.PI*u)*arc; s.material.opacity = u > .9 ? (1 - u)*10 : 1; });
    scene.remove(s);
  }
  const hover = (e, pos, ms = 1500, size = .6) => { const s = sprite(e, size); return timed(ms, (u, dt, t) => { s.position.set(pos.x, pos.y + Math.sin(t*3)*.06, pos.z); s.scale.setScalar(size*Math.min(1, u*8, (1 - u)*8)); }).then(() => scene.remove(s)); };
  function projectile(a, b, color, ms = 800) {
    return new Promise(res => {
      const mat = new THREE.MeshBasicMaterial({ color, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false });
      const head = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 10), mat), trail = [];
      for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(.11 - k*.012, 8, 6), mat.clone()); s.material.opacity = .5 - k*.07; scene.add(s); trail.push(s); }
      scene.add(head); let u = 0, done = false; const at = (e, out) => { out.copy(a).lerp(b, e); out.y += Math.sin(Math.PI*e)*1.2; };
      items.push(dt => { u += dt/(ms/1000); const e = Math.min(1, u); at(e, head.position); trail.forEach((s, k) => at(Math.max(0, e - (k + 1)*.035), s.position));
        if (u >= 1 && !done) { done = true; res(); } if (u >= 1.15) { scene.remove(head); drop(trail); return true; } return false; });
    });
  }
  const shoot = (c, t, color) => projectile(wp(c), wp(t), color);
  function ringUp(d, color, ms = 900, r = .6) { const p = wp(d, 0), m = new THREE.Mesh(new THREE.TorusGeometry(r, .03, 8, 40), new THREE.MeshBasicMaterial({ color, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false })); m.rotation.x = Math.PI/2; scene.add(m);
    timed(ms, u => { m.position.set(p.x, p.y + .1 + u*2, p.z); m.material.opacity = 1 - u; }).then(() => scene.remove(m)); }
  function pulse(x, z, color, scale = 6) { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.9, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, toneMapped:false })); m.rotation.x = -Math.PI/2; m.position.set(x, .12, z); scene.add(m);
    timed(1200, u => { m.scale.setScalar(.5 + u*scale*1.2); m.material.opacity = .9*(1 - u); }).then(() => scene.remove(m)); }
  const persist = [];                                                  // things that last until the next clearNight()
  function dome(d, color, r = .95) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color, transparent:true, opacity:.22, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, toneMapped:false })); m.position.copy(wp(d, .85)); scene.add(m); persist.push(m); return m; }
  function shake(amp = .04, ms = 900) { state.shake = amp; timed(ms, u => { state.shake = amp*(1 - u); }).then(() => (state.shake = 0)); }
  function postCamera() { if (state.shake > .0005) { camera.rotateZ((Math.random() - .5)*state.shake); camera.rotateX((Math.random() - .5)*state.shake*.6); } }
  const colorFlicker = (list, color, ms = 3000, every = .12) => { list.forEach(d => (d.fxColor = new THREE.Color(color))); return timed(ms, (u, dt, t) => list.forEach(d => { d.fxColor.set(Math.sin(t/every) > 0 ? color : 0x220000); })).then(() => list.forEach(d => (d.fxColor = null))); };
  const prop = (group, ms, fn) => { scene.add(group); return timed(ms, (u, dt, t) => fn(u, t, dt)).then(() => scene.remove(group)); };
  const gold = () => new THREE.MeshStandardMaterial({ color:0xd8b050, roughness:.3, metalness:.85 });
  const glowM = (c, o = 1.5) => new THREE.MeshStandardMaterial({ color:0x000000, emissive:c, emissiveIntensity:o, toneMapped:false });

  // ---------- DOM bubbles (✓/✗, results) ----------
  const bubs = [], bv = new THREE.Vector3();
  function bubble(d, text, cls = 'y', ms = 3600) { const el = document.createElement('div'); el.className = 'dbub ' + cls; el.textContent = text; document.body.appendChild(el); bubs.push({ el, d, until:performance.now() + ms }); }
  const priv = (d, text, cls = 'y') => { if (sec()) bubble(d, text, cls, 4800); };
  // bubbles sit on top of their owner's name tag (the page lays the tags out and publishes d.labelPos); several bubbles of one player stack upwards
  const BUB_H = 26, bubbleCount = d => bubs.reduce((n, b) => n + (b.d === d ? 1 : 0), 0);
  items.push(() => { const now = performance.now(), stack = new Map(); for (let i = bubs.length - 1; i >= 0; i--) { const b = bubs[i]; if (now > b.until) { b.el.remove(); bubs.splice(i, 1); } }
    for (const b of bubs) { const lp = b.d.labelPos; let x, y;
      if (lp) { const k = stack.get(b.d) || 0; stack.set(b.d, k + 1); x = lp.x; y = lp.top - 4 - k*BUB_H; b.el.style.display = ''; }
      else { b.d.anchor.getWorldPosition(bv); bv.project(camera); b.el.style.display = bv.z < 1 ? '' : 'none'; x = (bv.x*.5 + .5)*innerWidth; y = (-bv.y*.5 + .5)*innerHeight - 30; }
      b.el.style.zIndex = 60; b.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`; } return false; });
  async function showVotes(list) { let yes = 0, no = 0; for (const { desk, yes: y, label } of list) { y ? yes++ : no++; bubble(D_(desk), label || (y ? '✓' : '✗'), y ? 'y' : 'n'); await wait(170); } return { yes, no }; }   // list: [{desk, yes, label?}]
  async function simVotes(group, pYes) { return showVotes(group.map(d => ({ desk:d, yes:Math.random() < pYes }))); }

  // ---------- big announcement card ----------
  const loader = new THREE.TextureLoader(), texCache = {};
  const loadTex = url => texCache[url] || (texCache[url] = (() => { const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })());
  const BW = 1.5, BH = BW*407/300, big = new THREE.Group(), bigPivot = new THREE.Group(); big.visible = false; big.add(bigPivot); scene.add(big);
  { const slab = new THREE.Mesh(new THREE.BoxGeometry(BW + .07, BH + .07, .05), gold()); bigPivot.add(slab); }
  const bigFront = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ toneMapped:false, transparent:true })); bigFront.position.z = .03; bigPivot.add(bigFront);
  const bigBack = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map:assets.backTex, toneMapped:false })); bigBack.rotation.y = Math.PI; bigBack.position.z = -.03; bigPivot.add(bigBack);
  const bigHalo = new THREE.Mesh(new THREE.PlaneGeometry(BW*2.4, BH*1.8), new THREE.MeshBasicMaterial({ map:assets.dotTex, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false })); bigHalo.position.z = -.2; big.add(bigHalo);
  let bigS = null;
  function showBig(url, { face = true, color = 0xf5c451, hold = 6 } = {}) { bigFront.material.map = loadTex(url); bigFront.material.needsUpdate = true; bigHalo.material.color.set(color); bigS = { t:0, hold, face }; big.visible = true; }
  items.push((dt, t) => { if (!bigS) return false; bigS.t += dt; const dr = Math.min(1, bigS.t/.9), e = 1 - Math.pow(1 - dr, 3), lv = Math.max(0, (bigS.t - bigS.hold)/.5);
    big.position.set(0, 4.6 + (1 - e)*5 + Math.sin(t*1.6)*.07, 0); big.scale.setScalar(Math.max(.001, (.4 + .6*e)*(1 - lv))); big.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    bigPivot.rotation.y = (bigS.face ? 0 : Math.PI) + (1 - e)*Math.PI*2; bigHalo.material.opacity = .6*e*(1 - lv); if (lv >= 1) { big.visible = false; bigS = null; } return false; });

  // =====================================================================
  //  🎭 SKILLS — one function per role (keys = app/src/shared/data.js ROLES)
  //  payload: { caster, targets:[…], result:{…} }   (result fields are noted per role)
  // =====================================================================
  const prelude = (c, color, key) => { priv(c, '✨ ' + ROLES[key].skill, 'y'); ringUp(c, color, 700); };
  const skills = {
    // result:{ bug:boolean }
    async senior_dev({ caster:c, targets:[t], result:r = {} }) { await shoot(c, t, 0x4fd0ff); ringUp(t, 0x4fd0ff); ringUp(t, 0x4fd0ff, 1300); hover('🔍', wp(t, 2.1)); priv(c, `${r.bug ? '🐛' : '✅'} ${nm(t)}: ${r.bug ? 'แอบวางบั๊ก' : 'ส่งงานจริง'}`, r.bug ? 'n' : 'y'); },
    // result:{ barrierBroke:boolean }  (PM shielded a dark player → barrier shatters, PM locked next night)
    async oracle_pm({ caster:c, targets:[t], result:r = {} }) { await shoot(c, t, 0x4fd0ff); const m = dome(t, 0x4fd0ff); burst('🛡️', wp(t, 1), { n:6, r:1.1, size:.35 });
      if (r.barrierBroke) { await wait(500); m.material.color.set(0xff4d5e); burst('💥', wp(t, 1), { n:8, r:1.4 }); persist.splice(persist.indexOf(m), 1); scene.remove(m); priv(c, '💥 เป้าหมายมีออร่ามืด!', 'n'); } },
    // targets:[a,b]  result:{ hasDark:boolean }
    async qa_hunter({ caster:c, targets:T, result:r = {} }) { await Promise.all(T.map(t => shoot(c, t, 0xd8b050))); T.forEach(t => { ringUp(t, 0xd8b050); hover('🔎', wp(t, 2.1)); }); priv(c, r.hasDark ? '🔎 มีฝ่ายมืด ≥1' : '🔎 ไม่มีฝ่ายมืด', r.hasDark ? 'n' : 'y'); },
    // result:{ reveal:[desk…] }  (names of everyone who used a skill on the target — shown next morning; pass later via D.skillMorning)
    async rune_ux({ caster:c, targets:[t], result:r = {} }) { await shoot(c, t, 0x2ab5a8); const g = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map:assets.runes, color:0x2ab5a8, transparent:true, opacity:.9, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false }));
      g.rotation.x = -Math.PI/2; const w = wp(t, 0); g.position.set(w.x, .1, w.z); scene.add(g); persist.push(g); ui.badge(t, '🔮'); hover('🔮', wp(t, 2.1)); if (r.reveal) await skillMorning('rune_ux', { caster:c, targets:[t], result:r }); },
    // result:{ real:number, bugs:number }
    async data_oracle({ caster:c, result:r = {} }) { const base = wp(c, 1.7); const bars = [[0x4fd0ff, r.real ?? 0, -.3], [0xff4d5e, r.bugs ?? 0, .3]].map(([col, v, dx]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(.22, 1, .22), glowM(col, 1.4)); scene.add(m); return { m, v, dx }; });
      priv(c, `📊 จริง ${r.real ?? 0} · บั๊ก ${r.bugs ?? 0}`); await timed(3200, (u, dt, t) => bars.forEach(b => { const h = Math.max(.02, b.v*.35*Math.min(1, u*3)); b.m.scale.y = h; b.m.position.set(base.x + b.dx, base.y + h/2, base.z); b.m.visible = u < .94; })); bars.forEach(b => scene.remove(b.m)); },
    async chrono_tech_lead({ caster:c }) { pulse(0, 0, 0xf5c451, 9); pulse(0, 0, 0xffffff, 6); ui.flash(.3, '#fff4c0'); const clk = clockProp(); await prop(clk.g, 3200, (u, t) => { clk.hand.rotation.z = u*Math.PI*12; clk.g.scale.setScalar(Math.min(1, u*6, (1 - u)*6)); clk.g.position.set(0, 4.6, 0); clk.g.rotation.y = Math.atan2(camera.position.x, camera.position.z); }); },
    async coffee_admin({ caster:c, targets:[t] }) { await fly('☕', wp(c, 1.1), wp(t, 1.1), 900, .6); ringUp(t, 0x7dff9a); burst('💚', wp(t, 1), { n:8, r:1.2 }); ui.badge(t, '☕×2'); },
    // result:{ role:roleKey }  (HR sees the target's real role)
    async shadow_hr({ caster:c, targets:[t], result:r = {} }) { await shoot(c, t, 0xb05cff); ringUp(t, 0xb05cff); hover('👁', wp(t, 2.1), 1800); ui.badge(t, '0️⃣'); priv(c, `👁 ${nm(t)} = ${ROLE[r.role || t.role].n}`, 'n'); },
    // payload extra: result:{ copied:roleKey, source:desk, targets:[…], result:{…} }  (right-hand light neighbour's skill, run by the intern)
    async mystery_intern({ caster:c, result:r = {} }) { if (!r.copied) { priv(c, '… ไม่มีฝ่ายแสงให้ก๊อป', 'n'); return; } const src = D_(r.source); await fly('👻', wp(src, 1), wp(c, 1), 800, .7); ringUp(c, 0xc8ccd8);
      if (skills[r.copied]) await skills[r.copied]({ caster:c, targets:(r.targets || []).map(D_), result:r.result || {} }); },
    async illusionist_sales({ caster:c, targets:[t] }) { await shoot(c, t, 0xff4d5e); burst('🎭', wp(t, 1), { n:8, r:1.1 }); ui.badge(t, '🎭'); },
    // targets:[a,b]  — the two players' skill targets get swapped
    async chaos_scrum({ caster:c, targets:[a, b] }) { await Promise.all([a, b].map(t => shoot(c, t, 0xff4fa0))); if (a && b) await Promise.all([fly('🔀', wp(a, 1.2), wp(b, 1.2), 900, .65), fly('🔀', wp(b, 1.2), wp(a, 1.2), 900, .65)]); },
    async shadow_legal({ caster:c, targets:[t] }) { await shoot(c, t, 0x8a8a9c); for (let k = 0; k < 3; k++) ringUp(t, 0x8a8a9c, 900 + k*200, .45 + k*.1); hover('⛓️', wp(t, 1), 2000, .8); ui.badge(t, '🔇'); },
    async chaos_devops({ caster:c }) { pulse(0, 0, 0xff4d5e, 10); ui.flash(.35, '#3a0010'); shake(.05, 1000); stamp('DEPLOY ON FRIDAY', '#ff4d5e');
      const lights = alive().filter(d => fac(d) === 'light'); persist.splice(0).forEach(m => { burst('💥', m.position, { n:5, r:1 }); scene.remove(m); }); lights.forEach(d => burst('🔥', wp(d, 1), { n:4, r:.9, size:.35 })); await colorFlicker(lights, 0xff2040, 2400); },
    async severance_seeker({ caster:c }) { burst('🐛', wp(c, .6), { n:10, r:1.6 }); ringUp(c, 0x4ee07a); ui.badge(c, '🐛'); ui.badge(c, '+1'); },
    // result:{ mode:'peek'|'push', votedFor?:desk }
    async soul_recruiter({ caster:c, targets:[g], result:r = {} }) { await shoot(c, g, 0x4ee07a); if (r.mode === 'push') { ui.badge(g, '+1'); burst('🤝', wp(g, 1), { n:6, r:1 }); } else { hover('👁', wp(g, 2.1), 1600); const who = r.voters ? (r.voters.map(D_).map(nm).join(', ') || 'ไม่มีใคร') : nm(D_(r.votedFor || g)); priv(c, `👁 ${nm(g)} โดนโหวตโดย ${who}`); } },
    // result:{ stolen:boolean }
    async glory_thief({ caster:c, targets:[t], result:r = {} }) { await shoot(c, t, 0x4ee07a); if (r.stolen) { await fly('🏅', wp(t, 1.2), wp(c, 1.2), 900, .6); priv(c, '🏅 Credit +1', 'y'); } },
    // result:{ note:string }
    async chaos_intern({ caster:c, result:r = {} }) { ringUp(c, 0x4aa6b4); await fly('📧', wp(c, 1.4), V(0, 6, -9), 1200, .7, 2); if (r.note) ui.caption('📧 Reply All — ไม่ระบุชื่อ', `“${r.note}”`, 7000, 'trap'); if (ui.getDay() >= 4) ui.badge(c, '×2'); },
  };
  async function skillMorning(key, p) {                                      // delayed reveals (Rune UX names)
    if (key === 'rune_ux') { const names = (p.result.reveal || []).map(D_).map(nm); await wait(300); burst('🔮', wp(D_(p.caster), 1.2), { n:6, r:1 }); priv(D_(p.caster), '🔮 ' + (names.length ? names.join(', ') : 'ไม่มีใคร'), names.length ? 'n' : 'y'); }
  }
  async function playSkill(key, p) {
    const c = D_(p.caster), S = ROLES[key]; if (!skills[key]) return; const targets = (p.targets || []).map(D_);
    prelude(c, FCOL[ROLE[key].f], key);
    if (p.via && p.via.source != null && p.via.source >= 0 && D_(p.via.source)) await fly('👻', wp(D_(p.via.source), 1), wp(c, 1), 800, .7);          // Mystery Intern copying the skill of its right-hand neighbour
    if (p.result?.disabled) { targets.forEach(t => burst('💥', wp(t, 1), { n:6, r:1 })); priv(c, '⚙️ ถูกปิดระบบคืนนี้', 'n'); return; }                      // barrier / heal shut down (Server Down, Deploy on Friday…)
    await skills[key]({ caster:c, targets, result:p.result || {} });
  }

  // ---------- 3D props used by events / skills ----------
  function clockProp() { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .09, 10, 40), gold()); g.add(ring);
    const face = new THREE.Mesh(new THREE.CircleGeometry(.96, 40), new THREE.MeshBasicMaterial({ color:0x1b1530, toneMapped:false })); g.add(face);
    for (let i = 0; i < 12; i++) { const a = i/12*6.283, tk = new THREE.Mesh(new THREE.BoxGeometry(.05, i % 3 ? .12 : .22, .02), glowM(0xf5c451, 1.5)); tk.position.set(Math.sin(a)*.82, Math.cos(a)*.82, .02); tk.rotation.z = -a; g.add(tk); }
    const hand = new THREE.Group(), hb = new THREE.Mesh(new THREE.BoxGeometry(.06, .75, .03), glowM(0xffffff, 2)); hb.position.y = .35; hand.add(hb); hand.position.z = .04; g.add(hand);
    const hh = new THREE.Mesh(new THREE.BoxGeometry(.09, .5, .03), glowM(0xf5c451, 2)); hh.position.set(0, .2, .03); const h2 = new THREE.Group(); h2.add(hh); h2.rotation.z = -1.1; h2.position.z = .03; g.add(h2); g.scale.setScalar(1.2); return { g, hand }; }

  // =====================================================================
  //  🎴 EVENTS — one function per Client Event (keys = data.js EVENTS)
  //  p: { accepted?:boolean, votes?:[{desk,yes}], targets?:[desk…], result?:{…}, mana?:number, chip?:string }
  // =====================================================================
  const all = () => alive();
  const altar = () => V(0, 2.6, 0);
  async function choice(e, p) { if (!p.votes) return; ui.say(`ทีมโหวต: ${e.yes} / ${e.no}`); const { yes, no } = await showVotes(p.votes); await wait(700);
    ui.caption(`🗳 ผลโหวต: ${p.accepted ? e.yes : e.no}`, `${e.yes} ${yes} เสียง · ${e.no} ${no} เสียง\n${e.d}`, 8000, 'evt'); stamp(p.accepted ? e.yes : e.no, p.accepted ? '#5fe39a' : '#ff5c7a'); await wait(900); }
  const setMana = p => { if (p.mana != null) ui.setMana(p.mana); };
  const events = {
    async approve(p, e) { rain('✨', { n:40, size:.4 }); rain('👍', { n:10, size:.5 }); pulse(0, 0, 0xf5c451, 8); ui.flash(.2, '#fff4c0'); stamp('APPROVED!', '#f5c451'); setMana(p); },
    async angry(p, e) { shake(.05, 1000); ui.flash(.3, '#3a0010'); pulse(0, 0, 0xff5c7a, 8); burst('💢', altar(), { n:14, r:2.6 }); stamp('ไม่พอใจ!', '#ff5c7a'); setMana(p); },
    async down(p, e) { stamp('SERVER DOWN', '#ff5c7a'); shake(.03, 700); all().forEach(d => burst('🔥', wp(d, 1.8), { n:3, r:.7, size:.3 })); await colorFlicker(all(), 0xff2040, 3600); },
    async restart(p, e) { stamp('REQUIREMENT CHANGED ↻', '#4fd0ff'); rain('📝', { n:22, size:.45 }); pulse(0, 0, 0x4fd0ff, 8); await colorFlicker(all(), 0xffffff, 1800, .25); },
    async watch(p, e) { stamp('CLIENT IS WATCHING', '#f5c451'); const g = new THREE.Group(), ball = new THREE.Mesh(new THREE.SphereGeometry(.9, 28, 20), new THREE.MeshStandardMaterial({ color:0xf3f0ff, emissive:0x403060, roughness:.4 })); g.add(ball);
      const iris = new THREE.Mesh(new THREE.CircleGeometry(.42, 28), glowM(0x4fd0ff, 1.2)), pupil = new THREE.Mesh(new THREE.CircleGeometry(.2, 20), new THREE.MeshBasicMaterial({ color:0x05030a })); iris.position.z = .9; pupil.position.z = .91; g.add(iris, pupil);
      const look = all().map(d => wp(d, 0)); await prop(g, 6200, (u, t) => { const f = Math.min(1, u*8, (1 - u)*8); g.position.set(0, 6.2, 0); g.scale.setScalar(f); g.rotation.y = Math.atan2(camera.position.x, camera.position.z);
        const k = look[Math.floor(t*.9) % look.length]; const dx = Math.max(-.4, Math.min(.4, k.x*.08)), dy = Math.max(-.3, Math.min(.3, -.2)); iris.position.set(dx, dy*.2, .9); pupil.position.set(dx*1.1, dy*.2, .91); }); },
    async blackout(p, e) { stamp('BLACKOUT', '#9a92b8'); const A = [...alive()]; await timed(3600, (u, dt, t) => { state.lightMul = (Math.sin(t*9) > .6 && u < .85) ? .5 : .06 + u*.94*(u > .85 ? 1 : 0); }); state.lightMul = 1;
      A.filter(d => ['senior_dev', 'qa_hunter', 'rune_ux', 'data_oracle'].includes(d.role)).forEach(d => priv(d, '🔌 ไม่ได้ข้อมูล', 'n')); },
    async audit(p, e) { stamp('LOG AUDIT', '#4fd0ff'); const T = p.targets?.length ? p.targets.map(D_) : [rand(alive())]; for (const d of alive()) { await fly('🔍', wp(d, 2.4), wp(rand(alive()), 2.4), 300, .5, .2); } for (const t of T) { hover('🔍', wp(t, 2.3), 2000, .8); burst('📜', wp(t, 1), { n:6, r:1 }); } },
    async scope(p, e) { stamp(p.accepted === false ? 'ปฏิเสธ Scope' : 'SCOPE +', p.accepted === false ? '#ff5c7a' : '#f5c451'); await choice(e, p); if (p.accepted !== false) { rain('📝', { n:30, size:.45 }); const st = []; for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.8, .06, .6), new THREE.MeshStandardMaterial({ color:0xf0e8d8 })); b.position.set((k % 2)*.06, 1.05 + k*.07, 0); b.rotation.y = k*.3; scene.add(b); st.push(b); } await wait(3000); drop(st); } },
    async ot(p, e) { stamp('OVERTIME ⏰', '#ff9a4d'); await choice(e, p); if (p.accepted) { const clk = clockProp(); setMana(p); await prop(clk.g, 3800, (u, t) => { clk.hand.rotation.z = -u*Math.PI*16; clk.g.scale.setScalar(Math.min(1, u*6, (1 - u)*6)); clk.g.position.set(0, 4.8, 0); clk.g.rotation.y = Math.atan2(camera.position.x, camera.position.z); }); } },
    async marathon(p, e) { stamp('MARATHON MEETING', '#b05cff'); const g = new THREE.Group(); const gm = new THREE.MeshPhysicalMaterial({ color:0xbfe8ff, transparent:true, opacity:.28, roughness:.05 });
      const top = new THREE.Mesh(new THREE.ConeGeometry(.55, .9, 18), gm), bot = new THREE.Mesh(new THREE.ConeGeometry(.55, .9, 18), gm); top.rotation.x = Math.PI; top.position.y = .5; bot.position.y = -.5; g.add(top, bot);
      for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .08, 18), gold()); r.position.y = s*.98; g.add(r); } const sand = new THREE.Mesh(new THREE.ConeGeometry(.42, .7, 14), glowM(0xf5c451, 1.2)); sand.position.y = .45; g.add(sand);
      await prop(g, 6000, (u, t) => { const f = Math.min(1, u*8, (1 - u)*8); g.position.set(0, 4.8, 0); g.scale.setScalar(f*1.5); g.rotation.z = u > .5 ? Math.PI : 0; sand.scale.y = u > .5 ? u*2 - 1 + .05 : 1 - u*2 + .05; sand.position.y = u > .5 ? -.55 + sand.scale.y*.45 : .1 + sand.scale.y*.35; }); },
    async snack(p, e) { stamp('FREE SNACKS 🍩', '#ff9fb1'); await Promise.all([orbit('🍩', { n:7, ms:5500 }), orbit('🍪', { n:6, radius:1.5, ms:5500 })]); },
    // targets:[a,b], result:{ same:boolean }
    async leak(p, e) { stamp('REPLY ALL 📧', '#ff9a4d'); const T = (p.targets || []).map(D_); for (let k = 0; k < 10; k++) fly('📧', V(-12 + Math.random()*24, 5.5, -11), wp(rand(alive()), 1.6), 1300, .6, 2); await wait(1500); T.forEach(d => bubble(d, '📧', 'y', 6000)); ui.say(`ทั้งคู่ทำแอ็กชัน "${p.result?.same ? 'เหมือนกัน' : 'ต่างกัน'}"`); },
    async prod(p, e) { stamp('PROD CRISIS 🚨', '#ff4d5e'); const g = new THREE.Group(), base = new THREE.Mesh(new THREE.CylinderGeometry(.4, .5, .3, 16), gold()), dm = new THREE.Mesh(new THREE.SphereGeometry(.38, 16, 12, 0, 6.283, 0, 1.6), glowM(0xff2040, 2.4)); dm.position.y = .15; g.add(base, dm);
      const bm = new THREE.MeshBasicMaterial({ color:0xff2040, transparent:true, opacity:.35, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, toneMapped:false }); const beam = new THREE.Mesh(new THREE.ConeGeometry(.9, 5, 16, 1, true), bm); beam.rotation.z = Math.PI/2; beam.position.set(2.5, .15, 0); const rot = new THREE.Group(); rot.add(beam); g.add(rot);
      g.position.set(0, 3.8, 0); const run = prop(g, 4200, (u, t) => { rot.rotation.y = t*5; g.scale.setScalar(Math.min(1, u*8, (1 - u)*8)); state.lightMul = .55 + Math.sin(t*10)*.2; }); ui.flash(.3, '#3a0010'); shake(.02, 600); await choice(e, p); await run; state.lightMul = 1;
      if (p.accepted && p.targets?.[0]) { const t = D_(p.targets[0]); dome(t, 0x4fd0ff); priv(t, '🛡️ ได้รับคุ้มกันคืนนี้', 'y'); } else if (p.accepted === false) { setMana(p); ui.flash(.35, '#3a0010'); } },
    // targets:[a,b] — their desks hop and swap places, then return
    async hotdesk(p, e) { stamp('HOT DESKING 🪑', '#4ee07a'); const [a, b] = (p.targets || []).map(D_); if (!a || !b) return; const pa = a.g.position.clone(), pb = b.g.position.clone(), ra = a.g.rotation.y, rb = b.g.rotation.y;
      const mv = (from, to) => timed(1500, u => { const k = u < .5 ? u*2 : (1 - u)*2; [[a, pa, pb, ra, rb], [b, pb, pa, rb, ra]].forEach(([d, p0, p1, r0, r1]) => { const f = from ? u : 1 - u; d.g.position.lerpVectors(p0, p1, f); d.g.position.y = Math.sin(Math.PI*u)*1.0; d.g.rotation.y = r0 + (r1 - r0)*f; }); });
      await Promise.all([fly('🔀', wp(a, 1.5), wp(b, 1.5), 900, .6), fly('🔀', wp(b, 1.5), wp(a, 1.5), 900, .6)]); await mv(true); await wait(900); await mv(false); a.g.position.copy(pa); b.g.position.copy(pb); a.g.rotation.y = ra; b.g.rotation.y = rb; a.g.position.y = b.g.position.y = 0; },
    async bonus(p, e) { stamp('MID-YEAR BONUS 💰', '#f5c451'); await choice(e, p); rain('💰', { n:22, size:.5 }); rain('🪙', { n:26, size:.35 }); if (p.accepted) pulse(0, 0, 0xf5c451, 8); },
    async purge(p, e) { stamp('3 ข้อความ/คน ✂️', '#ff5c7a'); for (let k = 0; k < 3; k++) fly('✂️', V(-9, 6.2 - k*.4, -8), V(9, 6.2 - k*.4, -8), 1400, .7, .4); await wait(1800); },
    // targets:[desk…]  (helpers: their vote counts as 0 today)
    async hands(p, e) { stamp('MORE HANDS ON DECK', '#4fd0ff'); const T = (p.targets || []).map(D_); T.forEach(d => { hover('👥', wp(d, 2.2), 6500, .8); bubble(d, 'ทีมเสริม · โหวต 0', 'n', 6500); ringUp(d, 0x4fd0ff); }); await wait(2200); },
    // targets:[3 desks]  result:{ hasDark:boolean }
    async uat(p, e) { stamp('UAT TOO LATE 🔎', '#b05cff'); const T = (p.targets || []).map(D_); for (const d of T) { ringUp(d, 0xb05cff, 1200); hover('🔎', wp(d, 2.3), 1800, .7); await wait(500); } ui.say(p.result?.hasDark ? 'ตรวจ 3 คน: มีฝ่ายมืดอย่างน้อย 1 คน' : 'ตรวจ 3 คน: ไม่มีฝ่ายมืด'); await wait(1200); },
    async redesign(p, e) { stamp('REDESIGN: 2 ROUNDS', '#2ab5a8'); rain('📐', { n:20, size:.45 }); await colorFlicker(all(), 0x2ab5a8, 2600, .2); },
    async status(p, e) { stamp('STATUS PAGE 404', '#ff5c7a'); shake(.025, 800); const b = env.board; if (b) { const m0 = b.material.color.clone(); await timed(3000, (u, dt, t) => { b.material.color.set(Math.sin(t*14) > 0 ? 0xff2040 : 0x331018); b.position.x = (Math.random() - .5)*.06; }); b.material.color.copy(m0); b.position.x = 0; }
      const w = rand(alive()); if (w) { burst('✉️', wp(w, 1.6), { n:5, r:1 }); priv(w, '✉️ ได้สรุปเมื่อคืนแบบลับ', 'y'); } },
  };
  async function playEvent(key, p = {}) {
    const e = EVENTS[key]; if (!e || !events[key]) return; if (p.forcePhase && ui.getPhase() !== 'MORNING') ui.setPhase('MORNING');   // forcePhase: demo/mock only — live, the scene phase follows the engine's state
    showBig(env.THUMB + 'events/' + e.img, { color:0x4fd0ff, hold:7 });
    ui.caption(`🎴 Event Card #${e.n} · ${e.t}`, e.d + (p.note ? '\n' + p.note : ''), 11000, 'evt'); await wait(2300);
    await events[key](p, e); ui.chip(p.chip || (p.accepted === undefined ? e.t : `${e.t} · ${p.accepted ? e.yes : e.no}`), 'evt', e.d);
  }

  // =====================================================================
  //  🪤 TRAPS — placement is secret (Moderator view only); the trigger announces the NAME only
  //  trapPlace:   { owner, target? }          trapTrigger: { owner, target?, inspector?, victim?, mana? }
  // =====================================================================
  const TRAP_ICON = { blame:'👉', honeypot:'🍯', alibi:'🪞', hijack:'📢', insurance:'☂️', exit:'🚪' };
  const TRAP_COLOR = { blame:0xff4d5e, honeypot:0xffb050, alibi:0x7fe3ff, hijack:0xff9a4d, insurance:0xf5c451, exit:0xb05cff };
  const placedTraps = [];
  function trapPlace(key, { owner, target } = {}) {
    const T = TRAPS[key], t = target != null ? D_(target) : null, col = TRAP_COLOR[key];
    const g = new THREE.Group(), glyph = new THREE.Mesh(new THREE.PlaneGeometry(t ? 1.5 : 5.6, t ? 1.5 : 5.6), new THREE.MeshBasicMaterial({ map:assets.runes, color:col, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false })); glyph.rotation.x = -Math.PI/2; glyph.position.y = .08; g.add(glyph);
    const icon = sprite(TRAP_ICON[key], .7); icon.visible = false; g.add(icon); scene.remove(icon); g.add(icon);
    const mini = new THREE.Mesh(new THREE.PlaneGeometry(.55, .75), new THREE.MeshBasicMaterial({ map:loadTex(env.THUMB + 'traps/' + T.img), transparent:true, side:THREE.DoubleSide, toneMapped:false })); mini.visible = false; g.add(mini);
    if (t) { t.g.add(g); g.position.set(0, 0, .5); icon.position.set(0, 2.9, 0); mini.position.set(0, 2.2, 0); } else { scene.add(g); icon.position.set(0, 3.2, 3.4); mini.position.set(0, 2.4, 3.4); }
    const h = { key, owner:D_(owner), target:t, g, glyph, icon, mini, col }; placedTraps.push(h);
    items.push((dt, tm) => { if (!placedTraps.includes(h)) return true; h.glyph.material.opacity += ((sec() ? .75 + Math.sin(tm*4)*.15 : 0) - h.glyph.material.opacity)*.15; h.glyph.rotation.z += dt*.8; h.icon.visible = h.mini.visible = sec(); h.icon.position.y += Math.sin(tm*3)*.002;
      h.mini.rotation.y = Math.atan2(camera.position.x, camera.position.z) - (h.target ? h.target.g.rotation.y : 0); return false; });
    if (sec()) ui.caption(`🪤 [Moderator] ฝ่ายมืดหมอบ Trap: ${T.n}`, `${T.d}\nเป้าหมาย: ${t ? nm(t) + ' · ' + ROLE[t.role].n : 'ไม่ต้องเลือกเป้า (ทำงานส่วนกลาง)'}`, 8000, 'trap'); else ui.say('ฝ่ายมืดเลือกแอ็กชันแล้ว…');
    return h;
  }
  const trapFx = {
    async blame(p) { stamp('SKIP', '#ff4d5e'); const s = sprite('🚫', 1.6); s.position.set(0, 4.2, 0); await timed(1800, u => { s.scale.setScalar(1.6*(1.4 - u*.4)); s.material.opacity = 1 - u*u; }); scene.remove(s); },
    async honeypot(p) { const i = D_(p.inspector); if (i) { await burst('🐝', wp(i, 1.2), { n:10, r:1.4 }); priv(i, '🍯 ข้อมูลปลอม', 'n'); } else await burst('🐝', altar(), { n:10 }); },
    async alibi(p) { const t = D_(p.target); if (t) { burst('🪞', wp(t, 1.4), { n:8, r:1.3 }); ringUp(t, 0x7fe3ff); if (t.ring) { const c0 = t.ring.material.color.clone(); t.ring.material.color.set(FCOL.light); await wait(2500); t.ring.material.color.copy(c0); } } },
    async hijack(p) { const bar = document.createElement('div'); bar.className = 'dtimer'; bar.innerHTML = '<i style="width:100%"></i>'; document.body.appendChild(bar); await wait(120); bar.firstChild.style.width = '70%'; stamp('เวลาคุยลด 30%', '#ff9a4d'); const v = D_(p.victim) || rand(alive()); bubble(v, 'SKIP อัตโนมัติ', 'n', 5000); await wait(2600); bar.remove(); },
    async insurance(p) { const m = new THREE.Mesh(new THREE.SphereGeometry(2.4, 28, 16, 0, 6.283, 0, 1.45), new THREE.MeshBasicMaterial({ color:0xf5c451, transparent:true, opacity:.2, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, toneMapped:false })); m.position.y = .15; scene.add(m); rain('☂️', { n:12, size:.5, spread:3 }); await timed(2800, u => { m.material.opacity = .25*Math.min(1, u*6, (1 - u)*3); }); scene.remove(m); },
    async exit(p) { const t = D_(p.target || p.victim); if (t) { const w = wp(t, 0), h = new THREE.Mesh(new THREE.CircleGeometry(.9, 28), new THREE.MeshBasicMaterial({ color:0x05030a })); h.rotation.x = -Math.PI/2; h.position.set(w.x, .11, w.z); scene.add(h); burst('💸', wp(t, .6), { n:10, r:1.6 }); await timed(2200, u => h.scale.setScalar(Math.min(1, u*5, (1 - u)*5))); scene.remove(h); } if (p.mana != null) ui.setMana(p.mana); },
  };
  async function trapTrigger(key, p = {}) {
    const T = TRAPS[key], h = placedTraps.find(x => x.key === key) || null; if (h) { placedTraps.splice(placedTraps.indexOf(h), 1); }
    showBig(env.THUMB + 'traps/' + T.img, { face:sec(), color:0xb05cff, hold:5 }); ui.flash(.35, '#2a0b3d');
    ui.caption(`🪤 Trap ทำงาน: ${T.n}`, sec() ? `${T.d}${h?.target ? '\n[Moderator] เป้าหมาย: ' + nm(h.target) : ''}` : 'ระบบประกาศเฉพาะชื่อ Trap — รายละเอียดแจ้งเจ้าของแบบลับ', 8000, 'trap');
    const tgt = p.target ?? h?.target; if (tgt != null) { const w = wp(D_(tgt), 0); pulse(w.x, w.z, TRAP_COLOR[key]); if (sec()) bubble(D_(tgt), TRAP_ICON[key], 'n', 5000); } else pulse(0, 0, TRAP_COLOR[key]);
    ui.chip('Trap: ' + T.n, 'trap', 'ประกาศเฉพาะชื่อ'); await trapFx[key]({ ...p, target:tgt }); if (h) { h.g.parent.remove(h.g); }
  }

  // =====================================================================
  //  🚀 BOOSTERS — public vote (once per game); then the chosen booster plays
  //  playBooster: { votes?:[{desk,yes}], result?:{…} }   result: scanner → { trapFound:boolean }
  // =====================================================================
  const boosters = {
    async scanner(p) { stamp('DEBUG SCANNER', '#4fd0ff'); const sweep = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), new THREE.MeshBasicMaterial({ map:assets.dotTex, color:0x4fd0ff, transparent:true, opacity:.55, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false })); sweep.rotation.x = -Math.PI/2; sweep.position.y = .15;
      const arm = new THREE.Mesh(new THREE.PlaneGeometry(6.2, .35), new THREE.MeshBasicMaterial({ color:0x4fd0ff, transparent:true, opacity:.6, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false })); arm.rotation.x = -Math.PI/2; arm.position.set(3.1, .2, 0); const g = new THREE.Group(); g.add(sweep, arm); scene.add(g);
      pulse(0, 0, 0x4fd0ff, 9); await timed(3200, u => { g.rotation.y = -u*Math.PI*6; g.scale.setScalar(Math.min(1, u*6)); }); scene.remove(g);
      const found = p.result?.trapFound; ui.say(found ? 'พบ Trap ที่ถูกหมอบไว้เมื่อคืน' : 'ไม่พบ Trap เมื่อคืน'); placedTraps.filter(h => ['honeypot', 'alibi'].includes(h.key)).forEach(h => burst('🔄', h.target ? wp(h.target, 1.2) : altar(), { n:6, r:1 })); await wait(800); },
    async retro(p) { stamp('RETROSPECTIVE ⏪', '#f5c451'); const clk = clockProp(); rain('✨', { n:24, size:.35 }); await prop(clk.g, 3600, (u, t) => { clk.hand.rotation.z = u*Math.PI*14; clk.g.scale.setScalar(Math.min(1, u*6, (1 - u)*6)); clk.g.position.set(0, 4.8, 0); clk.g.rotation.y = Math.atan2(camera.position.x, camera.position.z); }); },
    async freeze(p) { stamp('EMERGENCY FREEZE ❄️', '#7fe3ff'); rain('❄️', { n:34, size:.4 }); const ice = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5, 1), new THREE.MeshStandardMaterial({ color:0x9fe8ff, emissive:0x2a8ab8, emissiveIntensity:.5, transparent:true, opacity:.28, flatShading:true, roughness:.1 })); ice.position.y = 1.4; scene.add(ice);
      const lights = alive().filter(d => fac(d) === 'light'); lights.forEach(d => dome(d, 0x7fe3ff, 1.1)); pulse(0, 0, 0x7fe3ff, 9); await timed(4200, u => { ice.rotation.y = u*2; ice.scale.setScalar(Math.min(1, u*5)*(u > .85 ? 1 - (u - .85)*6 : 1)); }); scene.remove(ice); },
  };
  async function playBooster(key, p = {}) {
    const b = BOOSTERS[key]; if (!b || !boosters[key]) return;
    if (p.forcePhase && ui.getPhase() !== 'MORNING') ui.setPhase('MORNING');
    showBig(env.THUMB + 'boosters/' + b.img, { color:0xf5c451, hold:7 }); ui.flash(.25, '#fff4c0'); pulse(0, 0, 0xf5c451);
    ui.caption(`🚀 Sprint Booster: ${b.n}`, `${p.note ? p.note + '\n' : ''}${b.d}`, 9000, 'boost'); await wait(1800); await boosters[key](p); ui.chip('Booster: ' + b.n, 'boost', b.d);
  }

  // curse (dark side action): projectile, then blocked (shield/heal/dodge → white ring) or lands (burnout follows as its own fx)
  async function playCurse({ caster, target, blocked }) { const c = D_(caster), t = D_(target); await projectile(wp(c), wp(t), 0xff2040, 900); if (blocked) { ringUp(t, 0xffffff); burst('🛡️', wp(t, 1), { n:5, r:1 }); } else burst('💀', wp(t, 1.2), { n:6, r:1.1 }); }
  // choice events: only show the card now; the vote result plays later through playEvent(key,{ accepted, votes })
  async function showEventCard(key, p = {}) { const e = EVENTS[key]; if (!e) return; if (p.forcePhase && ui.getPhase() !== 'MORNING') ui.setPhase('MORNING'); showBig(env.THUMB + 'events/' + e.img, { color:0x4fd0ff, hold:7 });
    ui.caption(`🎴 Event Card #${e.n} · ${e.t}`, e.d + '\nทุกคนโหวต: ' + e.yes + ' / ' + e.no, 11000, 'evt'); await wait(2300); }

  // ---------- housekeeping ----------
  function clearNight() { persist.splice(0).forEach(m => m.parent && m.parent.remove(m)); }
  return { skills:Object.keys(skills), events:Object.keys(events), traps:Object.keys(trapFx), boosters:Object.keys(boosters), state, update, postCamera,
    bubbleCount, playSkill, playCurse, showEventCard, skillMorning, playEvent, trapPlace, trapTrigger, playBooster, showVotes, simVotes, bubble, priv, clearNight, projectile, pulse, ringUp, dome, showBig, stamp, wp };
}
