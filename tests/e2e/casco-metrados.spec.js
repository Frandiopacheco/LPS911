// Casco › Metrados (casco-met.js, casco-met-calc.js): despiece de acero, planilla por nivel, parámetros y aplicar a los sectores.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

async function casco(page, as = 'admin') {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  return openApp(page, { as });
}
async function cargarEjemplo(page) {
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  page.once('dialog', d => d.accept());
  await page.locator('[data-cs="demo"]').click();
  await expect.poll(() => page.evaluate(() => S.act.size), { timeout: 20000 }).toBeGreaterThan(200);
}

test('casco: motor de metrado: viga continua con empalme, bastones, estribos por tramo y traslape en la junta de sector', async ({ page }) => {
  const errors = await casco(page);
  const r = await page.evaluate(() => {
    const P = kmPar({});
    const V = { id: 'v', cl: 'vig', b: 0.25, h: 0.50, el: 0.20, a: 0.30, L: [{ p: 'sup', s: '2Ø5/8', t: 'c' }, { p: 'inf', s: '2Ø5/8', t: 'c' }, { p: 'sup', s: '1Ø5/8', t: 'ba', k: 3 }], est: [{ d: '3/8', z: '□Ø3/8: 1@.05, 10@.10, r@.25 c/e', f: 'r' }] };
    const ctx = { secByCode: c => c === 'S2' ? 'b' : null, secOrd: s => ({ a: 1, b: 2 })[s] || 0 };
    const one = kmCalc(V, { sec: 'a', lu: '5.35 + 4.80', v: 1 }, P, ctx);
    const two = kmCalc(V, { sec: 'a', lu: '5.35 + S2:4.80', v: 1 }, P, ctx);
    const C = { id: 'c', cl: 'col', b: 0.30, h: 0.60, hv: 0.50, L: [{ s: '8Ø3/4' }], est: [{ d: '3/8', z: '1@.05, 7@.10, r@.25', f: 'r' }] };
    const col = kmCalc(C, { sec: 'a', al: '2.80', v: 4 }, P, ctx);
    return {
      kg1: Math.round(one.kg * 10) / 10, corr: one.bars[0].l, est: one.bars.filter(b => /Estribo/.test(b.m)).map(b => b.n),
      kg2: Math.round(two.kg * 10) / 10, secs: Object.keys(two.al).sort(), junta: two.bars.some(b => /junta/.test(b.m)),
      colEst: col.bars[1].n, colAv: Math.round(col.al.a.av), vv: Math.round(col.al.a.vv * 1000) / 1000,
      err: kmCalc(V, { sec: 'a', lu: '5,35 + x' }, P, ctx).err.length, spec: kmSpec('2Ø5/8" + 1 Ø 1/2"'), dist: kmEstN(1.0, kmDist('1@.05, 10@.10, r@.25')),
    };
  });
  // corrido: 5.35 + 4.80 + 0.30 (apoyo interior) + 2×(0.30 − 0.04) + 2×0.25 (gancho) = 11.47 m > 9 m → un empalme de 0.70 m
  expect(r.corr).toBeCloseTo(12.17, 2);
  expect(r.est).toEqual([34, 32]);
  expect(r.kg1).toBeCloseTo(139.1, 1);
  // con el segundo tramo en S2: el peso se reparte en dos sectores y suma un traslape por barra corrida en la junta
  expect(r.secs).toEqual(['a', 'b']);
  expect(r.junta).toBe(true);
  expect(r.kg2).toBeGreaterThan(r.kg1);
  // columna: 4 × (8 en cada extremo + 3 al centro + 2 en el nudo)
  expect(r.colEst).toBe(84);
  expect(r.vv).toBeCloseTo(4 * 0.3 * 0.6 * 2.3, 3);
  expect(r.err).toBe(1);
  expect(r.spec).toEqual([{ n: 2, d: '5/8' }, { n: 1, d: '1/2' }]);
  expect(r.dist).toBe(10);
  expect(errors).toEqual([]);
});

test('casco: pestaña Metrados: tipo, fila de la planilla, despiece, parámetros y aplicar a los sectores', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  const pid = await page.evaluate(() => { const p = pisos().find(x => kmSecs(x.id).length >= 3); U.piso = p.id; U.tab = 'met'; U.kmV = 'calc'; render(); return p.id; });
  await expect(page.locator('.km')).toBeVisible();
  // tipo nuevo: viga con el armado típico
  await page.locator('[data-kmtnew="vig"]').click();
  await expect(page.locator('#lqm .kmted')).toBeVisible();
  await page.locator('#kte_cod').fill('V-101');
  await page.locator('#kte_cod').press('Tab');
  await page.locator('#lqm [data-lqx]').click();
  await expect(page.locator('.kmti b', { hasText: 'V-101' })).toBeVisible();
  // fila: luces de dos tramos
  await page.locator('[data-km="add"]').click();
  const lu = page.locator('.kmrows tbody tr').first().locator('[data-kf="lu"]');
  await lu.fill('5.35 + 4.80');
  await lu.press('Tab');
  await expect(page.locator('.kmdes tbody tr')).toHaveCount(6);
  const kg = await page.evaluate(pid => { const R = kmLevel(kmRows(pid), KM.tipos, kmP(), kmCtx(pid)); return Object.values(R.rows)[0].kg; }, pid);
  expect(kg).toBeCloseTo(139.1, 1);
  // parámetros: traslape de 5/8 a 0.80 → sube el peso
  await page.locator('[data-kmv="par"]').click();
  const lt = page.locator('[data-kp="dia.5/8.lt"]');
  await lt.fill('0.80');
  await lt.press('Tab');
  const kg2 = await page.evaluate(pid => { const R = kmLevel(kmRows(pid), KM.tipos, kmP(), kmCtx(pid)); return Object.values(R.rows)[0].kg; }, pid);
  expect(kg2).toBeGreaterThan(kg);
  // aplicar: el sector guarda el acero de vigas en su partida, marcado como calculado
  await page.locator('[data-kmv="calc"]').click();
  page.on('dialog', d => d.accept());
  await page.locator('[data-km="apply"]').click();
  await expect.poll(() => page.evaluate(pid => { const a = kmSecs(pid)[0]; const d = window.__dbGet('cs_ambientes', a.id) || {}; return d.met && d.met['k-AVG']; }, pid)).toBeGreaterThan(100);
  const mo = await page.evaluate(pid => { const a = kmSecs(pid)[0]; return (window.__dbGet('cs_ambientes', a.id) || {}).mo; }, pid);
  expect(mo['k-AVG']).toBe('c');
  // se guardó en cs_kmet, no en Last Planner
  await expect.poll(() => page.evaluate(pid => !!window.__dbGet('cs_kmet', 'n_' + pid), pid)).toBe(true);
  expect(await page.evaluate(() => !!window.__dbGet('kmet', 'tipos'))).toBe(false);
  // Por ratio se dibuja
  await page.locator('[data-kmv="ratio"]').click();
  await expect(page.locator('.km h2', { hasText: 'Por ratio' })).toBeVisible();
  expect(errors).toEqual([]);
});
