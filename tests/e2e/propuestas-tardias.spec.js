// Propuestas de SC fuera de plazo, historial de decisiones y avisos de semana congelada.
// Informe externo (ChatGPT, reauditoría «propuestas tardías», 4 oct 2026). Los números son los del informe;
// «ex-3» y «ex-4» son sus recomendaciones de claridad.
// Calendario de las pruebas: hoy jueves 1 oct (semana 58). Semana 59 = lun 5 a sáb 10 oct; su corte por defecto es
// el sábado 3 oct a las 13:00 (hora de Lima).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const T = s => Date.parse(s);
const SAT1259 = T('2026-10-03T12:59:00-05:00'), SAT1300 = T('2026-10-03T13:00:00-05:00'), SUN1600 = T('2026-10-04T16:00:00-05:00');
/* dos actividades de c1 en el piso 1, ya en la semana 59 */
const A0 = { ambId: 'a1', sc: 'c1', name: 'Montantes', und: 'ml', metrado: 30, days: ['2026-10-05', '2026-10-06'], qty: { '2026-10-05': 10, '2026-10-06': 20 }, order: 50 };
const A1 = { ...A0, ambId: 'a2', name: 'Colgadores' };
const ACTS = [['acts', 'q0', A0], ['acts', 'q1', A1]];
const item = (after, base, sentAt) => ({ after, base, ts: 1, by: 'sc@obra.pe', n: 'Sandra Sanitarias', sent: true, sentAt });
const props = (items, sentAt = SUN1600) => ['lhprop', 'c1', { sc: 'c1', items, sentAt, sentBy: 'Sandra' }];
/* q0: solo cambia la cantidad del martes, enviada el sábado 12:59 (a tiempo); q1: corre un día, enviada el domingo (tarde) */
const P0 = (sentAt = SAT1259) => item({ ...A0, qty: { ...A0.qty, '2026-10-06': 25 } }, A0, sentAt);
const P1 = (sentAt = SUN1600) => item({ ...A1, days: ['2026-10-06', '2026-10-07'], qty: { '2026-10-06': 10, '2026-10-07': 20 } }, A1, sentAt);
const FROZEN = ['weeks', '59_p1', { n: 59, pisoId: 'p1', frozenAt: '2026-10-03T20:00:00.000Z', res: {}, snap: {},
  items: { q0: { sc: 'c1', days: A0.days, q: 30, qd: A0.qty, und: 'ml' }, q1: { sc: 'c1', days: A1.days, q: 30, qd: A1.qty, und: 'ml' } } }];

test('1 · cada propuesta muestra su hora de envío y si llegó fuera de plazo (corte sáb 13:00)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, props({ q0: P0(), q1: P1() })] });
  /* el límite: hasta las 13:00:00 es a tiempo; después, fuera de plazo */
  expect(await page.evaluate(([a, b, c]) => [a, b, c].map(s => !!propLate({ sent: true, sentAt: s, base: __dbGet('acts', 'q0'), after: { ...__dbGet('acts', 'q0'), name: 'x' } }, null)),
    [SAT1259, SAT1300, SAT1300 + 60e3])).toEqual([false, false, true]);
  await page.evaluate(() => propModal('rev'));
  const c0 = page.locator('#ppm .ppi[data-id="q0"]'), c1 = page.locator('#ppm .ppi[data-id="q1"]');
  await expect(c0).toContainText('12:59');
  await expect(c0).not.toContainText('FUERA DE PLAZO');
  await expect(c1).toContainText('16:00');
  await expect(c1).toContainText('FUERA DE PLAZO');
  await expect(c1).toContainText('semana 59');
  await expect(page.locator('#ppm .ppsh')).toContainText('1 fuera de plazo');
  noErrors(errors, 'hora de envío por propuesta');
});

test('1 · aceptar una propuesta fuera de plazo pide el motivo y queda registrado con la hora de envío', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, props({ q1: P1() })] });
  /* sin motivo no se acepta */
  page.once('dialog', d => d.dismiss());
  expect(await page.evaluate(() => decideProp('c1', 'q1', 'ok'))).toBe('late');
  expect((await page.evaluate(() => __dbGet('acts', 'q1'))).days).toEqual(A1.days);
  let msg = '';
  page.once('dialog', d => { msg = d.message(); d.accept('Acordado en la reunión del domingo'); });
  expect(await page.evaluate(() => decideProp('c1', 'q1', 'ok'))).toBe('ok');
  expect(msg).toContain('fuera de plazo');
  expect((await page.evaluate(() => __dbGet('acts', 'q1'))).days).toEqual(['2026-10-06', '2026-10-07']);
  const h = Object.values(await page.evaluate(() => __dbAll('lhphist')));
  expect(h).toHaveLength(1);
  expect(h[0]).toMatchObject({ sc: 'c1', actId: 'q1', st: 'ok', sentAt: SUN1600, lateNote: 'Acordado en la reunión del domingo', by: 'frandiopacheco@gmail.com' });
  expect(h[0].late.w).toBe(59);
  /* rechazar una tardía no pide motivo de aceptación */
  noErrors(errors, 'motivo de tardía');
});

test('1 · aceptar varias pide un solo motivo para las que llegaron fuera de plazo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, props({ q0: P0(), q1: P1() })] });
  let n = 0;
  page.on('dialog', d => { n++; d.accept('Reunión semanal'); });
  await page.evaluate(() => decideMany([{ sc: 'c1', id: 'q0' }, { sc: 'c1', id: 'q1' }]));
  await expect.poll(() => page.evaluate(() => Object.keys(__dbAll('lhphist')).length)).toBe(2);
  expect(n).toBe(1);
  const h = Object.values(await page.evaluate(() => __dbAll('lhphist')));
  const byId = Object.fromEntries(h.map(x => [x.actId, x]));
  expect(byId.q1.lateNote).toBe('Reunión semanal');
  expect(byId.q0.late).toBeNull();
  expect(byId.q0.lateNote).toBe('');
  noErrors(errors, 'motivo en lote');
});

test('1 · el SC: editar el domingo lo enviado el sábado guarda el primer envío; si vuelve a lo mismo conserva la hora', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: ACTS });
  const put = q => page.evaluate(q => { const a = ACT_OFF.get('q0'); propPut('acts', 'q0', { ...a, qty: { ...a.qty, '2026-10-06': q } }); }, q);
  const it = () => page.evaluate(() => __dbGet('lhprop', 'c1').items.q0);
  await page.clock.setFixedTime(new Date(SAT1259));
  await put(25); await page.evaluate(() => sendProp());
  await expect.poll(async () => (await it()).sentAt).toBe(SAT1259);
  await page.clock.setFixedTime(new Date(SUN1600));
  /* cambia y vuelve a lo enviado: al reenviar sigue con la hora del sábado (no llega tarde) */
  await put(30); await put(25); await page.evaluate(() => sendProp());
  await expect.poll(async () => (await it()).sent).toBe(true);
  expect((await it()).sentAt).toBe(SAT1259);
  /* cambia de verdad: la hora es la del domingo y queda el primer envío */
  await put(30); await page.evaluate(() => sendProp());
  await expect.poll(async () => (await it()).sentAt).toBe(SUN1600);
  expect((await it()).sent0).toBe(SAT1259);
  await expect(page.locator('#toast')).toContainText('fuera de plazo');
  noErrors(errors, 'reenvío del SC');
});

test('2 · semana congelada: avisa también si cambia solo la cantidad o si se retira la actividad', async ({ page }) => {
  const del = { after: null, base: A1, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: 1 };
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, FROZEN, props({ q0: P0(1), q1: del })] });
  const al = await page.evaluate(() => ['q0', 'q1'].map(id => propAlerts('c1', id, __dbGet('lhprop', 'c1').items[id]).filter(a => a.t === 'frz').map(a => a.h).join(' ')));
  expect(al[0]).toContain('semana 59');
  expect(al[0]).toContain('30 ml'); // lo comprometido que seguirá midiendo el PPC
  expect(al[1]).toContain('semana 59');
  expect(al[1]).toContain('no la quita del compromiso');
  await page.evaluate(() => propModal('rev'));
  await expect(page.locator('#ppm .ppi[data-id="q0"] .ppal')).toContainText('ya congelada');
  noErrors(errors, 'aviso de congelación por cantidad/retiro');
});

test('5 · la vista previa de la revisión muestra lo que se guardará (cambios oficiales posteriores incluidos)', async ({ page }) => {
  /* el SC solo cambió el nombre; después el ingeniero subió el metrado a 50 y el lunes a 20 */
  const off = { ...A0, metrado: 50, qty: { ...A0.qty, '2026-10-05': 20 } };
  const p = item({ ...A0, name: 'Montantes de desagüe' }, A0, 1);
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 'q0', off], props({ q0: p })] });
  await page.evaluate(() => { U.rev = true; REVSEL = null; gridRows = null; render(); });
  const pv = await page.evaluate(() => { const r = revSwap(); const x = S.act.get('q0'); r(); return { name: x.name, metrado: x.metrado, qty: x.qty }; });
  expect(pv).toEqual({ name: 'Montantes de desagüe', metrado: 50, qty: off.qty });
  expect(await page.evaluate(() => revDecide('q0', 'ok'))).toBe('ok');
  const x = await page.evaluate(() => __dbGet('acts', 'q0'));
  expect({ name: x.name, metrado: x.metrado, qty: x.qty }).toEqual(pv);
  noErrors(errors, 'vista previa = aceptación');
});

test('6 · el historial guarda las cantidades antes/después de cada aprobación (10→15 y 15→20)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, props({ q0: item({ ...A0, qty: { ...A0.qty, '2026-10-05': 15 } }, A0, 1) }, 1)] });
  expect(await page.evaluate(() => decideProp('c1', 'q0', 'ok'))).toBe('ok');
  await page.clock.setFixedTime(new Date('2026-10-01T10:00:00-05:00'));
  const b2 = { ...A0, qty: { ...A0.qty, '2026-10-05': 15 } };
  await page.evaluate(it => fcol('lhprop').doc('c1').update(new firebase.firestore.FieldPath('items', 'q0'), it), item({ ...b2, qty: { ...b2.qty, '2026-10-05': 20 } }, b2, 2));
  await expect.poll(() => page.evaluate(() => !!(PROP.get('c1').items || {}).q0)).toBe(true);
  expect(await page.evaluate(() => decideProp('c1', 'q0', 'ok'))).toBe('ok');
  const h = Object.values(await page.evaluate(() => __dbAll('lhphist'))).sort((a, b) => a.t - b.t);
  expect(h.map(x => [x.chg.qty[0]['2026-10-05'], x.chg.qty[1]['2026-10-05']])).toEqual([[10, 15], [15, 20]]);
  expect(h[0].prop.qty[1]['2026-10-05']).toBe(15);
  /* así lo ve el SC en «Respuestas» */
  expect(await page.evaluate(r => histChgHtml(r), h[0])).toContain('10 → <b>15</b>');
  noErrors(errors, 'historial con cantidades');
});

test('ex-3 · congelar con propuestas sin decidir avisa y guarda cuáles quedaron fuera', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [...ACTS, props({ q1: P1(1) })] });
  await page.evaluate(() => { U.week = 59; U.piso = ''; render(); });
  const btn = page.locator('section[data-pid="p1"] [data-freeze]');
  let msg = '';
  page.once('dialog', d => { msg = d.message(); d.dismiss(); });
  await btn.click();
  await expect.poll(() => msg).toContain('sin decidir');
  expect(msg).toContain('1 cambio');
  expect(await page.evaluate(() => __dbGet('weeks', '59_p1'))).toBeUndefined();
  page.once('dialog', d => d.accept());
  await btn.click();
  await expect.poll(() => page.evaluate(() => (__dbGet('weeks', '59_p1') || {}).frozenAt || null)).not.toBeNull();
  expect((await page.evaluate(() => __dbGet('weeks', '59_p1'))).propOut).toEqual(['c1/q1']);
  await expect(page.locator('section[data-pid="p1"] [data-propout]')).toContainText('1 propuesta fuera');
  noErrors(errors, 'congelar con pendientes');
});

test('ex-4 · «Aceptar todo» avisa que no usa el desplazamiento de la vista previa', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [...ACTS, props({ q0: P0(1), q1: P1(1) }, 1)] });
  await page.evaluate(() => { U.rev = true; REVSEL = { sc: 'c1', id: 'q1', k: 1 }; gridRows = null; render(); });
  let msg = '';
  page.once('dialog', d => { msg = d.message(); d.dismiss(); });
  await page.click('#ppbar [data-rvall]');
  await expect.poll(() => msg).toContain('la moviste 1 día');
  expect(await page.evaluate(() => Object.keys(__dbAll('lhphist')).length)).toBe(0);
  noErrors(errors, 'aceptar todo con desplazamiento');
});

test('1 · el corte se configura (día y hora) en Configuración › Proyecto', async ({ page }) => {
  const errors = await openApp(page, { tab: 'cfg', extra: [...ACTS, props({ q1: P1() })] });
  const late = () => page.evaluate(() => !!propLate(__dbGet('lhprop', 'c1').items.q1, S.act.get('q1')));
  expect(await late()).toBe(true);
  await page.click('[data-cfgv="pry"]');
  await page.selectOption('#p_pcd', '0');
  await page.fill('#p_pch', '18:00'); await page.locator('#p_pch').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => [P().propCutDow, P().propCutHH])).toEqual([0, '18:00']);
  expect(await late()).toBe(false); // enviada el domingo 16:00, antes del nuevo corte (domingo 18:00)
  noErrors(errors, 'corte configurable');
});
