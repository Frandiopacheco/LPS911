// Planos › Modelo 3D (beta, docs/ia/planos.md): se convierte un IFC pequeño en el navegador, se abre con el visor nuevo
// (That Open Components) y se recorre la interfaz de tablet: pisos, cortes, medir, propiedades, aislar/ocultar y vistas.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openApp, noErrors } from './helpers.js';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const memStorage = () => {
  window.__ST = new Map();
  window.plPut = async (p, blob) => { window.__ST.set(p, blob); };
  window.plGet = async p => { const b = window.__ST.get(p); if (!b) throw new Error('404 ' + p); return b; };
};

test('modelo 3D: convierte un IFC, lo abre y funcionan pisos, cortes, medir, propiedades y ocultar', async ({ page }) => {
  test.setTimeout(240_000);
  const ifc = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'p3d-')), '2459243-PTSA-XX-ZZZ-M3D-ARQ-E05.ifc');
  execFileSync('node', [path.join(ROOT, 'scripts/visor3d/tools/make-ifc.mjs'), ifc, 'arq', '3', '3', '3']);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await page.evaluate(memStorage);
  await page.evaluate(() => { goMod('pla'); U.tab = 'p3d'; render(); });
  await expect(page.locator('#p3dock .p3b')).toHaveCount(6, { timeout: 60_000 });
  await page.setInputFiles('#p3file', ifc);
  await expect(page.locator('#p3models .plchip')).toHaveCount(1, { timeout: 120_000 });
  await expect(page.locator('#p3models .plchip.on')).toHaveCount(1, { timeout: 60_000 });
  await page.waitForFunction(() => P3.v && P3.v.levels().length >= 2, null, { timeout: 60_000 });
  // pisos: aislar un piso con corte a 1,30 m
  await page.click('#p3dock [data-a="pn:pisos"]');
  await expect(page.locator('#p3pn .p3lv .plchip')).toHaveCount((await page.evaluate(() => P3.v.levels().length)) + 1);
  await page.locator('#p3pn [data-a="lvl"]:not([data-l=""])').first().click();
  await expect(page.locator('#p3pn .p3step b')).toContainText('1,30 m');
  await page.click('#p3pn [data-a="cuth+"]');
  await expect(page.locator('#p3pn .p3step b')).toContainText('1,40 m');
  await page.click('#p3pn [data-a="plan"]');
  await expect(page.locator('#p3ban')).toContainText('planta');
  await page.click('#p3pn [data-a="plan"]');
  await page.click('#p3pn [data-a="lvl"][data-l=""]');
  // cortes: caja de sección alrededor del modelo y quitarla
  await page.click('#p3dock [data-a="pn:cortes"]');
  await page.click('#p3pn [data-a="sec-box"][data-t="model"]');
  await expect(page.locator('#p3dock .p3n').first()).toHaveText('6');
  await page.click('#p3ban [data-a="sec-clear"]');
  await expect(page.locator('#p3dock .p3n')).toHaveCount(0);
  // gestos táctiles (tablet): un dedo gira, dos dedos acercan
  await page.click('#p3dock [data-a="pn:vista"]'); await page.click('#p3pn [data-a="view"][data-v="iso"]'); await page.click('#p3pn [data-a="pn:"]');
  await page.waitForTimeout(1200);
  const cdp = await page.context().newCDPSession(page);
  const cb = await page.locator('#p3cv canvas').boundingBox(); const cx = cb.x + cb.width / 2, cy = cb.y + cb.height / 2;
  const tch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  const cam = () => page.evaluate(() => { const c = P3.v.camera.controls; return { az: c.azimuthAngle, d: c.distance } });
  const c0 = await cam();
  await tch('touchStart', [[cx - 60, cy + 150]]);
  for (let i = 1; i <= 10; i++) { await tch('touchMove', [[cx - 60 + i * 12, cy + 150]]); await page.waitForTimeout(16) }
  await tch('touchEnd', []); await page.waitForTimeout(700);
  const c1 = await cam(); expect(Math.abs(c1.az - c0.az), 'un dedo gira').toBeGreaterThan(0.05);
  await tch('touchStart', [[cx - 40, cy + 150], [cx + 40, cy + 150]]);
  for (let i = 1; i <= 10; i++) { await tch('touchMove', [[cx - 40 - i * 12, cy + 150], [cx + 40 + i * 12, cy + 150]]); await page.waitForTimeout(16) }
  await tch('touchEnd', []); await page.waitForTimeout(700);
  const c2 = await cam(); expect(c2.d, 'dos dedos separándose acercan').toBeLessThan(c1.d * 0.8);
  // propiedades: toque sobre el modelo (se prueban varios puntos hasta acertar a un elemento)
  await page.click('#p3dock [data-a="pn:vista"]'); await page.click('#p3pn [data-a="view"][data-v="iso"]'); await page.click('#p3pn [data-a="pn:"]');
  await page.waitForTimeout(1500);
  const box = await page.locator('#p3cv canvas').boundingBox();
  let hit = false;
  for (const [fx, fy] of [[.5, .5], [.45, .55], [.55, .45], [.4, .6], [.6, .6], [.5, .4], [.5, .65], [.35, .5]]) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    try { await page.waitForFunction(() => P3.selN > 0, null, { timeout: 7000 }); hit = true; break } catch (e) {}
  }
  expect(hit, 'un toque sobre el modelo selecciona un elemento').toBe(true);
  await expect(page.locator('#p3prop')).toBeVisible();
  await expect(page.locator('#p3prop .p3pt')).not.toHaveText('Cargando…', { timeout: 15_000 });
  await page.click('#p3prop [data-a="hide"]');
  await expect(page.locator('#p3dock [data-a="showall"] .p3n')).toHaveText('1');
  await page.click('#p3dock [data-a="showall"]');
  await expect(page.locator('#p3dock [data-a="showall"] .p3n')).toHaveCount(0);
  // medir: dos toques dan una medida
  await page.click('#p3dock [data-a="pn:medir"]'); await page.click('#p3pn [data-a="meas"]');
  await expect(page.locator('#p3ban')).toContainText('punto A');
  for (const [fx, fy] of [[.45, .5], [.55, .55]]) { await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(400); }
  await expect(page.locator('#p3dock [data-a="pn:medir"] .p3n')).toHaveText('1', { timeout: 10_000 });
  await page.click('#p3ban [data-a="tool-off"]'); await page.click('#p3dock [data-a="pn:medir"]');
  await expect(page.locator('#p3pn .p3li')).toHaveCount(1);
  await page.click('#p3pn [data-a="meas-clear"]');
  // rendimiento: prueba de fluidez corta
  await page.click('#p3dock [data-a="pn:rend"]');
  await page.click('#p3pn [data-a="preset"][data-p="rapida"]');
  await expect(page.locator('#p3pn .seg .on')).toHaveText('Rápida');
  // salir y volver a la pestaña: el visor se arma de nuevo sin errores
  await page.evaluate(() => { U.tab = 'pbib'; render() });
  await page.evaluate(() => { U.tab = 'p3d'; render() });
  await expect(page.locator('#p3dock .p3b')).toHaveCount(6);
  await expect(page.locator('#p3models .plchip.on')).toHaveCount(1, { timeout: 60_000 });
  noErrors(errors.filter(e => !/Multiple instances of Three/.test(e)), 'modelo 3D');
});
