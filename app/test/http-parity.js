// HTTP parity check: every public URL keeps its status, content-type, cache header and body bytes.
//   node test/http-parity.js            compare against test/http-parity.json
//   node test/http-parity.js --record   rewrite the expectation (only on a known-good baseline)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
process.env.PORT = process.env.TEST_PORT || '3112';
const { httpServer } = require('../src/server/index');

const EXPECT = path.join(__dirname, 'http-parity.json');
const BASE = 'http://localhost:' + process.env.PORT;
const URLS = [
  '/', '/?room=ABCD', '/mod', '/gallery', '/data.js', '/style.css', '/common.js', '/card-info.js', '/index.html', '/mod.html', '/gallery.html',
  '/socket.io/socket.io.js',
  '/thumbs/roles-md/team_deliver/01_senior_dev.jpg', '/docs/event_cards/01_fast_approval.jpg',
  '/docs/deadline_necromancer_design.md', '/docs/..%2f..%2fx.jpg', '/docs/event_cards/', '/..%2fserver.js',
  '/nope', '/thumbs/none.jpg', '/thumbs',
];
const NO_BODY_HASH = new Set(['/socket.io/socket.io.js']);   // body depends on the installed socket.io version

(async () => {
  await new Promise(r => (httpServer.listening ? r() : httpServer.once('listening', r)));
  const got = {};
  for (const u of URLS) {
    const res = await fetch(BASE + u);
    let body = Buffer.from(await res.arrayBuffer());
    // checkout line endings (core.autocrlf) must not change the hash of text files
    if (/^(text\/|application\/javascript)/.test(res.headers.get('content-type') || '')) body = Buffer.from(body.toString('utf8').replace(/\r\n/g, '\n'));
    got[u] = { status: res.status, type: res.headers.get('content-type'), cache: res.headers.get('cache-control'), sha256: NO_BODY_HASH.has(u) ? null : crypto.createHash('sha256').update(body).digest('hex') };
  }
  if (process.argv.includes('--record')) { fs.writeFileSync(EXPECT, JSON.stringify(got, null, 1) + '\n'); console.log('http-parity recorded: ' + URLS.length + ' urls'); }
  else {
    const want = JSON.parse(fs.readFileSync(EXPECT, 'utf8'));
    let bad = 0;
    for (const u of new Set([...Object.keys(want), ...URLS])) if (JSON.stringify(want[u]) !== JSON.stringify(got[u])) { bad++; console.log('DIFF ' + u + '\n  want ' + JSON.stringify(want[u]) + '\n  got  ' + JSON.stringify(got[u])); }
    console.log(bad ? `HTTP PARITY FAILED: ${bad}` : `HTTP PARITY OK (${URLS.length} urls)`);
    if (bad) process.exitCode = 1;
  }
  httpServer.close(); process.exit(process.exitCode || 0);
})().catch(e => { console.error('ERROR', e); process.exit(1); });
