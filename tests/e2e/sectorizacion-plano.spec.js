// Sectorización › ambientes desde el plano alistado (sz-plano.js, 11-11-2026, decidido con el dueño): la planta de arquitectura alistada
// en Planos trae cada ambiente con su nombre y su forma; aquí se crean los nuevos, se ubican los que coinciden (por ubicación o por nombre)
// y los demás no se tocan. «Agrupar en este sector» pasa a un sector los ambientes que quedan dentro de un contorno dibujado.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';
import { dxfDemo } from './dxf-demo.js';

test('sectorización: trae los ambientes de la planta alistada (nuevos, por nombre, por ubicación) y agrupa en un sector dibujando', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin' });
  const R = await page.evaluate(async txt => {
    window.__ST = new Map(); window.plPut = async (p, b) => { window.__ST.set(p, b); }; window.plGet = async p => { const b = window.__ST.get(p); if (!b) throw new Error('404 ' + p); return b; };
    const S = dxfToPx(dxfSheet(dxfParse(txt))); const G = dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G)));
    const W = S.W, H = S.H, rect = (x0, y0, x1, y1) => [x0 * W, y0 * H, x1 * W, y0 * H, x1 * W, y1 * H, x0 * W, y1 * H];
    const R = { 'DPTO 101': rect(.05, .05, .25, .25), 'BAÑO': rect(.30, .05, .45, .25), 'SALA': rect(.50, .05, .70, .25), 'COCINA': rect(.75, .05, .95, .25) };
    const fix = { rev: 1, L: Object.entries(R).map(([a, p], i) => ({ id: 'f' + i, k: 'ambAdd', p, a })) };
    const base = 'planos/ARQ_A03.t/r1'; const z = await dxfGz(JSON.stringify(G), 'application/json'); window.__ST.set(base + '/geo.json.gz', z.b);
    await fcol('plb').doc('ARQ_A03').set({ cod: 'A03', disc: 'ARQ', rev: 1, base, W, H, Z: 3, T: 1024, mm: S.mm, tipo: 'Planta', tit: 'Planta primer piso', revs: [], pisoId: 'p1',
      dxf: { v: 1, src: S.src, k: S.k, how: S.how, mpp: S.mpp, lay, gz: 1, oz: 0 }, cal: { mpp: S.mpp, rev: 1, dxf: 1 }, fix, ok: { rev: 1, t: 1, by: 'ot@obra', malla: false } });
    await fcol('laminas').doc('lamA03').set({ pisoId: 'p1', base: true, esp: 'Arquitectura', name: 'Planta', w: Math.round(W / 2), h: Math.round(H / 2), lw: 500, lh: 400, fmt: 'image/webp', nf: 0, nl: 0, rev: 1,
      T: { a: 1, b: 0, e: 0, f: 0 }, aligned: true, plb: { id: 'ARQ_A03', cod: 'A03', disc: 'ARQ', rev: 1, mpp: S.mpp * 2 }, order: 1, ts: 1 });
    /* «Dpto 102» ya está ubicado donde el plano tiene «BAÑO» (lámina a la mitad del plano) */
    const half = R['BAÑO'].map(v => v / 2 + (v > 0 ? 1 : 0));
    await fcol('ambientes').doc('a2').update({ geo: { lamA03: half } });
    return { sala: R['SALA'].map(v => v / 2) };
  }, dxfDemo());
  await page.evaluate(() => { U.piso = 'p1'; U.pisoAll = false; goTab('planos'); });
  await expect.poll(() => page.evaluate(() => !!(window.__plano && window.__plano.LAM && window.__plano.LAM.get('lamA03') && PLB.get('ARQ_A03')))).toBe(true);
  await page.evaluate(() => { SZ.vista = 'lamA03'; render(); });
  await expect(page.locator('#szpl')).toBeVisible();
  /* la primera vez puede estar cargando la geometría: se reintenta */
  await expect.poll(async () => { if (!(await page.locator('#lqm').count())) await page.click('#szpl'); return page.locator('#lqm .szplt tbody tr').count(); }, { timeout: 15000 }).toBe(4);
  const rows = page.locator('#lqm .szplt tbody tr');
  await expect(rows.nth(0)).toContainText('Dpto 101'); await expect(rows.nth(0)).toContainText('mismo nombre');
  await expect(rows.nth(1)).toContainText('Dpto 102'); await expect(rows.nth(1)).toContainText('misma ubicación');
  await expect(rows.nth(1).locator('[data-szplc]')).not.toBeChecked();   /* ya ubicado: no se reemplaza su forma salvo que se marque */
  await expect(rows.nth(2)).toContainText('Nuevo'); await expect(rows.nth(3)).toContainText('Nuevo');
  await expect(page.locator('#lqm .szplsolo')).toHaveCount(0);   /* en p1 no queda ninguno solo en el lookahead */
  await page.locator('#lqm [data-szpln="3"]').fill('Cocina 1');
  await page.locator('#szplsec').selectOption('__new');
  await page.click('#szplok');
  await expect(page.locator('#lqm')).toHaveCount(0);
  const r = await page.evaluate(() => { const A = Object.values(window.__dbAll('ambientes')).filter(a => a.pl && a.pl.plb === 'ARQ_A03' && !a.arch);
    const sec = Object.values(window.__dbAll('sectors')).filter(s => s.pisoId === 'p1'); const a1 = window.__dbGet('ambientes', 'a1'), a2 = window.__dbGet('ambientes', 'a2');
    return { n: A.length, names: A.map(a => a.name).sort(), secs: sec.map(s => s.code).sort(), nuevos: A.filter(a => a.sectorId !== 's1').map(a => a.name).sort(), geoNew: A.every(a => a.geo && a.geo.lamA03 && a.geo.lamA03.length === 8),
      a1geo: !!(a1.geo && a1.geo.lamA03), a2geo: a2.geo.lamA03[0] }; });
  expect(r.n).toBe(3);   /* a1 (por nombre) y los 2 nuevos; a2 no se marcó */
  expect(r.names).toEqual(['COCINA 1', 'Dpto 101', 'SALA']);
  expect(r.secs).toEqual(['S1', 'S2']); expect(r.nuevos).toEqual(['COCINA 1', 'SALA']);
  expect(r.geoNew).toBe(true); expect(r.a1geo).toBe(true);
  /* Deshacer lo devuelve todo */
  await page.evaluate(() => undo());
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('ambientes')).filter(a => a.pl && !a.arch).length)).toBe(0);
  await page.evaluate(() => redo());
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('ambientes')).filter(a => a.pl && !a.arch).length)).toBe(3);
  /* «Agrupar en este sector»: contorno alrededor de SALA → pasa a S1 */
  page.on('dialog', d => d.accept());
  await page.evaluate(sala => { SZ.sel = { lv: 's', id: 's1' }; SZ.lasso = true; SZ.draw = 'poly'; szSave(sala.map((v, i) => v + (i % 2 ? (i === 1 || i === 3 ? -5 : 5) : (i === 0 || i === 6 ? -5 : 5))), 'lamA03'); }, R.sala);
  await expect.poll(() => page.evaluate(() => (Object.values(window.__dbAll('ambientes')).find(a => a.name === 'SALA' && !a.arch) || {}).sectorId)).toBe('s1');
  expect(await page.evaluate(() => (Object.values(window.__dbAll('ambientes')).find(a => a.name === 'COCINA 1') || {}).sectorId)).not.toBe('s1');
  expect(errors).toEqual([]);
});
