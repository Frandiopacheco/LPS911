// Velocidad con una obra grande (2400 actividades, 25 subcontratistas). Mide estilo, diseño y código del navegador
// al entrar a las pestañas. Los límites son amplios (las máquinas de GitHub varían) y avisan si algo se vuelve lento.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
import { obraGrande } from './obra-grande.js';

test('entrar y volver al Lookahead con una obra grande', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, { extra: obraGrande() });
  const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
  const M = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const res = {};
  for (const [i, tab] of ['look', 'restr', 'look', 'campo', 'look'].entries()) {
    const a = await M(); const t0 = Date.now();
    await page.evaluate(t => { goTab(t); document.body.offsetHeight; return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, tab);
    const b = await M();
    res[i + '_' + tab] = { ms: Date.now() - t0, estilo: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), diseno: Math.round((b.LayoutDuration - a.LayoutDuration) * 1000), codigo: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000) };
  }
  res.nodos = await page.evaluate(() => document.querySelectorAll('*').length);
  // editar una actividad con el Lookahead abierto (cada cambio vuelve a dibujar)
  { const a = await M(); const t0 = Date.now();
    await page.evaluate(() => window.firebase.firestore().collection('acts').doc('xx5').update({ name: 'Cambio' }).then(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 30))));
    const b = await M(); res.editar = { ms: Date.now() - t0, estilo: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), codigo: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000) }; }
  console.log('RENDIMIENTO ' + JSON.stringify(res));
  expect(res['0_look'].ms, 'primera entrada al Lookahead').toBeLessThan(8000);
  expect(res['2_look'].ms, 'volver al Lookahead').toBeLessThan(2500);
  expect(res.editar.ms, 'redibujar tras un cambio').toBeLessThan(1500);
});

test('Lookahead grande: se dibuja lo que se ve y al bajar aparece lo demás', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { extra: obraGrande(), tab: 'look' });
  const filas = () => page.locator('#grid tr[data-a]').count();
  expect(await filas(), 'no dibuja las 2400 filas de golpe').toBeLessThan(400);
  // bajar hasta el final: aparece la última actividad del último ambiente
  await page.evaluate(() => { const g = document.getElementById('gw'); g.scrollTop = g.scrollHeight; });
  await expect(page.locator('#grid tr[data-a="xx2399"]')).toHaveCount(1);
  expect(await filas()).toBeLessThan(400);
  // editar una actividad lejana
  const inp = page.locator('input[data-a="xx2399"][data-f="name"]');
  await inp.fill('Última editada'); await inp.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 'xx2399').name)).toBe('Última editada');
  // volver arriba y desde Restricciones ir a una actividad que no está dibujada
  await page.evaluate(() => { document.getElementById('gw').scrollTop = 0; });
  await page.evaluate(() => gotoAct('xx1800'));
  await expect(page.locator('#grid tr[data-a="xx1800"]')).toBeVisible();
  // el subcontratista de la fila se elige de la lista completa
  const sel = page.locator('select[data-a="xx1800"][data-f="sc"]');
  await sel.focus();
  expect(await sel.locator('option').count()).toBe(25);
  noErrors(errors, 'lookahead grande');
});
