const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function lanIp() {
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) return a.address;
  return '127.0.0.1';
}
const ip = process.argv[2] || lanIp();
if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) { console.error('lanIp must be an IPv4 address, got: ' + ip); process.exit(1); }
const dir = path.join(__dirname, '..', '.certs');
fs.mkdirSync(dir, { recursive: true });
const key = path.join(dir, 'voice.key'), crt = path.join(dir, 'voice.crt');
try {
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '365', '-keyout', key, '-out', crt,
    '-subj', '/CN=' + ip, '-addext', `subjectAltName=IP:${ip},DNS:localhost`], { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (e) {
  if (e.code === 'ENOENT') console.error('openssl not found. Install OpenSSL >= 1.1.1 (Windows: winget install ShiningLight.OpenSSL.Light; macOS: brew install openssl; Linux: apt install openssl) or use a tunnel (cloudflared / ngrok), see README.');
  else console.error('openssl failed: ' + (e.stderr ? e.stderr.toString() : e.message));
  process.exit(1);
}
console.log(`Wrote ${key}\nWrote ${crt}\n`);
console.log('bash:\n  HTTPS_KEY=' + key + ' HTTPS_CERT=' + crt + ' npm start\n');
console.log('PowerShell:\n  $env:HTTPS_KEY="' + key + '"; $env:HTTPS_CERT="' + crt + '"; npm start\n');
console.log(`Then open https://${ip}:3000/ . The browser warns about the self-signed certificate: tap Advanced -> continue.`);
