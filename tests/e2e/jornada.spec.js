// Estado de la jornada (js/jornada.js, oct 2026): hoja con dos pestañas, «Detenciones» (qué reportó cada SC como «Detenido»:
// actividad, ambiente, motivo con detalle, hora y estado) y «Cierre del día» (quién ya cerró). Imagen para WhatsApp de cada una
// y dos láminas de Presentar del día. Los números salen de kState y de los reportes en vivo (LIVE).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

/* pone «Detenido» en vivo a las primeras actividades programadas hoy: dos del mismo SC (tarjeta) y una de otro (línea) */
async function seedStops(page) {
  return page.evaluate(() => {
    const d = todayIso(), API = window.__plano && window.__plano.novaSet ? window.__plano : null, nv = API ? API.novaSet(d) : new Set();
    const vs = new Set(visPisos().map(p => p.id));
    const L = [...S.act.values()].filter(x => schedOrSnap(x, d) && !nv.has(x.id) && pisoOfAct(x.id) && vs.has(pisoOfAct(x.id)) && S.amb.get(x.ambId));
    const by = new Map(); L.forEach(x => { const a = by.get(x.sc) || []; a.push(x); by.set(x.sc, a); });
    const two = [...by.values()].find(a => a.length >= 2), one = [...by.values()].find(a => a !== two);
    if (!two) return null;
    const t0 = NOW() - 6 * 3600e3;
    const set = (x, live) => LIVE.set(d + '_' + x.id, { id: d + '_' + x.id, date: d, actId: x.id, sc: x.sc, ...live });
    // 1) sigue detenido, con detalle
    set(two[0], { st: 'stop', mot: 'Materiales — no llegó la plancha RH', log: [{ s: 'stop', m: 'Materiales', x: 'no llegó la plancha RH', t: t0 }] });
    // 2) detenido y reanudado
    set(two[1], { st: 'run', mot: '', log: [{ s: 'stop', m: 'Actividad predecesora', x: 'falta masillado', t: t0 + 600e3 }, { s: 'res', t: t0 + 7200e3 }] });
    // 3) otro SC: una sola detención
    if (one) set(one[0], { st: 'stop', mot: 'Calidad', log: [{ s: 'stop', m: 'Calidad', t: t0 + 1200e3 }] });
    return { sc2: two[0].sc, sc1: one ? one[0].sc : null, n: one ? 3 : 2 };
  });
}

test('Jornada: pestañas Detenciones y Cierre del día, filtro por motivo, imágenes y dos láminas de presentación', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  const errors = await openApp(page, { tab: 'dash' });
  const seed = await seedStops(page);
  expect(seed).not.toBeNull();
  // modelo de detenciones
  const m = await page.evaluate(() => { const D = jorDet(todayIso()); return D.L.map(o => ({ sc: o.sc, st: o.st, mot: o.mot, note: o.note })); });
  expect(m.length).toBe(seed.n);
  expect(m.filter(o => o.st === 'stop').length).toBe(seed.n - 1);
  expect(m.find(o => o.mot === 'Materiales').note).toBe('no llegó la plancha RH');
  expect(m.find(o => o.mot === 'Actividad predecesora').st).toBe('res');
  // cierre: cuadra con la población
  const t = await page.evaluate(() => { const R = jorData(todayIso()); return { cer: R.cer.acts, tot: R.cer.tot, rows: R.rows.length, sumN: R.rows.reduce((t, r) => t + r.n, 0) }; });
  expect(t.tot).toBe(t.sumN);
  expect(t.cer).toBeLessThanOrEqual(t.tot);
  // hoja desde el Tablero: abre en Detenciones (mañana) y cambia a Cierre
  await page.evaluate(() => { JOR = { d: todayIso(), tab: 'det' }; jorDraw(); });
  const sh = page.locator('#jsheet');
  await expect(sh.locator('.jor-tabs button.on')).toHaveText('Detenciones');
  await expect(sh.locator('.jdt-c')).toHaveCount(1);
  await expect(sh.locator('.jdt-c .jdt-i')).toHaveCount(2);
  await expect(sh.locator('.jdt-ln')).toHaveCount(seed.n - 2);
  await expect(sh.locator('.jdt-s.jdt-res')).toContainText('Reanudado');
  await expect(sh.locator('.jdt-c')).toContainText('no llegó la plancha RH');
  // filtro por motivo
  await sh.locator('[data-jor="mot"][data-jm="Materiales"]').click();
  await expect(sh.locator('.jdt-i, .jdt-ln')).toHaveCount(1);
  await sh.locator('[data-jor="mot"][data-jm=""]').click();
  await expect(sh.locator('.jdt-i, .jdt-ln')).toHaveCount(seed.n);
  // imagen de detenciones
  const img = await page.evaluate(async () => { const out = {}; for (const f of ['det', 'cer']) { const b = await jorImage(todayIso(), f); const h = new Uint8Array(await b.arrayBuffer()).slice(0, 8); out[f] = { type: b.type, size: b.size, head: [...h] }; } return out; });
  for (const f of ['det', 'cer']) { expect(img[f].type).toBe('image/png'); expect(img[f].size).toBeGreaterThan(3000); expect(img[f].head).toEqual([137, 80, 78, 71, 13, 10, 26, 10]); }
  let dl = page.waitForEvent('download');
  await sh.locator('[data-jor="dl"]').click();
  expect((await dl).suggestedFilename()).toBe('detenciones_' + HOY + '.png');
  // pestaña Cierre: los que faltan primero
  await sh.locator('[data-jor="tab"][data-jt="cer"]').click();
  await expect(sh.locator('.jor-b[data-jf="cer"] .jor-r').first()).toBeVisible();
  expect(await sh.locator('.jor-b[data-jf="cer"] .jor-r').count()).toBe(t.rows);
  const cls = await sh.locator('.jor-b[data-jf="cer"] .jor-r').evaluateAll(L => L.map(e => e.classList.contains('ok')));
  expect(cls).toEqual([...cls].sort((a, b) => Number(a) - Number(b)));
  dl = page.waitForEvent('download');
  await sh.locator('[data-jor="dl"]').click();
  expect((await dl).suggestedFilename()).toBe('cierre_' + HOY + '.png');
  // en el Tablero, tocar una detención abre su resumen (solo lectura)
  await sh.locator('[data-jor="tab"][data-jt="det"]').click();
  await sh.locator('.jdt-c [data-jdt]').first().click();
  await expect(page.locator('#jsheet')).toHaveCount(0);
  const pop = page.locator('.ksheet').last();
  await expect(pop).toBeVisible();
  await pop.locator('[data-kx]').first().click();
  await expect(page.locator('.ksheet')).toHaveCount(0);
  // láminas de Presentar del día
  await page.evaluate(() => { U.tab = 'ind'; U.indMode = 'dia'; render(); });
  await page.locator('#bipr').click();
  await expect(page.locator('#ipr .iprpg button')).toHaveCount(6);
  await page.locator('#ipr [data-pg="4"]').click();
  await expect(page.locator('#ipr .jor-b[data-jf="cer"]')).toHaveCount(1);
  await page.locator('#ipr [data-pg="5"]').click();
  await expect(page.locator('#ipr .jdt-c')).toHaveCount(1);
  await expect(page.locator('#ipr [data-jdt]')).toHaveCount(0);
  await page.locator('#ipr [data-jor="mot"][data-jm="Calidad"]').click();
  await expect(page.locator('#ipr .jdt-i, #ipr .jdt-ln')).toHaveCount(seed.n === 3 ? 1 : 0);
  await expect(page.locator('#ipr [data-jor="share"]')).toBeVisible();
  noErrors(errors, 'jornada');
});
