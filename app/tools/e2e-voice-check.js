// QA check (voice-over): spawn the real server, verify static serving of voice clients, gen-cert + HTTPS startup.
// Run: node tools/e2e-voice-check.js   (needs openssl on PATH; HTTPS part skipped otherwise)
const assert = require('assert'), http = require('http'), https = require('https'), fs = require('fs'), os = require('os'), path = require('path');
const { spawn, spawnSync } = require('child_process');
const root = path.join(__dirname, '..');
const get = (mod, url) => new Promise((res, rej) => mod.get(url, { rejectUnauthorized: false }, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, type: r.headers['content-type'], body: b })); }).on('error', rej));
function start(env) { const c = spawn(process.execPath, ['src/server/index.js'], { cwd: root, env: { ...process.env, ...env } }); let out = ''; c.stdout.on('data', d => out += d); c.stderr.on('data', d => out += d);
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('no start: ' + out)), 8000); const i = setInterval(() => { if (/https?:\/\//.test(out)) { clearTimeout(t); clearInterval(i); res({ c, out: () => out }); } }, 50); }); }
(async () => {
  let s = await start({ PORT: '3171', HTTPS_KEY: '', HTTPS_CERT: '' });
  try {
    for (const [p, re] of [['/voice.js', /Voice/], ['/mod3d/voice.js', /createModVoice/]]) { const r = await get(http, 'http://localhost:3171' + p); assert.strictEqual(r.status, 200, p); assert(/javascript/.test(r.type), p + ' type ' + r.type); assert(re.test(r.body), p); }
    assert(/src="\/voice\.js"/.test((await get(http, 'http://localhost:3171/')).body), 'index references voice.js');
    assert(/mod3d\/voice\.js/.test((await get(http, 'http://localhost:3171/mod3d.html')).body), 'mod3d.html references voice.js');
    assert(/http:\/\//.test(s.out()) && !/https:\/\//.test(s.out()), 'plain http log');
  } finally { s.c.kill(); }
  const ossl = spawnSync('openssl', ['version']);
  if (ossl.error) { console.log('openssl missing: HTTPS part skipped'); return console.log('voice e2e ok (http only)'); }
  const g = spawnSync(process.execPath, ['tools/gen-cert.js', '127.0.0.1'], { cwd: root }); assert.strictEqual(g.status, 0, String(g.stderr));
  const key = path.join(root, '.certs/voice.key'), crt = path.join(root, '.certs/voice.crt'); assert(fs.existsSync(key) && fs.existsSync(crt));
  const san = spawnSync('openssl', ['x509', '-in', crt, '-noout', '-text']).stdout.toString(); assert(/IP Address:127\.0\.0\.1/.test(san), 'SAN has IP');
  s = await start({ PORT: '3172', HTTPS_KEY: key, HTTPS_CERT: crt });
  try { assert(/https:\/\/localhost:3172/.test(s.out()), 'https URL logged'); const r = await get(https, 'https://localhost:3172/voice.js'); assert.strictEqual(r.status, 200); } finally { s.c.kill(); }
  console.log('voice e2e ok');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
