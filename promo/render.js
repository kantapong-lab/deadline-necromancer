// Renders trailer.html frame-by-frame (deterministic seek) into PNGs.
// Usage: node render.js <outDir> [fps=30] [onlyTimes=comma list of seconds]
// Needs puppeteer-core (set NODE_PATH to where it is installed) and Chrome.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const outDir = path.resolve(process.argv[2] || 'frames');
const fps = Number(process.argv[3] || 30);
const only = process.argv[4] ? process.argv[4].split(',').map(Number) : null;

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const url = 'file:///' + path.resolve(__dirname, 'trailer.html').replace(/\\/g, '/') + '?render';
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll('*')].flatMap(el => {
      const m = getComputedStyle(el).backgroundImage.match(/url\("?(.*?)"?\)/);
      if (!m) return [];
      return [new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = m[1]; })];
    }));
  });
  const fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight));
  console.log('fonts loaded:', [...new Set(fonts)].join(', ') || 'NONE (fallback)');
  const duration = await page.evaluate(() => window.DURATION);
  const times = only || Array.from({ length: Math.round(duration * fps) }, (_, i) => i / fps);
  for (let i = 0; i < times.length; i++) {
    await page.evaluate(t => window.seek(t), times[i]);
    const name = only ? `t_${times[i]}.jpg` : `f_${String(i).padStart(5, '0')}.jpg`;
    await page.screenshot({ path: path.join(outDir, name), type: 'jpeg', quality: 92 });
    if (i % 150 === 0) console.log(`frame ${i}/${times.length}`);
  }
  await browser.close();
  console.log('done', times.length, 'frames ->', outDir);
})().catch(e => { console.error(e); process.exit(1); });
