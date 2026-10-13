// Indicadores › Diario: semáforo de cumplimiento por subcontratista (≥ 80 % / 50–80 % / < 50 %), imputable vs no imputable
// al SC, filtro por SC en «Incumplimientos del día» y presentación del día (ind-dia.js, modo 'dia' de #ipr).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const rec = o => ({ status: 'ok', prog: 10, und: 'm2', exec: 10, cnc: '', imp: null, note: '', done: false, photos: [], by: 'campo@obra.pe', ts: 1, ...o });
const act = (id, sc, name, ambId = 'a1') => ['acts', id, { ambId, sc, name, und: 'm2', metrado: 10, days: [HOY], qty: { [HOY]: 10 }, order: 50 }];
/* c1 SANITARIAS: i0 e i1 ya vienen del Firebase falso (Dpto 101 y 102, hoy) → las dos Sí = 100 %  → «Cumplieron»
   c2 ELECTRICAS: e0 Sí, e1 No (imputable)                                      = 50 %          → «Parcial»
   c3 TARRAJEO:   k1 No (imputable), k2 No (ajeno al SC), k3 Sí                  = 33 % bruto · 50 % del SC → «Crítico» / «Parcial» */
const PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const EXTRA = [
  ['fotos', 'ph1', { data: PX, kind: 'rec' }],
  act('k1', 'c3', 'Tarrajeo de cielo raso'), act('k2', 'c3', 'Tarrajeo de columnas', 'a2'), act('k3', 'c3', 'Tarrajeo de vigas'),
  ['daily', HOY + '_p1', { date: HOY, pisoId: 'p1', recs: {
    i0: rec({ sc: 'c1', nm: 'Redes empotradas', ambId: 'a1' }), i1: rec({ sc: 'c1', nm: 'Redes empotradas', ambId: 'a2' }),
    e0: rec({ sc: 'c2', nm: 'Entubado empotrado', ambId: 'a1' }),
    e1: rec({ sc: 'c2', nm: 'Entubado empotrado', ambId: 'a2', status: 'no', exec: 0, cnc: 'Materiales', imp: true, note: 'No llegó el tubo' }),
    k1: rec({ sc: 'c3', nm: 'Tarrajeo de cielo raso', ambId: 'a1', status: 'no', exec: 0, cnc: 'Personal', imp: true, note: 'Faltó cuadrilla', photos: ['ph1'] }),
    k2: rec({ sc: 'c3', nm: 'Tarrajeo de columnas', ambId: 'a2', status: 'no', exec: 0, cnc: 'Frente no entregado', imp: false, note: 'Aún sin liberar' }),
    k3: rec({ sc: 'c3', nm: 'Tarrajeo de vigas', ambId: 'a1' }),
  }, extra: {} }],
];
const grp = (page, k) => page.locator(`#main .ixd-grp.${k}`);

test('Semáforo: cumplieron / parcial / crítico, imputable vs no, y filtro por SC', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  const errors = await openApp(page, { tab: 'ind', extra: EXTRA });
  await page.evaluate(() => { U.indMode = 'dia'; U.piso = 'p1'; render(); });
  const card = page.locator('#main .ixd');
  await expect(card).toContainText('Cumplimiento del día por subcontratista');
  await expect(grp(page, 'ok')).toContainText('SC SANITARIAS');
  await expect(grp(page, 'ok')).toContainText('100%');
  await expect(grp(page, 'warn')).toContainText('SC ELECTRICAS');
  await expect(grp(page, 'bad')).toContainText('SC TARRAJEO');
  await expect(grp(page, 'bad')).toContainText('33%');
  // lo no imputable va rayado en la barra del SC crítico
  await expect(grp(page, 'bad').locator('.gh')).toHaveCount(1);
  await expect(grp(page, 'ok').locator('.gh')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/ind-dia-semaforo.png' });
  // clasificar por PPC del SC: lo ajeno al SC no cuenta → TARRAJEO sube a 50 % (parcial)
  await page.locator('#ixm [data-xm="sc"]').click();
  await expect(grp(page, 'bad')).toHaveCount(0);
  await expect(grp(page, 'warn')).toContainText('SC TARRAJEO');
  await page.locator('#ixm [data-xm="br"]').click();
  await expect(grp(page, 'bad')).toContainText('SC TARRAJEO');
  // tocar un SC filtra «Incumplimientos del día»
  await expect(page.locator('#ixinc tbody tr')).toHaveCount(3);
  await grp(page, 'bad').locator('[data-ixsc]').click();
  await expect(page.locator('#ixinc tbody tr')).toHaveCount(2);
  await expect(page.locator('#ixinc')).not.toContainText('No llegó el tubo');
  await expect(page.locator('#ixinc .dpill')).toContainText('SC TARRAJEO');
  await page.locator('#ixscx').click();
  await expect(page.locator('#ixinc tbody tr')).toHaveCount(3);
  noErrors(errors, 'semáforo diario');
});

test('Presentar el día: resumen, subcontratistas, a verificar y causas (imputables vs no)', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const errors = await openApp(page, { tab: 'ind', extra: EXTRA });
  await page.evaluate(() => { U.indMode = 'dia'; U.piso = 'p1'; render(); });
  await page.locator('#bipr').click();
  const ipr = page.locator('#ipr');
  await expect(ipr).toBeVisible();
  // 7 verificadas, 4 Sí (i0, i1, e0, k3) → 57 %
  await expect(ipr.locator('.iprring b')).toHaveText('57%');
  await expect(ipr).toContainText('Cumplimiento del día');
  await expect(ipr.locator('.ixd-c.bad')).toContainText('SC TARRAJEO');
  await expect(ipr.locator('.ixd-split .i')).toHaveText('2');   // imputables: e1, k1
  await expect(ipr.locator('.ixd-split .n')).toHaveText('1');   // no imputable: k2
  await page.screenshot({ path: 'test-results/ind-dia-resumen.png' });
  await page.keyboard.press('ArrowRight');
  await expect(ipr).toContainText('Cumplimiento por subcontratista');
  await expect(ipr.locator('.ixd-grp.bad')).toContainText('SC TARRAJEO');
  await page.screenshot({ path: 'test-results/ind-dia-sc.png' });
  await page.keyboard.press('ArrowRight');
  await expect(ipr).toContainText('PPC por piso');
  await page.keyboard.press('ArrowRight');
  await expect(ipr.locator('.ixd-cc')).toHaveCount(1);
  await expect(ipr.locator('.ixd-cc')).toContainText('Faltó cuadrilla');
  await expect(ipr.locator('.ixd-cc .ixd-tag.imp')).toHaveCount(1);
  await expect(ipr.locator('.ixd-cc .ixd-ph img')).toHaveCount(1);   // foto del incumplimiento (k1)
  await ipr.locator('.ixd-cc .ixd-ph img').click();
  await expect(page.locator('.lb img')).toBeVisible();
  await page.locator('.lb [data-x]').click();
  await expect(ipr).toBeVisible();
  await expect(ipr.locator('.ixd-cc .ixd-tag.nimp')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/ind-dia-criticos.png' });
  await page.keyboard.press('ArrowRight');
  await expect(ipr).toContainText('Imputables al subcontratista');
  await expect(ipr).toContainText('PROG · Programación');
  await page.screenshot({ path: 'test-results/ind-dia-causas.png' });
  // clasificar por PPC del SC: ya no hay críticos
  await ipr.locator('#iprxm [data-xm="sc"]').click();
  await ipr.locator('[data-pg="3"]').click();
  await expect(ipr).toContainText('Ningún subcontratista quedó en crítico');
  // día anterior y vuelta a hoy
  await ipr.locator('[data-ip="dp"]').click();
  await expect(ipr.locator('.iprt small')).not.toContainText('hoy');
  await ipr.locator('[data-ip="dt"]').click();
  await expect(ipr.locator('.iprt small')).toContainText('hoy');
  await page.keyboard.press('Escape');
  await expect(ipr).toHaveCount(0);
  await expect(page.locator('#main')).toContainText('Cumplimiento del día por subcontratista');
  noErrors(errors, 'presentación del día');
});

test('Presentar el día en modo oscuro y sin actividades', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const errors = await openApp(page, { tab: 'ind', theme: 'dark', extra: EXTRA });
  await page.evaluate(() => { U.indMode = 'dia'; U.piso = 'p1'; render(); });
  await page.locator('#bipr').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/ind-dia-oscuro.png' });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/ind-dia-oscuro-sc.png' });
  // un día sin nada programado en el piso
  await page.evaluate(() => { daySet('2026-09-26'); requestRender(); });
  await expect(page.locator('#ipr')).toContainText('No hay actividades programadas');
  noErrors(errors, 'presentación del día oscuro');
});

test('Presentar el día: tocar una barra filtra todas las láminas (subcontratista y piso) y se quita', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const errors = await openApp(page, { tab: 'ind', extra: EXTRA });
  await page.evaluate(() => { U.indMode = 'dia'; U.piso = ''; render(); });
  await page.locator('#bipr').click();
  const ipr = page.locator('#ipr');
  await expect(ipr.locator('.ixd-flt.hint')).toBeVisible();
  // lámina Por piso: el comparativo trae el piso con actividades
  await ipr.locator('[data-pg="2"]').click();
  await expect(ipr).toContainText('PPC por piso');
  await expect(ipr.locator('[data-ixpi]').first()).toBeVisible();
  // tocar un subcontratista: el resumen pasa a ser solo de él (SC TARRAJEO: 1 de 3 = 33 %)
  await ipr.locator('[data-pg="1"]').click();
  await ipr.locator('[data-ixsc="c3"]').click();
  await expect(ipr.locator('.ixd-fc')).toContainText('SC TARRAJEO');
  await ipr.locator('[data-pg="0"]').click();
  await expect(ipr.locator('.iprring b')).toHaveText('33%');
  // las barras de los demás siguen visibles en su lámina, atenuadas
  await ipr.locator('[data-pg="1"]').click();
  await expect(ipr.locator('[data-ixsc="c1"]')).toHaveClass(/dim/);
  // tocar piso y quitar todo
  await ipr.locator('[data-pg="2"]').click();
  await ipr.locator('[data-ixpi]').first().click();
  await expect(ipr.locator('.ixd-fc')).toHaveCount(2);
  await ipr.locator('[data-ip="fclr"]').click();
  await expect(ipr.locator('.ixd-flt.hint')).toBeVisible();
  await ipr.locator('[data-pg="0"]').click();
  await expect(ipr.locator('.iprring b')).toHaveText('57%');
  noErrors(errors, 'filtros cruzados');
});

test('Indicadores › Cliente: solo el administrador lo ve; muestra el PPC contra lo emitido y no aparece en Semanal', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  const errors = await openApp(page, { tab: 'ind' });
  await expect(page.locator('#imode [data-m="cli"]')).toBeVisible();
  await page.locator('#imode [data-m="cli"]').click();
  await expect(page.locator('#main')).toContainText('PPC del cliente');
  await expect(page.locator('#main .tile').first()).toContainText('PPC del cliente');
  await expect(page.locator('#imode [data-m="cli"]')).toHaveClass(/on/);
  await expect(page.locator('#bipr')).toHaveCount(0);
  await page.locator('#imode [data-m="sem"]').click();
  await expect(page.locator('#main')).not.toContainText('PPC del cliente ·');
  await expect(page.locator('#main .card').filter({ hasText: 'contra la versión emitida' })).toHaveCount(0);
  noErrors(errors, 'indicadores cliente');
});

test('Indicadores › Cliente: un editor no ve la pestaña y un modo guardado cae en Diario', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind', as: 'editor' });
  await page.evaluate(() => { U.indMode = 'cli'; render(); });
  await expect(page.locator('#imode [data-m="cli"]')).toHaveCount(0);
  await expect(page.locator('#imode [data-m="dia"]')).toHaveClass(/on/);
  noErrors(errors, 'indicadores cliente editor');
});

test('PPC histórico a mano: se lee el texto, se guarda y se grafica en Semanal y Cliente (el dato manual manda sobre el congelado)', async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 900 });
  const errors = await openApp(page, { tab: 'ind' });
  // lectura del texto: %, fracción, coma decimal, «-» = sin dato y líneas inválidas
  const r = await page.evaluate(() => ppcHistParse('52  84  80\nS53 0,86 -\n54 90%\n55 150 10\nxx 1 2\n56 - -'));
  expect(r.h).toEqual({ 52: { a: 0.84, c: 0.8 }, 53: { a: 0.86 }, 54: { a: 0.9 } });
  expect(r.bad).toHaveLength(3);
  // guardar desde la ventana (en las pruebas pasa por prompt)
  await page.locator('#imode [data-m="sem"]').click();
  page.once('dialog', d => d.accept('52  84  80\n53  86  -'));
  await page.locator('#bppch').click();
  await expect.poll(() => page.evaluate(() => (window.__dbGet('meta', 'project') || {}).ppcHist)).toEqual({ 52: { a: 0.84, c: 0.8 }, 53: { a: 0.86 } });
  const pts = await page.evaluate(() => ppcHistAll([]).map(p => [p.label, p.a, p.b, p.man]));
  expect(pts).toEqual([['S52', 0.84, null, true], ['S53', 0.86, null, true]]);
  await expect(page.locator('#main .chart svg text', { hasText: 'S52' })).toHaveCount(1);
  // pestaña Cliente: S52 con cliente 80 % e interno 84 %
  await page.locator('#imode [data-m="cli"]').click();
  await expect(page.locator('#main .chart svg text', { hasText: 'S52' })).toHaveCount(1);
  await expect(page.locator('#main .tile').first()).toContainText('80%');
  // un editor no ve el botón
  noErrors(errors, 'ppc histórico a mano');
});
