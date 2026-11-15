// End-to-end check that public/mod3d.html shows what the real game is doing.
//   1) npm start                                   (server on :3000, or set PORT)
//   2) node tools/e2e-3d.js [players=9] [url=http://localhost:3000]
//        → creates a room, starts demo bots (tools/demo-bots.js) and prints the two things to do in the browser
//   3) open /mod3d.html in a browser, paste the printed `localStorage.setItem(...)` line in the console, reload,
//      then paste the whole of tools/e2e-3d-check.js
// The check plays Moderator, drives the game to the end and compares the 3D scene with the engine after every step.
// It prints "E2E OK" (or the list of mismatches) in the console and leaves the details in window.__e2e. Ctrl+C here stops the bots.
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');
const N = Math.max(6, Math.min(12, Number(process.argv[2]) || 9)), URL = process.argv[3] || 'http://localhost:' + (process.env.PORT || 3000);

const s = io(URL);
s.on('connect_error', e => { console.log('cannot reach ' + URL + ' — is `npm start` running?  (' + e.message + ')'); process.exit(1); });
s.on('connect', () => s.emit('mod:create', null, r => {
  if (!r || !r.ok) { console.log('mod:create failed', r); process.exit(1); }
  const bots = spawn(process.execPath, [path.join(__dirname, 'demo-bots.js'), r.code, String(N), URL], { stdio: 'inherit' });
  const stop = () => { bots.kill(); process.exit(0); }; process.on('SIGINT', stop); process.on('SIGTERM', stop);
  console.log(`\nroom ${r.code} (${N} bots joining) at ${URL}\n`);
  console.log(`1) open ${URL}/mod3d.html and run in its console:\n   localStorage.setItem('dn-mod', ${JSON.stringify(JSON.stringify({ code: r.code, modToken: r.modToken }))}); location.reload()\n`);
  console.log('2) after the lobby shows the players, paste the whole of tools/e2e-3d-check.js into the console\n');
}));
