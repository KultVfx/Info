// Render scene.html frames with headless Chromium and encode via ffmpeg.
// usage: node render.js preview 1.5,12,40     -> build/preview_<t>.png
//        node render.js video [workers]       -> build/video_noaudio.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), BUILD = path.join(ROOT, 'build');
const FPS = 30;
const tl = JSON.parse(fs.readFileSync(path.join(BUILD, 'timeline.json'), 'utf8'));
const DUR = Math.max(120, tl.duration);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(async tl => { await document.fonts.load('60px Russo'); await document.fonts.load('60px Wet'); window.setupTL(tl); }, tl);
  return page;
}
const grab = (page, t) => page.evaluate(t => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.94); }, t)
  .then(u => Buffer.from(u.split(',')[1], 'base64'));

(async () => {
  const mode = process.argv[2] || 'preview';
  const browser = await chromium.launch({ args: ['--disable-gpu-vsync'] });
  if (mode === 'preview') {
    const page = await openPage(browser);
    for (const t of (process.argv[3] || '1,5').split(',').map(Number)) {
      fs.writeFileSync(path.join(BUILD, `preview_${t.toFixed(2)}.jpg`), await grab(page, t));
    }
  } else {
    const workers = +(process.argv[3] || 4), total = Math.round(DUR * FPS), per = Math.ceil(total / workers);
    const t0 = Date.now();
    await Promise.all([...Array(workers)].map(async (_, w) => {
      const page = await openPage(browser);
      const out = path.join(BUILD, `chunk_${w}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = w * per; f < Math.min(total, (w + 1) * per); f++) {
        const buf = await grab(page, f / FPS);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (w === 0 && f % 150 === 0) console.log(`worker0 frame ${f}/${per}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
    }));
    fs.writeFileSync(path.join(BUILD, 'chunks.txt'), [...Array(workers)].map((_, w) => `file 'chunk_${w}.mp4'`).join('\n'));
    console.log('rendered in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  }
  await browser.close();
})();
