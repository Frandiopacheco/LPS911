// Escrituras sin señal (auditoría C1): cada cambio se entrega al SDK de Firestore al instante, sin esperar a que el servidor
// confirme el anterior del mismo documento. Antes, sin señal, el segundo cambio en adelante solo quedaba en la memoria de la
// página y se perdía al cerrarla o recargarla. El Firebase falso simula al servidor que no contesta con window.__dbHold.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

test('sin señal, 15 registros seguidos del mismo día salen todos al SDK, en orden, y sobreviven a una recarga', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'campo' });
  const r = await page.evaluate(async ({ HOY }) => {
    window.__dbHold = true; const w0 = window.__dbWrites;
    for (let i = 0; i < 15; i++) writeDaily(HOY, 'p1', { recs: { i0: { status: 'no', cnc: 'Materiales', note: 'v' + i, sc: 'c1', ambId: 'a1' } } });
    await new Promise(ok => setTimeout(ok, 150));
    return { sent: window.__dbWrites - w0, pending, st: document.querySelector('#status').textContent, db: (window.__dbGet('daily', HOY + '_p1') || {}).recs?.i0?.note, local: DAY.get(HOY + '_p1').recs.i0.note };
  }, { HOY });
  expect(r.sent, 'las 15 escrituras llegan al SDK sin esperar confirmación').toBe(15);
  expect(r.db, 'la última gana').toBe('v14');
  expect(r.local, 'la foto que llega con las escrituras pendientes no borra lo local').toBe('v14');
  expect(r.pending).toBe(15);
  /* se cierra la página antes de que el servidor confirme: lo escrito ya está en la cola local de Firestore */
  await page.reload();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15_000 });
  expect(await page.evaluate(({ HOY }) => [window.__dbGet('daily', HOY + '_p1').recs.i0.note, DAY.get(HOY + '_p1')?.recs?.i0?.note], { HOY })).toEqual(['v14', 'v14']);
  noErrors(errors, 'registros sin señal');
});

test('sin señal, 15 cambios seguidos de una actividad (nombre y mover días) salen al SDK al instante y queda el último', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  const r = await page.evaluate(async ({ HOY, MANANA }) => {
    window.__dbHold = true; const w0 = window.__dbWrites;
    const A = [HOY, MANANA], B = [MANANA, addD(MANANA, 1)];
    for (let i = 0; i < 15; i++) { const x = S.act.get('e0'); put('acts', 'e0', { ...x, name: 'Entubado ' + i, days: i % 2 ? A : B }); }
    await new Promise(ok => setTimeout(ok, 150));
    const sent = window.__dbWrites - w0, mid = window.__dbGet('acts', 'e0'), loc = S.act.get('e0'), pend = pending;
    const n = window.__dbRelease();
    for (let i = 0; i < 50 && pending > 0; i++) await new Promise(ok => setTimeout(ok, 20));
    window.__dbHold = false;
    return { sent, n, pend, pend2: pending, db: [mid.name, mid.days.slice().sort()], local: [loc.name, loc.days], B };
  }, { HOY, MANANA });
  /* cada cambio de días son dos escrituras (quitar y agregar), más la del nombre en la primera */
  expect(r.sent, 'nada espera la confirmación del anterior').toBeGreaterThanOrEqual(15);
  expect(r.pend).toBe(15);
  expect(r.db).toEqual(['Entubado 14', r.B]);
  expect(r.local).toEqual(['Entubado 14', r.B]);
  expect(r.pend2, 'al volver la señal se confirman todas').toBe(0);
  noErrors(errors, 'actividad sin señal');
});

test('la protección de lo recién escrito no deja una versión vieja pegada: un cambio de otro llega igual al vencer el plazo', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  const r = await page.evaluate(async () => {
    const x = S.act.get('e0'); put('acts', 'e0', { ...x, name: 'Mío' });
    /* otra persona cambia el mismo documento enseguida (la foto llega dentro del plazo de protección) */
    await new Promise(ok => setTimeout(ok, 30)); await firebase.firestore().collection('acts').doc('e0').update({ name: 'De otro' });
    await new Promise(ok => setTimeout(ok, 100)); const early = S.act.get('e0').name;
    await new Promise(ok => setTimeout(ok, 2000));
    return { early, late: S.act.get('e0').name };
  });
  expect(['Mío', 'De otro']).toContain(r.early);
  expect(r.late).toBe('De otro');
  noErrors(errors, 'protección temporal');
});

test('si el documento ya no existe en el servidor (not-found), se vuelve a crear con lo último que escribió este equipo', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  const r = await page.evaluate(async () => {
    window.__dbHold = true;
    /* otra persona lo borra; este equipo aún lo tiene y lo sigue cambiando */
    window.__DB.acts.delete('e1');
    for (let i = 0; i < 3; i++) { const x = S.act.get('e1'); put('acts', 'e1', { ...x, name: 'Cambio ' + i }); }
    window.__dbRelease(); window.__dbHold = false;
    for (let i = 0; i < 50 && pending > 0; i++) await new Promise(ok => setTimeout(ok, 20));
    await new Promise(ok => setTimeout(ok, 50)); window.__dbRelease();
    return { db: (window.__dbGet('acts', 'e1') || {}).name, pend: pending };
  });
  expect(r.db).toBe('Cambio 2');
  expect(r.pend).toBe(0);
  noErrors(errors, 'not-found');
});
