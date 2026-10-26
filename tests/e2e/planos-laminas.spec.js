// Láminas del Plan diario y de Sectorización tomadas del módulo Planos (docs/ia/plan-diario.md «Láminas del módulo Planos»):
// la lámina queda fija en la revisión elegida y el plano usado no se puede eliminar del módulo Planos.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openApp } from './helpers.js';

const NM = path.join(path.dirname(new URL(import.meta.url).pathname), 'node_modules', 'pdfjs-dist', 'build');
function pdfDemo() {
  const W = 1191, H = 842; const ops = ['2 w 40 40 ' + (W - 80) + ' ' + (H - 80) + ' re S'];
  for (let i = 1; i < 20; i++) ops.push(`0.5 w ${60 + i * 50} 80 m ${60 + i * 50} ${H - 80} l S`);
  const content = ops.join('\n');
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R >>`, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(out, 'latin1').toString('base64');
}
const PLB = { cod: 'AG04', disc: 'ARQ', pisoId: 'p2', tit: 'Planta segundo piso', tipo: 'Planta', rev: 2, base: 'planos/ARQ_AG04.k1/r2', W: 5000, H: 3750, Z: 1, mm: [1200, 900],
  crop: { x0: 40, y0: 40, x1: 1151, y1: 802 }, revs: [{ rev: 1, base: 'planos/ARQ_AG04.k1/r1', W: 5000, H: 3750, Z: 1, mm: [1200, 900], crop: { x0: 40, y0: 40, x1: 1151, y1: 802 } }], cal: { mpp: 0.0024, rev: 2 } };

test('Sectorización toma la lámina base del módulo Planos, fija en su revisión; el plano usado no se elimina hasta desvincularlo', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', extra: [['plb', 'ARQ_AG04', PLB]] });
  /* después de openApp: su ruta general de sitios externos se registró antes y esta tiene prioridad */
  await page.route(/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@[^/]+\/build\/(pdf(\.worker)?\.min\.js)/, r => {
    const f = r.request().url().match(/(pdf(\.worker)?\.min\.js)/)[1];
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(NM, f)) });
  });
  await page.evaluate(b64 => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const st = new Map([['planos/ARQ_AG04.k1/r2/orig.pdf', new Blob([u8], { type: 'application/pdf' })], ['planos/ARQ_AG04.k1/r1/orig.pdf', new Blob([u8], { type: 'application/pdf' })]]);
    window.__GETS = []; window.plGet = async p => { window.__GETS.push(p); const b = st.get(p); if (!b) throw new Error('404 ' + p); return b; };
    U.piso = 'p2'; U.tab = 'planos'; render();
  }, pdfDemo());
  await expect(page.locator('#szup')).toBeVisible({ timeout: 15000 });
  await page.locator('#szup').click();
  await expect(page.locator('#usrc')).toHaveValue('plb');
  await expect(page.locator('#uplb option[value="ARQ_AG04"]')).toHaveCount(1);
  await page.locator('#uplb').selectOption('ARQ_AG04');
  await page.locator('#uprev').selectOption('1');
  await page.locator('#ugo').click();
  await expect.poll(() => page.evaluate(() => [...window.__plano.LAM.values()].filter(l => l.pisoId === 'p2' && l.base && l.plb).length), { timeout: 20000 }).toBe(1);
  const l = await page.evaluate(() => [...window.__plano.LAM.values()].find(x => x.pisoId === 'p2' && x.plb));
  expect(l.plb.id).toBe('ARQ_AG04'); expect(l.plb.rev).toBe(1); expect(l.plb.mpp).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__GETS)).toContain('planos/ARQ_AG04.k1/r1/orig.pdf');
  /* eliminar el plano en el módulo Planos: se bloquea mientras lo use la lámina */
  page.once('dialog', d => d.accept());
  await page.evaluate(() => { plSub(); });
  await expect.poll(() => page.evaluate(() => PLB.has('ARQ_AG04'))).toBe(true);
  await page.evaluate(() => plDelete([PLB.get('ARQ_AG04')]));
  expect(await page.evaluate(() => !!window.__dbGet('plb', 'ARQ_AG04'))).toBe(true);
  /* desvincular y recién se puede eliminar */
  await page.evaluate(id => fcol('laminas').doc(id).update({ plb: null }), l.id);
  page.once('dialog', d => d.accept('BORRAR'));
  await page.evaluate(() => { window.plStList = async () => []; return plDelete([PLB.get('ARQ_AG04')]); });
  await expect.poll(() => page.evaluate(() => !!window.__dbGet('plb', 'ARQ_AG04'))).toBe(false);
  expect(errors.filter(e => !/404|Failed to load resource/.test(e))).toEqual([]);
});
