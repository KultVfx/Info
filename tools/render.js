// Render the film frame-by-frame in headless Chromium.
//   node tools/render.js preview 1.5 6 12 ...   -> output/preview/t_<time>.png
//   node tools/render.js full                    -> output/video_noaudio.mp4
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const W = 270, H = 480, SCALE = 4;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.on('console', m => console.log('[page]', m.text())); page.on('pageerror', e => { console.error('[pageerror]', e); process.exit(1); });
  await page.goto(`http://localhost:${port}/src/film.html`);
  await page.waitForFunction(() => window.filmReady === true, null, { timeout: 60000 });
  const [mode, ...rest] = process.argv.slice(2);
  const toFfmpeg = (args) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  if (mode === 'preview') {
    fs.mkdirSync(path.join(ROOT, 'output/preview'), { recursive: true });
    for (const t of rest.map(Number)) {
      const b64 = await page.evaluate(t => window.renderFrame(t), t);
      const ff = toFfmpeg(['-i', '-', '-vf', `scale=${W * 2}:${H * 2}:flags=neighbor`, path.join(ROOT, `output/preview/t_${t.toFixed(2)}.png`)]);
      ff.stdin.end(Buffer.from(b64, 'base64')); await new Promise(r => ff.on('close', r));
    }
  } else {
    const fps = 30, dur = 60; const N = fps * dur;
    const ff = toFfmpeg(['-r', String(fps), '-i', '-', '-vf', `scale=${W * SCALE}:${H * SCALE}:flags=neighbor`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', path.join(ROOT, 'output/video_noaudio.mp4')]);
    const t0 = Date.now();
    for (let f = 0; f < N; f++) {
      const b64 = await page.evaluate(t => window.renderFrame(t), f / fps);
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(`frame ${f}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close(); server.close();
})();
