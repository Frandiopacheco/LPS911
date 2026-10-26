// P4 (oct 2026): revisión de flujos por ambiente. Los ambientes con trabajo en la semana de revisión (por defecto la siguiente)
// aparecen «por revisar»; «Listo» con un toque; las posibles restricciones (aquí: otro SC en el mismo ambiente y días) se deciden;
// el flujo que falla crea la restricción con su flujo. La tira de 8 puntos aparece en la cabecera del ambiente del Lookahead.
// HOY = jueves 1 oct (semana 58): se revisa la semana 59 (lun 5 – sáb 10 oct).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const L5 = '2026-10-05', M6 = '2026-10-06';
const A = (id, o) => ['acts', id, { ambId: 'a1', sc: 'c1', name: 'Act ' + id, days: [L5], order: 80, ...o }];
const EXTRA = [
  A('f1', { name: 'Montantes', days: [L5, M6] }),
  A('f2', { name: 'Tarrajeo', sc: 'c2', days: [M6] }),          // otro SC el mismo día en a1 → posible restricción de espacio para c1
  ['ambientes', 'a9', { sectorId: 's1', code: 'A-9', name: 'Depósito', order: 90 }],
  A('f3', { name: 'Pruebas', ambId: 'a9', days: [M6] }),        // a9 · c1 sin sugerencias → «Listo» directo
];
const doc = (page, id) => page.evaluate(i => window.__dbGet('frev', i), id);
/* estas pruebas usan la semana 2 (la siguiente); por defecto se revisa la 3 (25-10-2026) */
const sem2 = async page => { await page.evaluate(() => { const p = S.meta.get('project'); S.meta.set('project', { ...p, frevW: 2 }); requestRender(); }); await expect.poll(() => page.evaluate(() => frevW())).toBe(2); };

test('revisión de flujos: listo con un toque, decidir lo posible y crear la restricción del flujo que falla', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr', extra: EXTRA });
  await sem2(page);
  await expect.poll(() => page.evaluate(() => typeof frevList === 'function' && frevList().some(e => e.amb === 'a1' && e.sc === 'c1'))).toBe(true);
  const e = await page.evaluate(() => { const x = frevList().find(e => e.amb === 'a1' && e.sc === 'c1'); return { n: x.n, sug: x.sug }; });
  expect(e.n).toBe(59);
  expect(e.sug.fre.join(' ')).toContain('mismo ambiente');
  await page.locator('#rfrev').click();
  await expect(page.locator('#frv')).toBeVisible();
  // a9 · c1: sin sugerencias → «Listo» directo
  await page.locator('#frv [data-frok="59_a9_c1"]').click();
  await expect.poll(() => doc(page, '59_a9_c1')).toMatchObject({ st: 'ok', n: 59, sc: 'c1' });
  // a1 · c1: tiene una posible → se abre, se da por bien el frente y se guarda
  await page.locator('#frv [data-frsel="59_a1_c1"]').click();
  // todo arranca en «Bien» (25-10-2026): la posible se ve como aviso en su flujo
  await expect(page.locator('#frv .frf.fs-sug')).toHaveCount(0);
  await expect(page.locator('#frv [data-frrow="fre"] .frsug', { hasText: 'mismo ambiente' }).first()).toBeVisible();
  await expect(page.locator('#frv [data-frrow="fre"] [data-frf="fre|ok"]')).toHaveClass(/on/);
  await page.locator('#frv').evaluate(el => { el.__mismo = el.querySelector('.pwdlg'); });
  await page.locator('#frv [data-frf="fre|ok"]').click();
  expect(await page.locator('#frv').evaluate(el => el.__mismo === el.querySelector('.pwdlg'))).toBe(true); // «Bien» no redibuja la ventana
  await page.locator('#frv [data-frsave]').click();
  await expect.poll(() => (doc(page, '59_a1_c1'))).toMatchObject({ st: 'ok' });
  expect((await doc(page, '59_a1_c1')).f.fre).toBe('ok');
  // a1 · c2: falta material → crea la restricción con su flujo y la revisión queda parcial
  await page.evaluate(() => frevOpen({ amb: 'a1' }));
  await page.locator('#frv [data-frsel="59_a1_c2"]').click();
  await page.locator('#frv [data-frf="mat|res"]').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('restr')).filter(r => r.via === 'flujos').length)).toBe(1);
  const r = Object.values(await page.evaluate(() => window.__dbAll('restr'))).find(r => r.via === 'flujos');
  expect(r).toMatchObject({ actId: 'f2', flujo: 'mat', sc: 'c2', status: 'pend' });
  expect(await doc(page, '59_a1_c2')).toMatchObject({ parcial: true, f: { mat: 'res' } });
  noErrors(errors, 'revisión de flujos');
});

test('revisión de flujos: el SC ve solo lo suyo; la tira aparece en el Lookahead', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: EXTRA });
  await sem2(page);
  // la tira solo se ve con el «Asistente de prog.» encendido
  await page.evaluate(() => { U.lkGh = false; requestRender(); });
  await expect(page.locator('#grid [data-fstrip="a1"]')).toHaveCount(0);
  await page.evaluate(() => { U.lkGh = true; requestRender(); });
  await expect.poll(() => page.evaluate(() => typeof frevPend === 'function' && frevPend().length)).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => frevPend().every(e => e.sc === 'c1'))).toBe(true);
  expect(await page.evaluate(() => canFrev('c2'))).toBe(false);
  await expect(page.locator('#grid [data-fstrip="a1"]').first()).toBeVisible();
  await page.locator('#grid [data-fstrip="a1"]').first().click();
  await expect(page.locator('#frv')).toBeVisible();
  noErrors(errors, 'revisión de flujos SC');
});

test('revisión de flujos: por defecto se revisa la semana 3 del lookahead (en la 58, la 60)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr', extra: EXTRA });
  expect(await page.evaluate(() => [frevW(), frevWeeks()])).toEqual([3, [60]]);
  noErrors(errors, 'semana de revisión');
});
