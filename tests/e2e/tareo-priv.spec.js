// Auditoría 21-10-2026: AFP y N.° de hijos van en tperp (el capataz lee el máster tper, pero no esos datos).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const F = (dni, ape, x = {}) => ['tper', dni, { dni, ape, nom: 'ANA', pue: 'OPERARIO', cat: 'OP', cua: 'ALBAÑILES', cap: 'tcap1@obra.pe', ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true, ...x }];
const EXTRA = [['members', 'tcap1@obra.pe', { role: 'tcap', name: 'Tito Capataz' }],
  F('01234567', 'UNO'), F('07777777', 'ANTIGUA', { afp: 'ONP', hij: 3 })];

test('Personal: AFP e hijos se guardan aparte (tperp) y las fichas antiguas se migran', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: EXTRA });
  await page.evaluate(() => { U.mod = 'tar'; U.tab = 'tper'; render(); });
  // la ficha antigua pasa sola a tperp y deja de tener esos datos en tper
  await expect.poll(() => page.evaluate(() => window.__dbGet('tperp', '07777777'))).toMatchObject({ afp: 'ONP', hij: 3 });
  await expect.poll(() => page.evaluate(() => { const t = window.__dbGet('tper', '07777777'); return ['afp' in t, 'hij' in t, t.ape]; })).toEqual([false, false, 'ANTIGUA']);
  // editar: los datos privados se ven en el formulario y se guardan en tperp
  await page.click('[data-tfe="01234567"]');
  await page.selectOption('#tfAfp', 'AFP Prima');
  await page.fill('#tfHij', '2');
  await page.click('#tfOk');
  await expect.poll(() => page.evaluate(() => window.__dbGet('tperp', '01234567'))).toMatchObject({ afp: 'AFP Prima', hij: 2 });
  const t = await page.evaluate(() => window.__dbGet('tper', '01234567'));
  expect(t.afp).toBeUndefined(); expect(t.hij).toBeUndefined();
  await page.click('[data-tfe="07777777"]');
  await expect(page.locator('#tfAfp')).toHaveValue('ONP');
  await expect(page.locator('#tfHij')).toHaveValue('3');
  expect(await page.evaluate(() => tPriv('01234567'))).toEqual({ afp: 'AFP Prima', hij: 2 });
  noErrors(errors, 'datos privados');
});
