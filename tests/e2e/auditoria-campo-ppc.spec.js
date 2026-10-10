// Informe externo «Campo, PPC semanal e Indicadores» (ChatGPT, 13 puntos): una prueba por punto.
// El punto 4 (cierre automático del servidor) se prueba en functions/test/lib.test.js.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

/* actividad propia de las pruebas: 10 m2 hoy en el Dpto 101 (P1 · S1), del SC de sanitarias */
const X1 = { ambId: 'a1', sc: 'c1', name: 'Prueba auditada', und: 'm2', metrado: 10, days: [HOY], qty: { [HOY]: 10 }, order: 40 };
const act = (id, o = {}) => ['acts', id, { ...X1, ...o }];
const daily = recs => ['daily', HOY + '_p1', { date: HOY, pisoId: 'p1', recs }];
const rec = o => ({ status: 'ok', prog: 10, und: 'm2', exec: 10, cnc: '', imp: null, note: '', done: false, photos: [], sc: 'c1', nm: 'Prueba auditada', ambId: 'a1', by: 'campo@obra.pe', ts: 1, ...o });
const items = { x1: { sc: 'c1', sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Prueba auditada', days: [HOY], ord: 1 } };
const week = (o = {}) => ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-28T08:00:00.000Z', items, res: {}, snap: {}, ...o }];
const card = (page, id) => page.locator(`#main article[data-a="${id}"]`);
const getRec = (page, id) => page.evaluate(([d, id]) => ((window.__dbGet('daily', d + '_p1') || {}).recs || {})[id], [HOY, id]);

test('1 · «Listo» cierra la ficha sin dar la actividad por terminada', async ({ page }) => {
  const errors = await openApp(page, { tab: 'campo', extra: [act('x1', { days: [HOY, MANANA], qty: { [HOY]: 5, [MANANA]: 5 } })] });
  await card(page, 'x1').locator('[data-st="no"]').click();
  await card(page, 'x1').locator('.cdet button.pri', { hasText: 'Listo' }).click();
  await expect(card(page, 'x1').locator('.cdet')).toHaveCount(0);
  const r = await getRec(page, 'x1');
  expect(r.status).toBe('no');
  expect(r.done).toBeFalsy();
  expect(await page.evaluate(d => schedOn(S.act.get('x1'), d), MANANA)).toBe(true);
  noErrors(errors, 'listo');
});

test('2 · Descongelar guarda la versión evaluada y se puede recuperar después de recargar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [act('x1'), week({ res: { x1: { ok: false, cnc: 'Materiales', note: 'No llegó', mit: 'Pedir antes' } } })] });
  const sec = page.locator('section[data-pid="p1"]');
  await sec.locator('[data-unfreeze]').click();
  await sec.locator('[data-unfreeze]').click();
  await expect.poll(() => page.evaluate(() => !!(window.__dbGet('weeks', '58_p1') || {}).frozenAt)).toBe(false);
  const hist = await page.evaluate(() => Object.values(window.__dbAll('weeks')).filter(w => w.histOf === '58_p1'));
  expect(hist.length).toBe(1);
  expect(hist[0].v.res.x1).toMatchObject({ ok: false, note: 'No llegó', mit: 'Pedir antes' });
  await page.reload();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15_000 });
  await page.locator('section[data-pid="p1"] [data-wkrest]').click();
  await expect.poll(() => page.evaluate(() => (window.__dbGet('weeks', '58_p1') || {}).res?.x1?.mit)).toBe('Pedir antes');
  expect(await page.evaluate(() => !!window.__dbGet('weeks', '58_p1').frozenAt)).toBe(true);
  noErrors(errors, 'descongelar');
});

test('3 · Quitar una foto o el registro no borra las fotos', async ({ page }) => {
  const errors = await openApp(page, { tab: 'campo', extra: [act('x1'), ['fotos', 'ph1', { data: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }], ['fotos', 'ph2', { data: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }],
    daily({ x1: rec({ status: 'no', exec: 0, cnc: 'Materiales', photos: ['ph1', 'ph2'] }) })] });
  await card(page, 'x1').locator('[data-more]').click();
  await card(page, 'x1').locator('[data-phdel="ph2"]').click();
  await expect.poll(async () => (await getRec(page, 'x1')).photos).toEqual(['ph1']);
  await card(page, 'x1').locator('[data-more]').click();
  await card(page, 'x1').locator('[data-cclear]').click();
  await expect.poll(async () => (await getRec(page, 'x1')).clr).toBe(true);
  const r = await getRec(page, 'x1');
  expect(r.photos).toEqual([]);
  expect([...r.phQ].sort()).toEqual(['ph1', 'ph2']);
  expect(await page.evaluate(() => [!!window.__dbGet('fotos', 'ph1'), !!window.__dbGet('fotos', 'ph2')])).toEqual([true, true]);
  noErrors(errors, 'fotos');
});

test('5 · Guardar la mitigación no pisa la causa que otra persona cambió (copia atrasada)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [act('x1'), week({ res: { x1: { ok: false, cnc: 'Materiales', note: 'Nota inicial', mit: '' } } })] });
  /* otra sesión cambia la causa (detalle) */
  await page.evaluate(() => fcol('weeks').doc('58_p1').update(new firebase.firestore.FieldPath('res', 'x1', 'note'), 'Nota nueva'));
  await expect.poll(() => page.evaluate(() => S.wk.get('58_p1').res.x1.note)).toBe('Nota nueva');
  /* esta sesión todavía tiene la copia vieja */
  await page.evaluate(() => { S.wk.get('58_p1').res.x1.note = 'Nota inicial'; });
  await page.evaluate(() => { const w = S.wk.get('58_p1'); setRes(58, 'p1', 'x1', { ...w.res.x1, mit: 'Acción nueva' }); });
  await expect.poll(() => page.evaluate(() => window.__dbGet('weeks', '58_p1').res.x1.mit)).toBe('Acción nueva');
  expect(await page.evaluate(() => window.__dbGet('weeks', '58_p1').res.x1.note)).toBe('Nota nueva');
  noErrors(errors, 'res por campo');
});

test('6 · Congelar desde una copia atrasada no reemplaza la congelación vigente ni su evaluación', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [act('x1')] });
  /* otra persona congela y evalúa */
  await page.evaluate(([items]) => fcol('weeks').doc('58_p1').set({ n: 58, pisoId: 'p1', frozenAt: '2026-10-01T13:00:00.000Z', items, res: { x1: { ok: true } }, snap: {} }), [items]);
  await expect.poll(() => page.evaluate(() => !!S.wk.get('58_p1'))).toBe(true);
  /* esta sesión todavía no lo ve */
  await page.evaluate(() => { S.wk.delete('58_p1'); render(); });
  await page.locator('section[data-pid="p1"] [data-freeze]').click();
  await expect(page.locator('#toast, .toast').first()).toContainText(/ya estaba congelada/);
  const w = await page.evaluate(() => window.__dbGet('weeks', '58_p1'));
  expect(w.frozenAt).toBe('2026-10-01T13:00:00.000Z');
  expect(w.res.x1.ok).toBe(true);
  noErrors(errors, 'congelar');
});

test('7 · Reprogramar lo no ejecutado traslada el saldo sin duplicar el metrado', async ({ page }) => {
  const errors = await openApp(page, { tab: 'campo', extra: [act('x1'), daily({ x1: rec({ status: 'no', exec: null, cnc: 'Materiales' }) })] });
  await card(page, 'x1').locator('[data-more]').click();
  await card(page, 'x1').locator('[data-crep]').click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 'x1').days)).toEqual([HOY, MANANA]);
  expect(await page.evaluate(() => progSum(window.__dbGet('acts', 'x1')))).toBe(10);
  expect(await page.evaluate(d => window.__dbGet('acts', 'x1').qty[d], MANANA)).toBe(10);
  /* el registro del día conserva lo comprometido aunque después se edite */
  await card(page, 'x1').locator('[data-cnote]').fill('Sin tubería');
  await card(page, 'x1').locator('[data-cnote]').blur();
  await expect.poll(async () => (await getRec(page, 'x1')).note).toBe('Sin tubería');
  expect((await getRec(page, 'x1')).prog).toBe(10);
  noErrors(errors, 'reprogramar');
});

test('8 · Cambiar la partida de una actividad no pasa su incumplimiento a la empresa nueva', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind', extra: [act('x1'), daily({ x1: rec({ status: 'no', exec: 0, cnc: 'Materiales' }) })] });
  await page.evaluate(() => fcol('acts').doc('x1').update({ sc: 'c2' }));
  await expect.poll(() => page.evaluate(() => S.act.get('x1').sc)).toBe('c2');
  const sc = await page.evaluate(d => { const o = dayData([d], new Set(['p1'])).scA; return [o.c1 ? o.c1.no : 0, o.c2 ? o.c2.no : 0]; }, HOY);
  expect(sc).toEqual([1, 0]);
  noErrors(errors, 'sc histórico');
});

test('9 · «Confirmar» con un sector filtrado no confirma cierres de otros sectores', async ({ page }) => {
  const lv = id => ['live', HOY + '_' + id, { date: HOY, actId: id, pisoId: 'p1', sc: 'c1', close: { status: 'ok', by: 'cap1', n: 'Pedro', t: 1 } }];
  const errors = await openApp(page, { tab: 'campo', extra: [
    ['sectors', 's9', { pisoId: 'p1', code: 'S9', name: 'Sector 9', order: 9 }], ['ambientes', 'a9', { sectorId: 's9', code: 'A-9', name: 'Dpto 109', order: 9 }],
    act('x1'), act('x9', { ambId: 'a9' }), lv('x1'), lv('x9')] });
  await page.evaluate(() => { CU.sec = 's1'; CU.sc = ''; render(); });
  await expect(card(page, 'x9')).toHaveCount(0);
  await page.locator('[data-cconfsc="c1"]').click();
  await expect.poll(async () => (await getRec(page, 'x1'))?.status).toBe('ok');
  expect(await getRec(page, 'x9')).toBeUndefined();
  noErrors(errors, 'confirmar visibles');
});

test('10 · Bajar lo ejecutado de un «Cumplido»: excepción con motivo o pasa a «No cumplido»', async ({ page }) => {
  const errors = await openApp(page, { tab: 'campo', extra: [act('x1'), act('x2', { name: 'Otra prueba' }), daily({ x1: rec({}), x2: rec({ nm: 'Otra prueba' }) })] });
  /* x1: excepción con motivo → sigue Cumplido y el PPC semanal lo sugiere como cumplido */
  await card(page, 'x1').locator('[data-more]').click();
  await card(page, 'x1').locator('[data-cexec]').fill('3');
  await card(page, 'x1').locator('[data-cexec]').blur();
  await page.locator('#pop [data-do="exc"]').click(); // sin motivo: lo vuelve a pedir
  await page.locator('#pop #excm').fill('Supervisión aceptó el paño');
  await page.locator('#pop [data-do="exc"]').click();
  await expect.poll(async () => (await getRec(page, 'x1')).exc).toBe('Supervisión aceptó el paño');
  expect(await getRec(page, 'x1')).toMatchObject({ status: 'ok', exec: 3 });
  expect(await page.evaluate(d => fieldSug('x1', { days: [d], q: 10, qd: { [d]: 10 } }).ok, HOY)).toBe(true);
  /* x2: sin excepción → No cumplido */
  await card(page, 'x2').locator('[data-more]').click();
  await card(page, 'x2').locator('[data-cexec]').fill('3');
  await card(page, 'x2').locator('[data-cexec]').blur();
  await page.locator('#pop [data-do="no"]').click();
  await expect.poll(async () => (await getRec(page, 'x2')).status).toBe('no');
  noErrors(errors, 'excepción');
});

test('11 · Aplicar registros al PPC semanal conserva «no imputable» decidido en Campo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [act('x1'), week(), daily({ x1: rec({ status: 'no', exec: 0, cnc: 'Materiales', imp: false }) })] });
  expect(await page.evaluate(() => cncImp('Materiales'))).toBe(true);
  await page.locator('section[data-pid="p1"] [data-applyfield]').click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('weeks', '58_p1').res.x1?.ok)).toBe(false);
  expect(await page.evaluate(() => window.__dbGet('weeks', '58_p1').res.x1.imp)).toBe(false);
  noErrors(errors, 'imputabilidad');
});

test('12 · Indicadores › Semanal muestra solo el plan semanal congelado, no lo reportado en Campo', async ({ page }) => {
  /* 3 compromisos congelados del SC c1: 1 Sí, 1 No, 1 sin evaluar → 33 % (igual que el Plan semanal); el registro de campo
     dice «Cumplido» en el que se evaluó No y no debe cambiar nada (pedido del dueño, oct 2026) */
  const it3 = { ...items, x2: { ...items.x1, act: 'Segunda', ord: 2 }, x3: { ...items.x1, act: 'Tercera', ord: 3 } };
  const errors = await openApp(page, { tab: 'ind', extra: [act('x1'), act('x2', { name: 'Segunda' }), act('x3', { name: 'Tercera' }), daily({ x1: rec({}), x2: rec({ nm: 'Segunda' }) }), week({ items: it3, res: { x1: { ok: true }, x2: { ok: false, cnc: 'Materiales' } } })] });
  await page.evaluate(() => { U.indMode = 'sem'; U.week = 58; render(); });
  const main = page.locator('#main');
  await expect(main).toContainText('Cumplimiento del plan semanal por subcontratista');
  for (const t of ['PPC diario (alerta', 'Cumplimiento en campo', 'Trabajo no programado por día', 'Causas registradas en campo'])
    await expect(main).not.toContainText(t);
  const row = main.locator('.card', { hasText: 'Cumplimiento del plan semanal' }).locator('tbody tr').first();
  await expect(row).toContainText('33%');
  expect(await page.evaluate(() => (wkScStats([S.wk.get('58_p1')]).c1 || {}).n)).toBe(3);
  noErrors(errors, 'semanal congelado');
});

test('13 · En Campo se puede ver mañana, pero no registrar avance', async ({ page }) => {
  const errors = await openApp(page, { tab: 'campo', extra: [act('x1', { days: [HOY, MANANA], qty: { [HOY]: 5, [MANANA]: 5 } })] });
  await page.locator('#wnext').click();
  await expect(page.locator('#main .callout').first()).toContainText('Día que aún no llega');
  await expect(card(page, 'x1').locator('[data-st="ok"]')).toBeDisabled();
  const r = await page.evaluate(d => { const x = S.act.get('x1'); return writeDaily(d, 'p1', { recs: { x1: { ...baseRec(d, x, null), status: 'ok', exec: 5 } } }); }, MANANA);
  expect(r).toBe(false);
  expect(await page.evaluate(d => window.__dbGet('daily', d + '_p1'), MANANA)).toBeUndefined();
  noErrors(errors, 'futuro');
});
