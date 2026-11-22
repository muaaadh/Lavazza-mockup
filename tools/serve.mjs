// tiny static server for tests: node serve.mjs <root> <port>
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [root, port = '4173'] = process.argv.slice(2);
const T = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', woff2: 'font/woff2' };
http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end('404 ' + p); return; }
  s.writeHead(200, { 'content-type': T[f.split('.').pop()] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(s);
}).listen(+port, '127.0.0.1', () => console.log('serving', root, 'on', port));
