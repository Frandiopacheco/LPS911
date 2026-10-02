// Componentes comunes y transiciones: entrada suave, ventanas animadas y respeto a "menos movimiento".
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab } from './helpers.js';

test('al cambiar de pestaña el contenido entra con transición suave', async ({ page }) => {
  const errors = await openApp(page);
  await openTab(page, 'restr');
  await expect(page.locator('#main')).toHaveClass(/\bvin\b/);
  const anim = await page.locator('#main').evaluate(el => getComputedStyle(el).animationName);
  expect(anim).toBe('lps-fade');
  noErrors(errors, 'transición');
});

test('ventanas, menús y botones usan las mismas medidas', async ({ page }) => {
  const errors = await openApp(page, { tab: 'lib' });
  await openTab(page, 'lib');
  const all = page.locator('[data-lqall]'); if (await all.count()) await all.click();
  await page.click('[data-lqid="Lpro"]');
  const panel = page.locator('#lqm .lqc');
  await expect(panel).toBeVisible();
  const st = await panel.evaluate(el => { const s = getComputedStyle(el); return { r: s.borderTopLeftRadius, a: s.animationName }; });
  expect(st).toEqual({ r: '14px', a: 'lps-pop' });
  // los botones de acción quedan en filas, no apilados uno por línea
  const tops = await page.locator('#lqm .lqbtns .ib').evaluateAll(bs => bs.map(b => Math.round(b.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBeLessThan(tops.length);
  const radii = await page.locator('#main .ib, #main .tin').evaluateAll(bs => [...new Set(bs.map(b => getComputedStyle(b).borderTopLeftRadius))]);
  expect(radii).toEqual(['8px']);
  noErrors(errors, 'componentes');
});

test('con "reducir movimiento" no hay animaciones', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await openApp(page);
  await openTab(page, 'restr');
  const d = await page.locator('#main').evaluate(el => parseFloat(getComputedStyle(el).animationDuration));
  expect(d).toBeLessThan(0.01);
  noErrors(errors, 'movimiento reducido');
});

test('todas las páginas tienen el mismo encabezado (título, contexto y acciones)', async ({ page }) => {
  const errors = await openApp(page);
  const T = { restr: 'Restricciones', plan: 'Plan semanal', campo: 'Campo', lib: 'Liberaciones', ind: 'Indicadores', planos: 'Sectorización', cfg: 'Configuración', team: 'Equipo' };
  for (const [t, title] of Object.entries(T)) {
    await openTab(page, t);
    await expect(page.locator('#main .phd h2')).toHaveText(title);
  }
  noErrors(errors, 'encabezados');
});

test('las explicaciones largas quedan en una ayuda que se abre', async ({ page }) => {
  const errors = await openApp(page);
  await openTab(page, 'ind');
  const h = page.locator('#main details.hlp');
  await expect(h).not.toHaveAttribute('open', '');
  await h.locator('summary').click();
  await expect(h.locator('.hlpb')).toContainText('PPC diario');
  noErrors(errors, 'ayuda');
});
