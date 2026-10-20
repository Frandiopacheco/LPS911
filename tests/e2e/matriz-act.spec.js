// Matriz 19/10/2026: «Por actividad» (opción A), PC sin «Editar», «Solo lo que falta», nombres en horizontal,
// rellenar arrastrando y R1 (volver a Pendiente al programar una actividad que la Matriz da por terminada).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  ['mamb', 'a1', { c: { k1: 'p' }, by: 'x', t: 1 }], ['mamb', 'a2', { c: { k1: 'p' }, by: 'x', t: 1 }], ['mamb', 'a3', { c: { k1: 't' }, by: 'x', t: 1 }],
];

test('SC › Por actividad: un toque guarda y con casillas marca varios a la vez (Deshacer)', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mat', extra: CAT });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'act'; render(); });
  await expect(page.locator('[data-mxac="k2"]')).toHaveCount(0); // otra partida
  await page.click('[data-mxaa="a1"] [data-mxas="c"]');
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a1').c.k1)).toBe('c');
  await page.check('[data-mxack="a1"]');
  await page.check('[data-mxack="a2"]');
  await page.click('[data-mxab="t"]');
  await expect.poll(() => page.evaluate(() => [__dbGet('mamb', 'a1').c.k1, __dbGet('mamb', 'a2').c.k1])).toEqual(['t', 't']);
  expect(await page.evaluate(() => Object.values(__dbAll('mlog')).filter(l => l.to === 't').length)).toBe(2); // constancia por celda
  await expect(page.locator('#mxaprog')).toHaveCount(0); // el aviso de avance se quita al terminar
  await page.check('#mxadone');
  await expect(page.locator('[data-mxaa]')).toHaveCount(0);
  noErrors(errors, 'por actividad SC');
});

test('editor en la PC: sin botón Editar; «Solo lo que falta»; nombres en horizontal con pocas columnas', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: CAT });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'mat'; render(); });
  await expect(page.locator('#mxt')).toBeVisible();
  await expect(page.locator('#mxedit')).toHaveCount(0);
  await expect(page.locator('#mxt')).toHaveClass(/mxhz/);
  // solo lo que falta: con el SC c1, a3 (terminado) sale de la tabla
  await page.evaluate(() => { U.mxSc = ['c1']; render(); });
  await expect(page.locator('#mxt tr[data-amb="a3"]')).toHaveCount(1);
  await page.check('#mxfalta');
  await expect(page.locator('#mxt tr[data-amb="a3"]')).toHaveCount(0);
  noErrors(errors, 'PC');
});

test('R1: nombrar una fila con una actividad terminada en la Matriz ofrece volverla a Pendiente', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: CAT });
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { U.piso = ''; render(); });
  await page.evaluate(() => { const x = { id: 'nr1', ambId: 'a3', sc: 'c1', name: 'Redes empotradas', days: [], order: 99 }; return mxReopenAsk(x); });
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a3').c.k1)).toBe('p');
  noErrors(errors, 'R1');
});

test('R1 del SC: vuelve a Pendiente en su partida (con su constancia)', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: CAT });
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { const x = { id: 'nr2', ambId: 'a3', sc: 'c1', name: 'Redes empotradas', days: [], order: 99 }; return mxReopenAsk(x); });
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a3').c.k1)).toBe('p');
  noErrors(errors, 'R1 SC');
});

test('Por actividad › ingeniero: filtra por subcontratista y busca la actividad', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: [...CAT, ['mamb', 'a1', { c: { k1: 'p', k2: 'p' }, by: 'x', t: 1 }]] });
  await page.evaluate(() => { U.piso = ''; U.mxSc = []; U.mxV = 'act'; render(); });
  await expect(page.locator('[data-mxac="k2"]')).toBeVisible();
  await page.fill('#mxaq', 'redes');
  await expect(page.locator('[data-mxac="k2"]')).toBeHidden();
  await expect(page.locator('[data-mxac="k1"]')).toBeVisible();
  await page.fill('#mxaq', '');
  await page.click('#mxscdd');
  await page.click('#pop [data-mxsk="c3"]');
  await expect(page.locator('[data-mxac="k1"]')).toHaveCount(0);
  await expect(page.locator('[data-mxac="k2"]')).toHaveClass(/on/);
  noErrors(errors, 'filtro por actividad');
});

// auditoría 19/10: R1 no deja dos filas iguales; las vencidas siguen siendo historial
const R1 = (oldDays) => [['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }], ['mamb', 'a3', { c: { k1: 't' }, by: 'x', t: 1 }],
  ['acts', 'i2', { ambId: 'a3', sc: 'c1', name: 'REDES EMPOTRADAS', und: 'pto', days: ['2025-01-06'], order: 10 }], // la de la obra de prueba, vencida
  ['acts', 'old1', { ambId: 'a3', pisoId: 'p2', sc: 'c1', name: 'Redes empotradas', und: 'glb', days: oldDays, order: 90 }]];
async function nameNew(page) {
  await page.evaluate(() => addAct('a3'));
  const id = await expect.poll(() => page.evaluate(() => ([...S.act.values()].find(x => x.ambId === 'a3' && !x.name) || {}).id)).not.toBeUndefined().then(() => page.evaluate(() => [...S.act.values()].find(x => x.ambId === 'a3' && !x.name).id));
  const inp = page.locator(`[data-a="${id}"][data-f="name"]`);
  await inp.fill('Redes empotradas'); await inp.press('Enter');
  return id;
}
test('R1 con una fila existente sin días: se usa esa y se quita la nueva (una sola fila a la vista)', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: R1([]) });
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { U.piso = ''; render(); });
  await expect(page.locator('#grid tr[data-a="old1"]')).toHaveCount(0); // oculta: la Matriz la da por terminada
  const id = await nameNew(page);
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a3').c.k1)).toBe('p');
  await expect.poll(() => page.evaluate(i => !!(__dbGet('acts', i) || {}).arch, id)).toBe(true);
  await expect(page.locator('#grid tr[data-a="old1"]')).toHaveCount(1);
  await expect(page.locator(`#grid tr[data-a="${id}"]`)).toHaveCount(0);
  noErrors(errors, 'R1 fila existente');
});
test('R1 con la fila antigua vencida: queda como historial oculto y se programa en la nueva', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: R1(['2025-01-06']) });
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { U.piso = ''; U.showPast = false; render(); });
  const id = await nameNew(page);
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a3').c.k1)).toBe('p');
  expect(await page.evaluate(i => !!(__dbGet('acts', i) || {}).arch, id)).toBe(false);
  await expect(page.locator(`#grid tr[data-a="${id}"]`)).toHaveCount(1);
  await expect(page.locator('#grid tr[data-a="old1"]')).toHaveCount(0); // vencida
  noErrors(errors, 'R1 vencida');
});

test('Por actividad › SC: si una escritura falla, dice cuántas no se guardaron', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mat', extra: CAT });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'act'; render();
    const orig = window.mxScSet; window.mxScSet = async (a, ...r) => { if (a === 'a2') throw { code: 'unavailable' }; return orig(a, ...r); }; });
  await page.check('[data-mxack="a1"]');
  await page.check('[data-mxack="a2"]');
  await page.click('[data-mxab="c"]');
  await expect(page.locator('#toast, .toast').first()).toContainText('1 no se guardaron');
  await expect(page.locator('#mxaprog')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a1').c.k1)).toBe('c');
  noErrors(errors, 'falla parcial');
});

test('filas con otro SC: «Ver en el Lookahead» abre la búsqueda de esa actividad', async ({ page }) => {
  const extra = [...CAT, ['acts', 'cross', { ambId: 'a1', sc: 'c3', name: 'Redes empotradas', und: 'pto', days: [], order: 40 }]];
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'mat'; render(); });
  await page.click('#mxsmis');
  await page.click('[data-mxslk="0"]');
  await expect.poll(() => page.evaluate(() => [U.tab, U.q])).toEqual(['look', 'Redes empotradas']);
  await expect(page.locator('#fq')).toHaveValue('Redes empotradas');
  await expect(page.locator('#grid tr[data-a="cross"]')).toHaveCount(1);
  noErrors(errors, 'ver en lookahead');
});
