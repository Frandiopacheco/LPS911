// Flujos de uso diario: lookahead, restricciones, campo, equipo, "Ver como" y vista celular.
import { test, expect } from '@playwright/test';
import { openApp, expectTabOk, noErrors, HOY, openTab } from './helpers.js';

const get = (page, c, id) => page.evaluate(([c, id]) => window.__dbGet(c, id), [c, id]);
const all = (page, c) => page.evaluate(c => window.__dbAll(c), c);

test('lookahead: renombrar, deshacer y buscar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await openTab(page, 'look');
  const name = page.locator('input[data-a="i0"][data-f="name"]');
  await expect(name).toHaveValue('Redes empotradas');
  await name.fill('Redes empotradas de agua');
  await name.press('Enter');
  await expect.poll(async () => (await get(page, 'acts', 'i0')).name).toBe('Redes empotradas de agua');
  await page.click('#bundo');
  await expect.poll(async () => (await get(page, 'acts', 'i0')).name).toBe('Redes empotradas');
  await page.click('#bredo');
  await expect.poll(async () => (await get(page, 'acts', 'i0')).name).toBe('Redes empotradas de agua');
  await page.fill('#fq', 'tarrajeo');
  await expect(page.locator('input[data-a="i0"][data-f="name"]')).toHaveCount(0);
  await expect(page.locator('input[data-a="t0"][data-f="name"]')).toBeVisible();
  await page.fill('#fq', '');
  await page.click('#fmore');
  await page.click('#fcoll');
  await expectTabOk(page, 'look');
  noErrors(errors, 'lookahead');
});

test('restricciones: crear y editar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr' });
  await openTab(page, 'restr');
  const antes = Object.keys(await all(page, 'restr')).length;
  await page.click('#radd');
  await expect.poll(async () => Object.keys(await all(page, 'restr')).length).toBe(antes + 1);
  const desc = page.locator('input[data-r="r1"][data-f="desc"]');
  await desc.fill('Falta arena fina y cemento');
  await desc.press('Tab');
  await expect.poll(async () => (await get(page, 'restr', 'r1')).desc).toBe('Falta arena fina y cemento');
  await page.click('[data-f="lib"]');
  await page.click('[data-f="all"]');
  await expectTabOk(page, 'restr');
  noErrors(errors, 'restricciones');
});

test('campo: registrar cumplido', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'campo' });
  await openTab(page, 'campo');
  await page.locator('#main [data-st="ok"]').first().click();
  await expect.poll(async () => {
    const d = await all(page, 'daily');
    return Object.values(d).some(x => x.date === HOY && Object.values(x.recs || {}).some(r => r.status === 'ok'));
  }).toBe(true);
  for (const v of ['pend', 'reg', 'prop', 'all']) await page.click(`#main [data-v="${v}"]`);
  await expectTabOk(page, 'campo');
  noErrors(errors, 'campo');
});

test('equipo: el formulario no se borra con la actualización y la búsqueda filtra', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  await openTab(page, 'team');
  await page.fill('#temail', 'nuevo@obra.pe');
  await page.fill('#tname', 'Nuevo Ingeniero');
  // otro usuario cambia algo en la obra → la app se vuelve a dibujar
  await page.evaluate(() => window.firebase.firestore().collection('members').doc('lector@obra.pe').set({ role: 'lector', name: 'Luis L.' }));
  await page.waitForTimeout(300);
  await expect(page.locator('#temail')).toHaveValue('nuevo@obra.pe');
  await expect(page.locator('#tname')).toHaveValue('Nuevo Ingeniero');
  await page.fill('#tq', 'calidad');
  await expect(page.locator('tr[data-tm="calidad@obra.pe"]')).toBeVisible();
  await expect(page.locator('tr[data-tm="editor@obra.pe"]')).toHaveCount(0);
  await page.fill('#tq', '');
  await page.selectOption('#tqrole', 'sc');
  await expect(page.locator('tr[data-tm="sc@obra.pe"]')).toBeVisible();
  await expect(page.locator('tr[data-tm="campo@obra.pe"]')).toHaveCount(0);
  // la ficha (clic en la fila) cambia el nombre
  await page.click('tr[data-tm="sc@obra.pe"]');
  await page.fill('#lqm input[data-f="name"]', 'Sandra S.');
  await page.locator('#lqm input[data-f="name"]').press('Tab');
  await expect.poll(() => page.evaluate(() => window.__dbGet('members', 'sc@obra.pe').name)).toBe('Sandra S.');
  noErrors(errors, 'equipo');
});

test('"Ver como" Calidad y vista celular', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  await openTab(page, 'team');
  await page.click('#bva');
  await page.selectOption('#var', 'area');
  await page.selectOption('#vaa', { label: 'Calidad' });
  await Promise.all([page.waitForEvent('load'), page.click('#pop [data-do="go"]')]);
  await expect(page.locator('#loading')).toHaveCount(0);
  await expect(page.locator('#vabar')).toBeVisible();
  await expect(page.locator('#tabs [data-tab="lib"]')).toBeVisible();
  await expect(page.locator('#tabs [data-tab="campo"]')).toBeHidden();
  await page.click('#vabar [data-va="phone"]');
  await expect(page.locator('#phprev')).toBeVisible();
  const frame = page.frameLocator('#phprev iframe');
  await expect(frame.locator('#bnav')).toBeVisible({ timeout: 15_000 });
  await expect(frame.locator('#vabar')).toHaveCount(0);
  await page.selectOption('#phdev', 'chico');
  const w = await page.locator('#phprev iframe').evaluate(f => f.getBoundingClientRect().width);
  expect(Math.round(w)).toBeLessThanOrEqual(330);
  await page.click('#phx');
  await expect(page.locator('#phprev')).toHaveCount(0);
  noErrors(errors, 'ver como');
});

test('el Lookahead no se vuelve a armar al regresar, pero muestra los cambios hechos mientras tanto', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await page.evaluate(() => { document.getElementById('grid').dataset.marca = '1'; });
  await openTab(page, 'restr');
  await expect(page.locator('main')).toHaveCount(2);
  await page.evaluate(() => window.firebase.firestore().collection('acts').doc('i0').update({ name: 'Redes cambiadas' }));
  await page.waitForTimeout(300);
  await openTab(page, 'look');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('#grid')).toHaveAttribute('data-marca', '1');
  await expect(page.locator('input[data-a="i0"][data-f="name"]')).toHaveValue('Redes cambiadas');
  noErrors(errors, 'lookahead guardado');
});

test('«Ver como» y «Vista celular» están arriba a la derecha desde cualquier pestaña (copia de prueba)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await expect(page.locator('#bvat')).toBeVisible();
  await expect(page.locator('#bpht')).toBeVisible();
  await page.click('#bvat');
  await expect(page.locator('#var')).toBeVisible();
  noErrors(errors, 'ver como arriba');
});

test('el editor no ve «Ver como» arriba', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  await expect(page.locator('#bvat')).toBeHidden();
  noErrors(errors, 'editor sin ver como');
});
