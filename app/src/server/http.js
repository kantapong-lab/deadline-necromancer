// Static file serving and the public URL table (public URLs are frozen).
const fs = require('fs');
const path = require('path');
const { PUBLIC, DOCS, SHARED } = require('./paths');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

function serveFile(res, base, rel) {
  const file = path.normalize(path.join(base, rel));
  if (!file.startsWith(base)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}
function handleRequest(req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') return serveFile(res, PUBLIC, 'index.html');
  if (url === '/mod') return serveFile(res, PUBLIC, 'mod.html');
  if (url === '/gallery') return serveFile(res, PUBLIC, 'gallery.html');   // แกลเลอรีรูปการ์ดทั้งหมด
  if (url === '/data.js') return serveFile(res, SHARED, 'data.js');   // ข้อมูลบทบาท/การ์ดใช้ร่วมกับฝั่ง client
  if (url.startsWith('/docs/')) {
    // เสิร์ฟเฉพาะรูปการ์ดจาก docs (ไม่เปิดไฟล์เอกสารอื่น)
    if (!/\.(jpg|png)$/i.test(url)) { res.writeHead(403); return res.end('forbidden'); }
    return serveFile(res, DOCS, url.slice(6));
  }
  serveFile(res, PUBLIC, url.slice(1));
}

module.exports = { MIME, serveFile, handleRequest };
