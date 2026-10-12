// Servidor estático mínimo para el arnés: node harness/serve.mjs [puerto]  →  http://localhost:4180/scripts/visor3d/harness/
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'); const port = +process.argv[2] || 4180;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.json': 'application/json', '.frag': 'application/octet-stream' };
/* modelos de prueba fuera del repositorio: IFC_DIR (para /__ifc/<archivo>) y FRAG_DIR (para /__frag/<archivo> y POST /__save/<archivo>) */
const IFC_DIR = process.env.IFC_DIR, FRAG_DIR = process.env.FRAG_DIR;
http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const cors = { 'access-control-allow-origin': '*' };
  const ext = (pre, dir) => dir && u.startsWith(pre) ? path.join(dir, path.basename(u)) : null;
  if (q.method === 'POST' && FRAG_DIR && u.startsWith('/__save/')) { fs.mkdirSync(FRAG_DIR, { recursive: true }); const w = fs.createWriteStream(path.join(FRAG_DIR, path.basename(u))); q.pipe(w); w.on('finish', () => { r.writeHead(200, cors); r.end('ok') }); return }
  const ef = ext('/__ifc/', IFC_DIR) || ext('/__frag/', FRAG_DIR);
  if (ef) { if (!fs.existsSync(ef)) { r.writeHead(404); r.end('no'); return } r.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': fs.statSync(ef).size, ...cors }); fs.createReadStream(ef).pipe(r); return }
  const f = path.join(root, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end('no'); return }
  r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(r) }).listen(port, () => console.log('arnés en http://localhost:' + port + '/scripts/visor3d/harness/'));
