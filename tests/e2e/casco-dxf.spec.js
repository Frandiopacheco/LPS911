// Casco › geometría del DXF de la planta (casco-dxf.js): la lámina del nivel viene de un plano DXF del módulo Planos y de ahí salen
// los ejes, la escala exacta, columnas y caras para pegarse al trazar vigas, y la alineación entre niveles por los cruces de ejes.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';
import { dxfDemo } from './dxf-demo.js';

/* Casco con la obra de ejemplo; dos planos DXF en Planos (techo 3 y techo 4, el mismo dibujo) y la lámina de cada nivel tomada de ellos */
async function preparar(page) {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const errors = await openApp(page, { as: 'admin' });
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  page.once('dialog', d => d.accept());
  await page.locator('[data-cs="demo"]').click();
  await expect.poll(() => page.evaluate(() => S.act.size), { timeout: 20000 }).toBeGreaterThan(200);
  await page.evaluate(async txt => {
    window.__ST = new Map(); window.plPut = async (p, b) => { window.__ST.set(p, b); }; window.plGet = async p => { const b = window.__ST.get(p); if (!b) throw new Error('404 ' + p); return b; };
    const S = dxfToPx(dxfSheet(dxfParse(txt))); const G = dxfGeoOf(S); const lay = dxfGuess(dxfLayers(dxfGeoF(G)));
    for (const [id, cod, pid, k] of [['EST_E03', 'E03', 'n3', 2], ['EST_E04', 'E04', 'n4', 4]]) {
      const base = `planos/${id}.t/r1`; const z = await dxfGz(JSON.stringify(G), 'application/json'); window.__ST.set(base + '/geo.json.gz', z.b);
      await fcol('plb').doc(id).set({ cod, disc: 'EST', rev: 1, base, W: S.W, H: S.H, Z: 3, T: 1024, mm: S.mm, tipo: 'Planta', tit: 'Encofrado', revs: [],
        dxf: { v: 1, src: S.src, k: S.k, how: S.how, mpp: S.mpp, lay, gz: 1, oz: 0 }, cal: { mpp: S.mpp, rev: 1, dxf: 1 } });
      await fcol('laminas').doc('lam' + cod).set({ pisoId: pid, base: true, esp: 'Estructuras', name: 'Encofrado', w: Math.round(S.W / k), h: Math.round(S.H / k), lw: 500, lh: 400, fmt: 'image/webp', nf: 0, nl: 0, rev: 1,
        T: { a: 1, b: 0, e: 0, f: 0 }, aligned: true, plb: { id, cod, disc: 'EST', rev: 1, mpp: S.mpp * k }, order: 1, ts: 1 });
    }
  }, dxfDemo());
  await expect.poll(() => page.evaluate(() => !!(window.__plano && window.__plano.LAM && window.__plano.LAM.get('lamE03') && window.__plano.LAM.get('lamE04') && PLB.get('EST_E04')))).toBe(true);
  await page.evaluate(() => { U.tab = 'planos'; U.csSzV = 'niv'; CSZ.fg = 'E'; CNV.pid = 'n3'; render(); });
  await expect(page.locator('[data-cnvt="viga"]')).toBeVisible({ timeout: 15000 });
  return errors;
}

test('casco DXF: la lámina de un plano DXF da los ejes, la escala exacta, columnas y caras; alinea los niveles por los ejes', async ({ page }) => {
  const errors = await preparar(page);
  await expect.poll(() => page.evaluate(() => csEjesOf(csRefLam(csSzFr(), 'E')).map(e => e.n).join(','))).toBe('A,B,C,D,E,1,2,3');
  const r = await page.evaluate(() => { const ref = csRefLam(csSzFr(), 'E'); const l4 = window.__plano.LAM.get('lamE04'); const E = csEjesOf(ref); const sc = csScale(ref);
    const ab = (E.find(e => e.n === 'B').p[0] - E.find(e => e.n === 'A').p[0]) * sc.mpp; const T = csMap(ref, l4); const d = csDxf(ref);
    return { ref: ref.id, st: sc.st, ab, T, col: d.cnt.col, chico: d.cnt.chico, ln: d.cnt.ln }; });
  expect(r.ref).toBe('lamE03');
  expect(r.st).toBe('dxf'); expect(r.ab).toBeCloseTo(4, 3);
  expect(r.col).toBe(5); expect(r.chico).toBe(1); expect(r.ln).toBeGreaterThan(2);
  /* el techo 4 (otro plano DXF, lámina a la mitad de tamaño) queda alineado solo por los cruces de los ejes */
  expect(r.T).toMatchObject({ dxf: 1, n: 15 }); expect(r.T.a).toBeCloseTo(0.5, 2); expect(r.T.b).toBeCloseTo(0, 3);
  await expect(page.locator('#csszsc')).toContainText('Escala exacta del DXF');
  await expect(page.locator('#csszside')).toContainText('Plano vectorial (DXF)');
  await expect(page.locator('#csszside')).toContainText('8 ejes (A, B, C, D, E, 1, 2, 3) · 5 columnas');
  await expect(page.locator('#csszside')).toContainText('Vienen del DXF de la planta');
  await expect(page.locator('[data-cnvt="ejes"]')).toHaveCount(0); /* los ejes no se trazan a mano */
  await expect(page.locator('#csszmap svg path')).toHaveCount(2);
  await page.locator('[data-csz2="dxf"]').uncheck();
  await expect(page.locator('#csszmap svg path')).toHaveCount(0);
  await page.locator('[data-csz2="dxf"]').check();

  /* viga del eje 2: las caras se tocan 2 cm adentro y se pegan a las de las columnas del DXF */
  const g = await page.evaluate(() => { const ref = csRefLam(csSzFr(), 'E'); const lam = csLamOf('n3', 'E'); const X = kvpCross(csEjesOf(ref)); const d = csDxf(lam);
    const C = d.col.map(q => csUnflat(q.p)).map(P => ({ x0: Math.min(...P.map(p => p.x)), x1: Math.max(...P.map(p => p.x)), y: (Math.min(...P.map(p => p.y)) + Math.max(...P.map(p => p.y))) / 2 })).sort((a, b) => a.x0 - b.x0);
    return { a2: X.find(c => c.v === 'A' && c.h === '2'), e2: X.find(c => c.v === 'E' && c.h === '2'), C, cm: 0.02 / d.mpp }; });
  const scr = (x, y) => page.evaluate(([x, y]) => { const h = document.getElementById('csszmap'); const v = h._v; const r = h.getBoundingClientRect(); return { x: r.left + v.x + x * v.z, y: r.top + v.y + y * v.z }; }, [x, y]);
  const tap = async (x, y) => { const q = await scr(x, y); await page.mouse.click(q.x, q.y); };
  await page.locator('[data-cnvt="viga"]').click();
  await tap(g.a2.x + 3, g.a2.y - 3); await tap(g.e2.x - 3, g.e2.y + 3);
  await expect(page.locator('#csszhint')).toContainText('Apoyo en el eje A');
  for (const c of g.C) { await expect(page.locator('#csszhint')).toContainText('Apoyo en el eje'); await tap(c.x0 + g.cm, c.y); await tap(c.x1 - g.cm, c.y); }
  await expect.poll(() => page.evaluate(() => (kvVigas('n3').find(v => v.pl) || {}).cod)).toBe('V-2');
  const V = await page.evaluate(() => kvVigas('n3').find(v => v.pl));
  expect(V.ejes.map(e => [e.n, e.w, e.d])).toEqual([['A', '0.50', '4.00'], ['B', '0.40', '4.00'], ['C', '0.40', '4.00'], ['D', '0.40', '4.00'], ['E', '0.40', '']]);
  expect(V.ejes[0].o).toBe('0.2');
  expect(errors).toEqual([]);
});
