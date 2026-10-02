// Datos de prueba con lámina: una imagen PNG lisa para el piso 1 y la última zona de «Entubado» (A-1).
import zlib from 'node:zlib';
export function png(w, h) {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0xe8)])));
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
}
const B64 = png(20, 12).toString('base64');
export const LAMINA = [
  ['laminas', 'L1', { pisoId: 'p1', esp: 'ARQ', name: 'Planta P1', base: true, w: 1000, h: 600, lw: 1000, lh: 600, fmt: 'image/png', nf: 1, nl: 1, rev: 1, order: 1 }],
  ['lamimg', 'L1_1_l_0', { d: B64 }], ['lamimg', 'L1_1_f_0', { d: B64 }],
];
export const ZONA_E0 = ['pzon', 'e0', { pisoId: 'p1', vista: 'L1', pts: [100, 100, 300, 100, 300, 300, 100, 300], sc: 'c2' }];
/** coordenadas de pantalla de un punto de la lámina dentro del visor `sel` */
export async function enPantalla(page, sel, x, y) {
  await page.waitForFunction(s => { const h = document.querySelector(s); return h && h._v && h._v.fitted; }, sel);
  await page.waitForTimeout(250);
  return page.evaluate(([s, x, y]) => { const h = document.querySelector(s); const v = h._v; const r = h.getBoundingClientRect(); return { x: r.left + v.x + x * v.z, y: r.top + v.y + y * v.z }; }, [sel, x, y]);
}
