// node scene.mjs <src> <dest.webp> [maxW=1600] [x0=0] [x1=1] [y0=0] [y1=1] [q=0.8]
import { chromium } from 'playwright-core'; import fs from 'node:fs';
const [src, dest, maxW = '1600', x0 = '0', x1 = '1', y0 = '0', y1 = '1', q = '0.8'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' });
const p = await b.newPage();
const mime = /\.png$/i.test(src) ? 'image/png' : /\.webp$/i.test(src) ? 'image/webp' : 'image/jpeg';
const data = `data:${mime};base64,` + fs.readFileSync(src).toString('base64');
const r = await p.evaluate(async ({ data, maxW, x0, x1, y0, y1, q }) => {
  const img = new Image(); img.src = data; await img.decode();
  const sx = img.naturalWidth * x0, sy = img.naturalHeight * y0, sw = img.naturalWidth * (x1 - x0), sh = img.naturalHeight * (y1 - y0);
  const k = Math.min(1, maxW / sw); const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/webp', q)); const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192));
  return { b64: btoa(s), w: c.width, h: c.height };
}, { data, maxW: +maxW, x0: +x0, x1: +x1, y0: +y0, y1: +y1, q: +q });
fs.writeFileSync(dest, Buffer.from(r.b64, 'base64')); console.log(dest.split('/').pop(), r.w + 'x' + r.h, (fs.statSync(dest).size / 1024 | 0) + 'KB');
await b.close();
