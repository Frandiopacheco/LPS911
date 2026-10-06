// Segunda auditoría externa del Tareo (docs/ia/tareo.md «Correcciones de la segunda auditoría — oficina»).
// Convierte las reproducciones de ChatGPT (A1, A2, A3, A4, A7 y UX1/UX5) en pruebas de que el defecto YA NO ocurre. Datos inventados.
import { test, expect } from '@playwright/test';
import { openApp, HOY, noErrors } from './helpers.js';

const CAP = 'tcap@obra.pe', ID = `${HOY}_${CAP}`, DNI = '11111111';
const FOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const R = { ape: 'ALFA', nom: 'ANA', cat: 'OP', cua: 'ALBAÑILES', as: true, mot: '', alt: false };
const DOC = { date: HOY, cap: CAP, capN: 'Teodoro Capataz', st: 'env', foto: ['f1'], rows: { [DNI]: R },
  blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '17:00', dnis: [DNI] }],
  hist: [{ a: 'env', by: CAP, t: 1 }], envBy: CAP, envAt: 1, envN: 1 };
const seed = (doc = DOC, cfg = {}) => [
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', nom: 'Encofrado de muros', act: true }],
  ['tper', DNI, { dni: DNI, ...R, cap: CAP, ing: '2026-01-05', ces: '', per: [{ ing: '2026-01-05', ces: '' }] }],
  ['tcfg', 'main', cfg], ['tfot', 'f1', { date: HOY, cap: CAP, n: 1, d: FOTO }], ['tareo', ID, doc],
];
const tab = page => page.evaluate(() => { U.mod = 'tar'; U.tab = 'tdia'; render(); });
const open = async page => { await tab(page); await page.locator(`tr[data-to="${ID}"] button[data-to]`).click(); await expect(page.locator('#trWs')).toBeVisible(); };
const get = page => page.evaluate(id => window.__dbGet('tareo', id), ID);

test('A1: «Marcar revisado» congela la jornada (cfg) de un enviado antiguo; cambiar la configuración después no cambia sus horas', async ({ page }) => {
  const { envN, ...viejo } = DOC; // enviado antes de que existieran cfg y envN
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: seed(viejo) });
  await open(page);
  await page.locator('#trAll').click();
  await page.locator('#trRev').click();
  await expect.poll(async () => (await get(page)).st).toBe('rev');
  const d = await get(page);
  expect(d.cfg).toMatchObject({ v: 1, fer: false });
  expect(d.cfg.jor).toMatchObject({ ini: '07:30', fin: '17:00', ref: 60 });
  expect(await page.evaluate(id => tCalc(window.__dbGet('tareo', id)).rows['11111111'].trab, ID)).toBe(8.5);
  await page.evaluate(() => fcol('tcfg').doc('main').set({ jor: { '4': { ini: '07:30', fin: '17:00', ref: 30, refIni: '12:00' } } }, { merge: true }));
  await expect.poll(() => page.evaluate(() => TC().jor['4'].ref)).toBe(30);
  expect(await page.evaluate(id => tCalc(window.__dbGet('tareo', id)).rows['11111111'].trab, ID)).toBe(8.5);
  noErrors(errors, 'A1');
});

test('A2: el cotejo sin guardar queda atado a la foto y al envío: si el capataz reenvía, se descarta y hay que cotejar de nuevo', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: seed() });
  await page.evaluate(img => fcol('tfot').doc('f2').set({ date: '2026-10-01', cap: 'tcap@obra.pe', n: 2, d: img }), FOTO);
  await open(page);
  await page.locator('#trAll').click(); // coteja f1 y no guarda
  await expect(page.locator('#trSave')).toBeVisible();
  // la oficina lo reabre y el capataz manda otra foto y lo reenvía (llega por la suscripción con el detalle abierto)
  await page.evaluate(id => fcol('tareo').doc(id).update({ st: 'reab', reab: { t: 2, by: 'admin@obra.pe', mot: 'Otra foto' } }), ID);
  await expect(page.locator('#trWs')).toContainText('Reabierto');
  await page.evaluate(id => fcol('tareo').doc(id).update({ st: 'env', foto: ['f2'], envN: 2, envAt: 3 }), ID);
  await expect(page.locator('#trCycV')).toContainText('vuelve a cotejar', { ignoreCase: true });
  await expect(page.locator('#trSave')).toHaveCount(0);
  await expect(page.locator('#trCotN')).toHaveText('0 de 1 cotejados');
  await expect(page.locator('#trRev')).toBeDisabled();
  let d = await get(page);
  expect(d.cot).toBeUndefined();
  expect(d.st).toBe('env');
  // ahora sí coteja la foto nueva y lo marca revisado
  await expect(page.locator('#trImg')).toHaveAttribute('src', FOTO);
  await page.locator('#trAll').click();
  await expect(page.locator('#trCycV')).toHaveCount(0);
  await page.locator('#trRev').click();
  await expect.poll(async () => (await get(page)).st).toBe('rev');
  d = await get(page);
  expect(d.cotFot).toEqual(['f2']);
  noErrors(errors, 'A2');
});

test('A2: dentro de la transacción, «Guardar cotejo» y «Marcar revisado» rechazan un reenvío que la vista aún no recibió (aunque traiga la misma foto)', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: seed() });
  await open(page);
  await page.locator('#trAll').click();
  // el reenvío llega a la base justo antes del clic (misma foto, otro envío)
  await page.evaluate(id => { fcol('tareo').doc(id).update({ envN: 2, envAt: 5 }); return trSaveCot(id); }, ID);
  await expect(page.locator('#trCycV')).toBeVisible();
  let d = await get(page);
  expect(d.cot).toBeUndefined();
  expect(await page.evaluate(() => TR.dirty)).toBe(false);
  await expect(page.locator('#trCotN')).toHaveText('0 de 1 cotejados');
  // vuelve a cotejar: ahora con «Marcar revisado» y otro reenvío entre medio
  await page.locator('#trAll').click();
  await page.evaluate(id => { fcol('tareo').doc(id).update({ envN: 3, envAt: 9 }); return trRevisar(id); }, ID);
  await expect(page.locator('#trCycV')).toBeVisible();
  d = await get(page);
  expect(d.st).toBe('env');
  expect(d.cot).toBeUndefined();
  // sin envN (tareo de antes): el ciclo es envAt
  expect(await page.evaluate(() => trCyc({ foto: ['a'], envAt: 1 }) !== trCyc({ foto: ['a'], envAt: 2 }))).toBe(true);
  expect(await page.evaluate(() => trCyc({ foto: ['a', 'b'], envN: 1 }) === trCyc({ foto: ['b', 'a'], envN: 1 }))).toBe(true);
  noErrors(errors, 'A2 transacción');
});

test('A3: tras un conflicto, «Recargar versión actual» trae los datos nuevos y una nueva corrección se guarda; cerrar y abrir también reinicia', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: seed() });
  await open(page);
  await page.locator('#trCor').click();
  await page.locator('[data-tre="fin"]').fill('16:00');
  await page.evaluate(id => fcol('tareo').doc(id).update({ blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '15:00', dnis: ['11111111'] }] }), ID);
  await page.locator('#trEdOk').click();
  await expect(page.locator('#toast')).toContainText('Otro usuario cambió este tareo');
  await expect(page.locator('#trReload')).toBeVisible();
  // recargar: avisa que se pierde la corrección sin guardar
  let asked = '';
  page.once('dialog', dg => { asked = dg.message(); dg.accept(); });
  await page.locator('#trReload').click();
  await expect(page.locator('[data-tre="fin"]')).toHaveValue('15:00');
  expect(asked).toContain('corrección');
  await expect(page.locator('#trReload')).toHaveCount(0);
  await page.locator('[data-tre="fin"]').fill('14:00');
  page.once('dialog', dg => dg.accept('Salió temprano'));
  await page.locator('#trEdOk').click();
  await expect.poll(async () => (await get(page)).blq[0].fin).toBe('14:00');
  // otro conflicto: cerrar (sale sin guardar) y volver a abrir empieza limpio con la versión actual
  await page.locator('#trCor').click();
  await page.locator('[data-tre="fin"]').fill('13:30');
  await page.evaluate(id => fcol('tareo').doc(id).update({ blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '15:30', dnis: ['11111111'] }] }), ID);
  await page.locator('#trEdOk').click();
  await expect(page.locator('#trReload')).toBeVisible();
  page.once('dialog', dg => dg.accept());
  await page.locator('#trBack').click();
  await expect(page.locator('#trWs')).toHaveCount(0);
  await open(page);
  await expect(page.locator('#trEdOk')).toHaveCount(0);
  await expect(page.locator('#trReload')).toHaveCount(0);
  await page.locator('#trCor').click();
  await expect(page.locator('[data-tre="fin"]')).toHaveValue('15:30');
  await page.locator('[data-tre="fin"]').fill('15:00');
  page.once('dialog', dg => dg.accept('Ajuste'));
  await page.locator('#trEdOk').click();
  await expect.poll(async () => (await get(page)).blq[0].fin).toBe('15:00');
  noErrors(errors, 'A3');
});

test('A4: firmas del formato antiguo (rows.fir + historial) ya no cuentan como cotejo', async ({ page }) => {
  const forged = { ...DOC, rows: { [DNI]: { ...R, fir: true, gar: '17:00' } }, hist: [{ a: 'fir', by: 'tasis@obra.pe', t: 1 }], revBy: 'tasis@obra.pe' };
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: seed(forged) });
  await tab(page);
  await expect(page.locator(`tr[data-to="${ID}"] [data-l="Firmas"]`)).toHaveText('0 de 1');
  await page.locator(`tr[data-to="${ID}"] button[data-to]`).click();
  await expect(page.locator('#trCotN')).toHaveText('0 de 1 cotejados');
  await expect(page.locator('#trRev')).toBeDisabled();
  await expect(page.locator('#trg_11111111')).toHaveValue('');
  expect(await page.evaluate(id => tCotDe(TD.docs.get(id)), ID)).toEqual({});
  noErrors(errors, 'A4');
});

test('A7: una foto que llega con el detalle abierto se carga; si no se puede, error con «Reintentar» y no se marcan firmas', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: seed() });
  await open(page);
  await expect(page.locator('#trImg')).toHaveAttribute('src', FOTO);
  await page.evaluate(img => fcol('tfot').doc('f2').set({ date: '2026-10-01', cap: 'tcap@obra.pe', n: 2, d: img }), FOTO);
  await page.evaluate(id => fcol('tareo').doc(id).update({ foto: ['f2'] }), ID);
  await expect(page.locator('#trImg')).toHaveAttribute('src', FOTO);
  expect(await page.evaluate(() => TD.fotos.has('f2'))).toBe(true);
  // una foto que aún no está en la base: error claro, sin cotejo hasta que cargue
  await page.evaluate(id => fcol('tareo').doc(id).update({ foto: ['f3'] }), ID);
  await expect(page.locator('#trFErr')).toBeVisible();
  await expect(page.locator('#trImg')).toHaveCount(0);
  await expect(page.locator('#trAll')).toBeDisabled();
  await expect(page.locator('tr[data-trd="11111111"] [data-tra="fir"]').first()).toBeDisabled();
  await expect(page.locator('#trFWait')).toBeVisible();
  // llega la foto y «Reintentar» la muestra
  await page.evaluate(img => fcol('tfot').doc('f3').set({ date: '2026-10-01', cap: 'tcap@obra.pe', n: 3, d: img }), FOTO);
  await page.locator('#trFRe').click();
  await expect(page.locator('#trImg')).toHaveAttribute('src', FOTO);
  await expect(page.locator('#trAll')).toBeEnabled();
  noErrors(errors, 'A7');
});

test('UX1: vinieron, no vinieron y sin marcar se cuentan aparte en la lista, el resumen y el detalle', async ({ page }) => {
  const rows = { [DNI]: R, 22222222: { ...R, ape: 'BETA', as: false, mot: '' }, 33333333: { ...R, ape: 'GAMMA', as: null }, 44444444: { ...R, ape: 'DELTA', as: null } };
  const doc = { ...DOC, st: 'bor', rows };
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: seed(doc) });
  await tab(page);
  const fila = page.locator(`tr[data-to="${ID}"]`);
  await expect(fila.locator('[data-l="Vinieron"]')).toHaveText('1');
  await expect(fila.locator('[data-l="No vinieron"]')).toHaveText('1');
  await expect(fila.locator('[data-l="Sin marcar"]')).toHaveText('2');
  await expect(page.locator('#toFal')).toHaveText('1');
  await expect(page.locator('#toSm')).toHaveText('2');
  await fila.locator('button[data-to]').click();
  const k = page.locator('#trKpi');
  await expect(k).toContainText('1 vino');
  await expect(k).toContainText('1 no vino');
  await expect(k).toContainText('2 sin marcar');
  await expect(page.locator('tr[data-as="sm"]')).toHaveCount(2);
  await expect(page.locator('tr[data-as="sm"]').first()).toContainText('Sin marcar');
  await expect(page.locator('tr[data-as="no"]')).toContainText('No vino');
  await expect(page.locator('tr[data-as="no"]')).not.toContainText('sin motivo');
  noErrors(errors, 'UX1');
});

test('UX5: con Tab el foco no sale de la revisión ni de su ventana; Esc respeta lo no guardado y el foco vuelve a la fila', async ({ page }) => {
  const errors = await openApp(page, { as: 'tasis', editar: false, extra: seed() });
  await open(page);
  await expect(page.locator('#trBack')).toBeFocused();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('#trWs'))).toBe(true);
  }
  // ventana encima (pasar a otro capataz): Tab no sale de ella; Esc la cierra y el foco sigue en la revisión
  await page.locator('[data-tra="pas"]').first().click();
  await expect(page.locator('#lqm')).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('#lqm'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#lqm')).toHaveCount(0);
  await expect(page.locator('#trWs')).toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement.closest('#trWs'))).toBe(true);
  // cotejo sin guardar: Esc pregunta; «Seguir aquí» no cierra
  await page.locator('#trAll').click();
  page.once('dialog', dg => dg.dismiss());
  await page.locator('#trBack').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#trWs')).toBeVisible();
  page.once('dialog', dg => dg.accept());
  await page.keyboard.press('Escape');
  await expect(page.locator('#trWs')).toHaveCount(0);
  await expect(page.locator(`tr[data-to="${ID}"] button[data-to]`)).toBeFocused();
  noErrors(errors, 'UX5');
});
