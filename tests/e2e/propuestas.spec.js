// Lookahead y propuestas de subcontratistas: correcciones del informe externo (ChatGPT, 4 oct 2026).
// Los números de cada prueba son los del informe.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const PROJ = { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28' };
/* una actividad con metrado repartido por día */
const QACT = { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 30, days: ['2026-10-01', '2026-10-02'], qty: { '2026-10-01': 10, '2026-10-02': 20 }, order: 40 };
/* propuesta enviada de c1 que corre i0 (piso 1) e i2 (piso 2) */
const prop = (items) => ['lhprop', 'c1', { sc: 'c1', items, sentAt: 1, sentBy: 'Sandra' }];
const item = (after, base) => ({ after, base, ts: 1, by: 'sc@obra.pe', n: 'Sandra Sanitarias', sent: true, sentAt: 1 });
const I0 = { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days: ['2026-09-30', '2026-10-01'], order: 10 };
const I2 = { ...I0, ambId: 'a3', name: 'REDES EMPOTRADAS' };
const moved = (x, days) => ({ ...x, days });
/* hoy (01 oct) ya está cerrado: i0 no se hizo hoy y quedó registrado; así se puede aceptar moverla */
const REC0 = ['daily', '2026-10-01_p1', { date: '2026-10-01', pisoId: 'p1', recs: { i0: { status: 'no', sc: 'c1', cnc: 'Programación' } } }];

async function lookMetrado(page) {
  await page.evaluate(() => { U.qmode = 'metrado'; gridRows = null; render(); });
}
const cell = (page, a, d) => page.locator(`#grid tr[data-a="${a}"] td.d[data-d="${d}"]`);
async function revision(page) {
  await page.evaluate(() => { U.rev = true; REVSEL = null; gridRows = null; render(); });
  await expect(page.locator('#ppbar .ppb.rv')).toBeVisible();
}

test('1 · una cantidad que no es número no borra los días ni sus cantidades', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'q1', QACT]] });
  await lookMetrado(page);
  const a = cell(page, 'q1', '2026-10-01'), b = cell(page, 'q1', '2026-10-02');
  const ba = await a.boundingBox(), bb = await b.boundingBox();
  await page.mouse.move(ba.x + ba.width / 2, ba.y + ba.height / 2); await page.mouse.down();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 4 }); await page.mouse.up();
  await page.fill('#qper', '10 m2');
  await page.click('#pop [data-do="per"]');
  await expect(page.locator('#toast')).toContainText('Escribe solo números');
  const x = await page.evaluate(() => __dbGet('acts', 'q1'));
  expect(x.days).toEqual(QACT.days);
  expect(x.qty).toEqual(QACT.qty);
  noErrors(errors, 'cantidad inválida');
});

test('13 · poner cantidad después de la fecha de terminada reabre la actividad', async ({ page }) => {
  const done = { ...QACT, days: ['2026-09-29', '2026-09-30'], qty: { '2026-09-29': 10, '2026-09-30': 10 } };
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'q1', done], ['doneidx', 'p1', { d: { q1: '2026-09-30' } }]] });
  expect(await page.evaluate(() => DONE.get('q1'))).toBe('2026-09-30');
  await lookMetrado(page);
  await cell(page, 'q1', '2026-10-02').click();
  await page.keyboard.type('5'); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'q1').qty['2026-10-02'])).toBe(5);
  await expect.poll(() => page.evaluate(() => (__dbGet('doneidx', 'p1').r || {}).q1)).toBe('2026-09-30');
  expect(await page.evaluate(() => DONE.has('q1'))).toBe(false);
  noErrors(errors, 'reabrir por metrado');
});

test('7 · «Aceptar todo lo visible» solo acepta lo que muestra la grilla con los filtros', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [REC0, prop({
    i0: item(moved(I0, ['2026-10-02', '2026-10-03']), I0), i2: item(moved(I2, ['2026-10-02', '2026-10-03']), I2) })] });
  await page.evaluate(() => { U.piso = 'p1'; });
  await revision(page);
  await expect(page.locator('#ppbar [data-rvall]')).toContainText('(1 de 2)');
  page.once('dialog', d => d.accept());
  await page.click('#ppbar [data-rvall]');
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'i0').days)).toEqual(['2026-10-02', '2026-10-03']);
  const p = await page.evaluate(() => __dbGet('lhprop', 'c1'));
  expect(p.items.i0).toBeNull();
  expect(p.items.i2 && p.items.i2.sent).toBe(true);
  expect((await page.evaluate(() => __dbGet('acts', 'i2'))).days).toEqual(I2.days);
  noErrors(errors, 'aceptar visibles');
});

test('8 · revisando una propuesta, tocar un día vacío no cambia el programa oficial', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [REC0, prop({ i0: item(moved(I0, ['2026-10-02']), I0) })] });
  await revision(page);
  await cell(page, 'i0', '2026-10-05').click();
  await expect(page.locator('#toast')).toContainText('Estás revisando esta propuesta');
  expect((await page.evaluate(() => __dbGet('acts', 'i0'))).days).toEqual(I0.days);
  expect((await page.evaluate(() => __dbGet('lhprop', 'c1'))).items.i0.sent).toBe(true);
  noErrors(errors, 'revisión sin edición directa');
});

test('9 · aceptar desplazando sobre un feriado junta los días sin perder cantidades', async ({ page }) => {
  const base = { ...I0, metrado: 30, days: ['2026-10-05', '2026-10-06'], qty: { '2026-10-05': 15, '2026-10-06': 15 } };
  const after = { ...base, days: ['2026-10-07', '2026-10-08'], qty: { '2026-10-07': 10, '2026-10-08': 20 } };
  const errors = await openApp(page, { tab: 'look', extra: [REC0, ['meta', 'project', { ...PROJ, cal: { hol: [{ d: '2026-10-08', n: 'Prueba' }] } }],
    ['acts', 'i0', base], prop({ i0: item(after, base) })] });
  await revision(page);
  await page.evaluate(() => revDecide('i0', 'shift', { start: '2026-10-09' }));
  await expect(page.locator('#toast')).toContainText('se juntó');
  const x = await page.evaluate(() => __dbGet('acts', 'i0'));
  expect(x.days).toEqual(['2026-10-09']);
  expect(x.qty).toEqual({ '2026-10-09': 30 });
  noErrors(errors, 'desplazar con feriado');
});

test('16 · el SC no puede duplicar ni crear ambientes en modo propuesta', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look' });
  await page.click('#grid [data-ambmenu="a1"]');
  await expect(page.locator('#pop')).toContainText('+ Actividad al final');
  await expect(page.locator('#pop [data-do="dup"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  const n0 = await page.evaluate(() => Object.keys(__dbAll('ambientes')).length);
  await page.evaluate(() => dupAmb(S.amb.get('a1')));
  await expect(page.locator('#toast')).toContainText('modo propuesta');
  expect(await page.evaluate(() => Object.keys(__dbAll('ambientes')).length)).toBe(n0);
  expect(await page.evaluate(() => Object.keys((__dbGet('lhprop', 'c1') || {}).items || {}).length)).toBe(0);
  noErrors(errors, 'SC sin duplicar ambiente');
});

test('17 · el SC no registra restricciones de una actividad que solo propuso', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look' });
  const id = await page.evaluate(() => { addAct('a1'); return [...S.act.keys()].find(k => !ACT_OFF.has(k)); });
  expect(id).toBeTruthy();
  const n0 = await page.evaluate(() => Object.keys(__dbAll('restr')).length);
  await page.evaluate(i => newRestr(i), id);
  await expect(page.locator('#toast')).toContainText('todavía es una propuesta');
  expect(await page.evaluate(() => Object.keys(__dbAll('restr')).length)).toBe(n0);
  /* de una actividad oficial de su partida sí puede */
  await page.evaluate(() => newRestr('i0'));
  await expect.poll(() => page.evaluate(() => Object.keys(__dbAll('restr')).length)).toBe(n0 + 1);
  noErrors(errors, 'restricción de actividad propuesta');
});

/* ---- paquete B: aceptar una propuesta de forma segura ---- */
const P_I0 = (after, base = I0) => prop({ i0: item(after, base) });

test('2 · aceptar no consume una versión nueva que el SC envió mientras se revisaba', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [REC0, P_I0(moved(I0, ['2026-10-02']))] });
  await revision(page);
  /* en la base llega otra versión, pero esta pantalla todavía no la recibió */
  await page.evaluate(() => { const d = __DB.lhprop.get('c1'); d.items.i0 = { ...d.items.i0, ts: 999, after: { ...d.items.i0.after, days: ['2026-10-05'] } }; });
  const r = await page.evaluate(() => revDecide('i0', 'ok'));
  expect(r).toBe('ver');
  await expect(page.locator('#toast')).toContainText('cambió esta propuesta');
  expect((await page.evaluate(() => __dbGet('acts', 'i0'))).days).toEqual(I0.days);
  const p = await page.evaluate(() => __dbGet('lhprop', 'c1'));
  expect(p.items.i0.ts).toBe(999);
  expect(Object.keys(p.hist || {})).toHaveLength(0);
  noErrors(errors, 'versión nueva');
});

test('3 · si el programa oficial cambió desde la propuesta, pregunta antes de pisarlo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [REC0, ['acts', 'i0', moved(I0, ['2026-10-05'])], P_I0(moved(I0, ['2026-10-02']))] });
  await revision(page);
  let msg = '';
  page.once('dialog', d => { msg = d.message(); d.dismiss(); });
  expect(await page.evaluate(() => revDecide('i0', 'ok'))).toBe('conf');
  expect(msg).toContain('cambió en: días');
  expect((await page.evaluate(() => __dbGet('acts', 'i0'))).days).toEqual(['2026-10-05']);
  /* aceptar todo lo visible no la toma: queda pendiente para revisarla sola */
  page.once('dialog', d => d.accept());
  await page.click('#ppbar [data-rvall]');
  await expect(page.locator('#toast')).toContainText('el programa oficial cambió');
  expect((await page.evaluate(() => __dbGet('lhprop', 'c1'))).items.i0.sent).toBe(true);
  /* aceptando la pregunta, se aplica */
  page.once('dialog', d => d.accept());
  expect(await page.evaluate(() => revDecide('i0', 'ok'))).toBe('ok');
  expect((await page.evaluate(() => __dbGet('acts', 'i0'))).days).toEqual(['2026-10-02']);
  noErrors(errors, 'conflicto con lo oficial');
});

test('5 · una propuesta de una actividad en la Papelera no la restaura', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [REC0, ['acts', 'i0', { ...I0, arch: { t: 1, by: 'x', n: 'X' } }], P_I0(moved(I0, ['2026-10-02']))] });
  expect(await page.evaluate(() => decideProp('c1', 'i0', 'ok'))).toBe('arch');
  await expect(page.locator('#toast')).toContainText('Papelera');
  const x = await page.evaluate(() => __dbGet('acts', 'i0'));
  expect(x.arch).toBeTruthy();
  expect(x.days).toEqual(I0.days);
  expect((await page.evaluate(() => __dbGet('lhprop', 'c1'))).items.i0.sent).toBe(true);
  noErrors(errors, 'papelera');
});

test('6 · quitar un día del borrador también quita su cantidad guardada', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look' });
  await page.evaluate(() => { const x = S.act.get('i0'); apply([op('acts', 'i0', { ...x, metrado: 30, days: ['2026-10-05', '2026-10-06'], qty: { '2026-10-05': 10, '2026-10-06': 20 } })]); });
  await expect.poll(() => page.evaluate(() => Object.keys(__dbGet('lhprop', 'c1').items.i0.after.qty || {}).length)).toBe(2);
  await page.evaluate(() => { const x = S.act.get('i0'); apply([op('acts', 'i0', { ...x, days: ['2026-10-06'], qty: { '2026-10-06': 20 } })]); });
  await expect.poll(() => page.evaluate(() => __dbGet('lhprop', 'c1').items.i0.after.days)).toEqual(['2026-10-06']);
  expect((await page.evaluate(() => __dbGet('lhprop', 'c1'))).items.i0.after.qty).toEqual({ '2026-10-06': 20 });
  /* enviar tampoco mezcla: el elemento queda igual, ahora enviado */
  await page.evaluate(() => sendProp());
  await expect.poll(() => page.evaluate(() => __dbGet('lhprop', 'c1').items.i0.sent)).toBe(true);
  expect((await page.evaluate(() => __dbGet('lhprop', 'c1'))).items.i0.after.qty).toEqual({ '2026-10-06': 20 });
  noErrors(errors, 'borrador sin restos');
});

test('12 · deshacer una aceptación devuelve la propuesta a pendientes; rehacer la vuelve a aceptar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [REC0, P_I0(moved(I0, ['2026-10-02', '2026-10-03']))] });
  await revision(page);
  expect(await page.evaluate(() => revDecide('i0', 'ok'))).toBe('ok');
  expect((await page.evaluate(() => __dbGet('acts', 'i0'))).days).toEqual(['2026-10-02', '2026-10-03']);
  await page.click('#bundo');
  await expect(page.locator('#toast')).toContainText('vuelve a quedar pendiente');
  expect((await page.evaluate(() => __dbGet('acts', 'i0'))).days).toEqual(I0.days);
  let p = await page.evaluate(() => __dbGet('lhprop', 'c1'));
  expect(p.items.i0.sent).toBe(true);
  /* el historial ya no va dentro de lhprop: un documento por decisión en lhphist */
  expect(p.hist).toBeUndefined();
  const h = Object.values(await page.evaluate(() => __dbAll('lhphist')));
  expect(h).toHaveLength(1);
  expect(h[0].st).toBe('ok');
  expect(h[0].undone).toBeTruthy();
  await page.click('#bredo');
  await expect.poll(() => page.evaluate(() => __dbGet('lhprop', 'c1').items.i0)).toBeNull();
  expect((await page.evaluate(() => __dbGet('acts', 'i0'))).days).toEqual(['2026-10-02', '2026-10-03']);
  expect(Object.values(await page.evaluate(() => __dbAll('lhphist')))[0].undone).toBeUndefined();
  noErrors(errors, 'deshacer aceptación');
});

test('15 · el SC con dos partidas no puede cambiar la partida de una actividad en su propuesta', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: [['members', 'sc@obra.pe', { role: 'sc', name: 'Sandra Sanitarias', sc: 'c1', scs: ['c1', 'c2'] }]] });
  await page.evaluate(() => { const x = S.act.get('i0'); apply([op('acts', 'i0', { ...x, sc: 'c2' })]); });
  await expect(page.locator('#toast')).toContainText('La partida de una actividad no se cambia');
  expect(await page.evaluate(() => ((__dbGet('lhprop', 'c1') || {}).items || {}).i0 || null)).toBeNull();
  expect(await page.evaluate(() => ((__dbGet('lhprop', 'c2') || {}).items || {}).i0 || null)).toBeNull();
  noErrors(errors, 'partida en propuesta');
});

/* ---- paquete C: varios usuarios a la vez y cruces entre propuestas ---- */
test('4 · dos personas marcan días distintos de la misma actividad: quedan ambos con sus cantidades', async ({ page }) => {
  const base = { ...QACT, days: ['2026-10-01'], qty: { '2026-10-01': 10 } };
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'q1', base]] });
  /* otra persona ya guardó el 6 con 8 unidades; esta pantalla todavía no lo recibió */
  await page.evaluate(() => { const d = __DB.acts.get('q1'); d.days = [...d.days, '2026-10-06']; d.qty = { ...d.qty, '2026-10-06': 8 }; });
  await page.evaluate(() => { const x = S.act.get('q1'); apply([op('acts', 'q1', withQty(x, '2026-10-05', 5))]); });
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'q1').qty['2026-10-05'])).toBe(5);
  const x = await page.evaluate(() => __dbGet('acts', 'q1'));
  expect([...x.days].sort()).toEqual(['2026-10-01', '2026-10-05', '2026-10-06']);
  expect(x.qty).toEqual({ '2026-10-01': 10, '2026-10-05': 5, '2026-10-06': 8 });
  /* al recibirlo, la pantalla lo ve ordenado */
  await page.evaluate(() => { const d = __DB.acts.get('q1'); __DB.acts.set('q1', { ...d }); });
  await page.evaluate(() => { const x = S.act.get('q1'); apply([op('acts', 'q1', { ...x, name: 'Redes empotradas 2' })]); });
  await expect.poll(() => page.evaluate(() => S.act.get('q1').days)).toEqual(['2026-10-01', '2026-10-05', '2026-10-06']);
  /* quitar un día solo quita ese */
  await page.evaluate(() => { const d = __DB.acts.get('q1'); d.days = [...d.days, '2026-10-07']; });
  await page.evaluate(() => { const x = S.act.get('q1'); apply([op('acts', 'q1', withQty(x, '2026-10-05', null))]); });
  await expect.poll(() => page.evaluate(() => [...__dbGet('acts', 'q1').days].sort())).toEqual(['2026-10-01', '2026-10-06', '2026-10-07']);
  noErrors(errors, 'días a la vez');
});

test('14 · la revisión muestra el cruce entre dos propuestas del mismo ambiente', async ({ page }) => {
  const E0 = { ambId: 'a1', sc: 'c2', name: 'Entubado empotrado', und: 'ml', metrado: 40, days: ['2026-10-01', '2026-10-02'], order: 20 };
  const errors = await openApp(page, { tab: 'look', extra: [
    prop({ i0: item(moved(I0, ['2026-10-07']), I0) }),
    ['lhprop', 'c2', { sc: 'c2', items: { e0: item(moved(E0, ['2026-10-07']), E0) }, sentAt: 1 }]] });
  await revision(page);
  const c = cell(page, 'i0', '2026-10-07');
  await expect(c).toHaveClass(/rvc/);
  expect(await c.getAttribute('title')).toContain('(propuesta)');
  /* y en la lista de propuestas */
  await page.click('#ppbar [data-pp="list"]');
  await expect(page.locator('#ppm')).toContainText('Otra propuesta pendiente en el mismo ambiente');
  noErrors(errors, 'cruces entre propuestas');
});

test('ventana de propuestas: pasado el corte el SC solo ve; el ingeniero la habilita hasta el próximo corte', async ({ page }) => {
  const W = ['meta', 'propwin', { closeAt: Date.parse('2026-09-26T13:00:00-05:00') }];
  let errors = await openApp(page, { as: 'sc', tab: 'look', extra: [W] });
  await expect(page.locator('#ppbar')).toContainText('Propuestas cerradas');
  await expect(page.locator('#ppbar [data-pp="send"]')).toHaveCount(0);
  expect(await page.evaluate(() => propPut('acts', 'i0', { ...S.act.get('i0'), days: ['2026-10-05'] }))).toBe(true); // no guarda nada
  expect(await page.evaluate(() => __dbGet('lhprop', 'c1'))).toBeFalsy();
  noErrors(errors, 'sc cerrado');
  await page.context().clearCookies();
  const p2 = await page.context().newPage();
  errors = await openApp(p2, { as: 'editor', tab: 'look', extra: [W] });
  p2.on('dialog', d => d.accept());
  await p2.locator('#ppbar [data-pp="open"]').click();
  await expect.poll(() => p2.evaluate(() => (__dbGet('meta', 'propwin') || {}).closeAt)).toBe(Date.parse('2026-10-03T13:00:00-05:00'));
  await expect(p2.locator('#ppbar [data-pp="open"]')).toHaveCount(0);
  noErrors(errors, 'editor habilita');
});

test('ventana de propuestas: si el ingeniero nunca la habilitó, está cerrada (primero programa el ingeniero)', async ({ page }) => {
  const W0 = ['meta', 'propwin', {}]; // sin hora de cierre = nunca habilitada
  let errors = await openApp(page, { as: 'sc', tab: 'look', extra: [W0] });
  await expect(page.locator('#ppbar')).toContainText('aún no habilitadas');
  expect(await page.evaluate(() => propPut('acts', 'i0', { ...S.act.get('i0'), days: ['2026-10-05'] }))).toBe(true); // no guarda nada
  expect(await page.evaluate(() => __dbGet('lhprop', 'c1'))).toBeFalsy();
  noErrors(errors, 'sc nunca habilitada');
  const p2 = await page.context().newPage();
  errors = await openApp(p2, { as: 'editor', tab: 'look', extra: [W0] });
  await expect(p2.locator('#ppbar')).toContainText('aún no las habilitas');
  p2.on('dialog', d => d.accept());
  await p2.locator('#ppbar [data-pp="open"]').click();
  const nx = await p2.evaluate(() => propNextCut());
  await expect.poll(() => p2.evaluate(() => (__dbGet('meta', 'propwin') || {}).closeAt)).toBe(nx);
  await expect(p2.locator('#ppbar [data-pp="open"]')).toHaveCount(0);
  noErrors(errors, 'editor habilita la primera vez');
});

test('ventana de propuestas: el ingeniero puede bloquearlas a mano antes del corte y volver a habilitarlas', async ({ page }) => {
  let errors = await openApp(page, { as: 'editor', tab: 'look' }); // el Firebase falso la siembra abierta hasta 2027
  page.on('dialog', d => d.accept());
  await expect(page.locator('#ppbar [data-pp="open"]')).toHaveCount(0);
  await page.locator('#ppbar [data-pp="close"]').click();
  await expect.poll(() => page.evaluate(() => { const w = __dbGet('meta', 'propwin') || {}; return w.man === true && w.closeAt <= NOW(); })).toBe(true);
  await expect(page.locator('#ppbar')).toContainText('las bloqueaste');
  await expect(page.locator('#ppbar [data-pp="close"]')).toHaveCount(0);
  await page.locator('#ppbar [data-pp="open"]').click();
  const nx = await page.evaluate(() => propNextCut());
  await expect.poll(() => page.evaluate(() => (__dbGet('meta', 'propwin') || {}).closeAt)).toBe(nx);
  await expect.poll(() => page.evaluate(() => !!(__dbGet('meta', 'propwin') || {}).man)).toBe(false);
  noErrors(errors, 'editor bloquea y rehabilita');
  const p2 = await page.context().newPage();
  errors = await openApp(p2, { as: 'sc', tab: 'look', extra: [['meta', 'propwin', { closeAt: Date.parse('2026-09-26T13:00:00-05:00'), man: true }]] });
  await expect(p2.locator('#ppbar')).toContainText('el ingeniero las bloqueó');
  expect(await p2.evaluate(() => propPut('acts', 'i0', { ...S.act.get('i0'), days: ['2026-10-05'] }))).toBe(true);
  expect(await p2.evaluate(() => __dbGet('lhprop', 'c1'))).toBeFalsy();
  noErrors(errors, 'sc bloqueado a mano');
});
