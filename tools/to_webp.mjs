// Originals in <scratch>/img -> assets/img/products/*.webp (Chromium canvas, keeps transparency).
// usage: node tools/to_webp.mjs <scratch> [outDir] [maxPx] [quality]
// Needs playwright-core resolvable from the working directory (NODE_PATH or a node_modules link).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(process.cwd() + '/');
const { chromium } = require('playwright-core');
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [scratch, outArg, maxArg, qArg] = process.argv.slice(2);
const src = path.join(scratch, 'img');
const out = outArg || path.join(ROOT, 'assets/img/products');
fs.mkdirSync(out, { recursive: true });
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const b = await chromium.launch({ executablePath: exe });
const page = await b.newPage();
let n = 0, bytes = 0;
for (const f of fs.readdirSync(src).sort()) {
  if (!/\.(png|jpe?g|webp)$/i.test(f)) continue;
  const base = f.replace(/\.[^.]+$/, '');
  const pack = !base.includes('--');
  const max = +maxArg || (pack ? 1000 : 1600);
  const mime = /\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg';
  const data = `data:${mime};base64,` + fs.readFileSync(path.join(src, f)).toString('base64');
  const res = await page.evaluate(async ({ data, max, q, trim }) => {
    const img = new Image(); img.src = data; await img.decode();
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (trim) { // crop transparent margins so every packshot fills its card the same way
      const c0 = document.createElement('canvas'); c0.width = sw; c0.height = sh;
      const x0 = c0.getContext('2d', { willReadFrequently: true }); x0.drawImage(img, 0, 0);
      const d = x0.getImageData(0, 0, sw, sh).data;
      let l = sw, r = -1, t = sh, bt = -1;
      for (let y = 0; y < sh; y += 2) for (let x = 0; x < sw; x += 2) if (d[(y * sw + x) * 4 + 3] > 12) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > bt) bt = y; }
      if (r > l && bt > t && (l > 4 || t > 4 || r < sw - 5 || bt < sh - 5)) { const pad = 6; sx = Math.max(0, l - pad); sy = Math.max(0, t - pad); sw = Math.min(img.naturalWidth, r + pad) - sx; sh = Math.min(img.naturalHeight, bt + pad) - sy; }
    }
    const k = Math.min(1, max / Math.max(sw, sh));
    const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', q));
    const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192));
    return { b64: btoa(s), w: c.width, h: c.height };
  }, { data, max, q: +qArg || (pack ? 0.86 : 0.8), trim: pack && mime === 'image/png' });
  const buf = Buffer.from(res.b64, 'base64');
  fs.writeFileSync(path.join(out, base + '.webp'), buf);
  n++; bytes += buf.length;
}
await b.close();
console.log(n, 'images,', (bytes / 1048576).toFixed(1), 'MB ->', out);
