// Auditoría de datos (M1 y M4): la foto del lookahead al congelar va en wsnap (no en weeks, que todos descargan al entrar)
// y las «No va» se escuchan solo de los últimos 45 días (con la consulta antigua si falta el índice).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const WK = (o = {}) => ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00.000Z', items: { i0: { sc: 'c1', act: 'Redes', code: 'A-1', amb: 'Dpto 101', days: [HOY] } }, res: {}, ...o }];
const base = page => page.evaluate(() => { const b = baselines().get('p1'); return b ? b.snap : null; });

test('M1 · la línea base del lookahead sale de wsnap/<semana>_<piso> (una lectura suelta, luego redibuja)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [WK(), ['wsnap', '58_p1', { snap: { i0: ['2026-09-30'] }, n: 58, pisoId: 'p1' }]] });
  await expect.poll(() => base(page)).toEqual({ i0: ['2026-09-30'] });
  // solo se pidió ese documento, sin escuchar toda la colección
  expect(await page.evaluate(() => window.__qlog.filter(q => q.n === 'wsnap').length)).toBe(0);
  // con «Cambios» encendido la grilla se dibuja con esa base
  await page.evaluate(() => { U.changes = true; gridRows = null; render(); });
  await expect(page.locator('#main')).not.toContainText('No se pudo mostrar');
  noErrors(errors, 'wsnap');
});

test('M1 · datos antiguos: si la semana aún tiene weeks.snap, se usa esa (sin leer wsnap)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [WK({ snap: { i0: ['2026-09-29'] } }), ['wsnap', '58_p1', { snap: { i0: ['1999-01-01'] } }]] });
  expect(await base(page)).toEqual({ i0: ['2026-09-29'] });
  noErrors(errors, 'snap antiguo');
});

test('M1 · semana congelada sin foto en ningún lado: como antes (base vacía, todo cuenta como nuevo)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [WK()] });
  await expect.poll(() => base(page)).toEqual(null); // mientras no llega la respuesta, el piso va sin base
  await expect.poll(() => page.evaluate(() => { const b = baselines().get('p1'); return !!b && b.snap === undefined; })).toBe(true);
  noErrors(errors, 'sin foto');
});

test('M1 · congelar desde la página escribe la foto en wsnap y no en weeks; descongelar y recuperar no la pierden', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan' });
  await page.evaluate(() => freezeWeek(59, 'p1'));
  const w = await page.evaluate(() => window.__dbGet('weeks', '59_p1'));
  expect(w.frozenAt).toBeTruthy();
  expect(w.snap).toBeUndefined();
  const ws = await page.evaluate(() => window.__dbGet('wsnap', '59_p1'));
  expect(Object.keys(ws.snap).sort()).toEqual(['e0', 'e1', 'i0', 'i1', 't0', 't1']); // todas las actividades del piso P1
  expect([ws.n, ws.pisoId, ws.t]).toEqual([59, 'p1', w.frozenAt]);
  // la base del lookahead ya la tiene sin volver a leer
  expect(await page.evaluate(() => { U.week = 59; const b = baselines().get('p1'); return b && Object.keys(b.snap).length; })).toBe(6);

  // descongelar: la copia __h va sin snap; la foto se copia a wsnap/<…>__h
  await page.evaluate(() => unfreezeWeek(59, 'p1'));
  const all = await page.evaluate(() => window.__dbAll('weeks'));
  const hid = Object.keys(all).find(k => k.startsWith('59_p1__h'));
  expect(hid).toBeTruthy();
  expect(all[hid].v.snap).toBeUndefined();
  expect(all['59_p1'].frozenAt).toBeUndefined();
  expect(await page.evaluate(h => window.__dbGet('wsnap', h).snap, hid)).toEqual(ws.snap);

  // otra persona congela de nuevo con otra foto y la descongela; recuperar la primera versión repone su foto
  await page.evaluate(() => { const x = S.act.get('i0'); x.days = ['2026-10-05']; });
  await page.evaluate(() => freezeWeek(59, 'p1'));
  expect((await page.evaluate(() => window.__dbGet('wsnap', '59_p1'))).snap.i0).toEqual(['2026-10-05']);
  await page.clock.setFixedTime(new Date(HOY + 'T09:45:00-05:00')); // otra hora: otra copia __h
  await page.evaluate(() => unfreezeWeek(59, 'p1'));
  await page.evaluate(h => restoreWeek(59, 'p1', h), hid);
  const w2 = await page.evaluate(() => window.__dbGet('weeks', '59_p1'));
  expect(w2.frozenAt).toBe(w.frozenAt);
  expect(w2.snap).toBeUndefined();
  expect((await page.evaluate(() => window.__dbGet('wsnap', '59_p1'))).snap).toEqual(ws.snap);
  // las dos versiones descongeladas conservan su foto
  const hs = Object.keys(await page.evaluate(() => window.__dbAll('wsnap'))).filter(k => k.startsWith('59_p1__h'));
  expect(hs.length).toBe(2);
  noErrors(errors, 'congelar');
});

test('M1 · descongelar una semana antigua (snap dentro de weeks): la foto pasa a wsnap __h y sale de weeks', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [WK({ snap: { i0: ['2026-09-29'] } })] });
  await page.evaluate(() => unfreezeWeek(58, 'p1'));
  const all = await page.evaluate(() => window.__dbAll('weeks'));
  const hid = Object.keys(all).find(k => k.startsWith('58_p1__h'));
  expect(all['58_p1'].snap).toBeUndefined();
  expect(all[hid].v.snap).toBeUndefined();
  expect(all[hid].v.items.i0).toBeTruthy();
  expect(await page.evaluate(h => window.__dbGet('wsnap', h), hid)).toMatchObject({ snap: { i0: ['2026-09-29'] }, histOf: '58_p1' });
  // recuperar una copia __h antigua (con v.snap): la foto vuelve a wsnap, no a weeks
  await page.evaluate(() => window.__DB.weeks.set('58_p1__h20260101000000', { histOf: '58_p1', n: 58, pisoId: 'p1', v: { frozenAt: '2026-09-20T00:00:00.000Z', items: {}, res: {}, snap: { i1: ['2026-09-21'] } }, unAt: '2026-01-01' }));
  await page.evaluate(() => { S.wk.set('58_p1__h20260101000000', { ...window.__dbGet('weeks', '58_p1__h20260101000000'), id: '58_p1__h20260101000000' }); return restoreWeek(58, 'p1', '58_p1__h20260101000000'); });
  expect((await page.evaluate(() => window.__dbGet('weeks', '58_p1'))).snap).toBeUndefined();
  expect((await page.evaluate(() => window.__dbGet('wsnap', '58_p1'))).snap).toEqual({ i1: ['2026-09-21'] });
  noErrors(errors, 'snap antiguo al descongelar');
});

const NV = (id, date, actId) => ['pdz', id, { kind: 'nova', date, actId, pisoId: 'p1', ts: 1, m: 'x' }];
test('M4 · «No va»: solo los últimos 45 días; un día más antiguo amplía la suscripción desde ese día', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind', extra: [NV('n1', '2026-09-30', 'i0'), NV('n2', '2026-08-01', 'i1')] });
  await page.evaluate(() => dayData([todayIso()], new Set(['p1'])));
  const nq = () => page.evaluate(() => window.__qlog.filter(q => q.n === 'pdz' && q.filters.some(f => f[0] === 'kind')).map(q => q.filters));
  await expect.poll(nq).toContainEqual([['kind', '==', 'nova'], ['date', '>=', '2026-08-17']]);
  expect((await nq()).some(f => f.length === 1)).toBe(false); // nunca la consulta sin límite
  await expect.poll(() => page.evaluate(() => NOVA.has('2026-09-30|i0'))).toBe(true);
  expect(await page.evaluate(() => NOVA.has('2026-08-01|i1'))).toBe(false);
  // Indicadores de una fecha vieja (o un reporte): se amplía desde ese día
  await page.evaluate(() => dayData(['2026-08-01'], new Set(['p1'])));
  await expect.poll(() => page.evaluate(() => NOVA.has('2026-08-01|i1'))).toBe(true);
  expect(await nq()).toContainEqual([['kind', '==', 'nova'], ['date', '>=', '2026-08-01']]);
  noErrors(errors, 'nova 45 días');
});

test('M4 · «No va» sin el índice pdz(kind, date) construido: se usa la consulta de antes y no falla nada', async ({ page }) => {
  await page.addInitScript(() => { window.__noIdx = true; });
  const errors = await openApp(page, { tab: 'ind', extra: [NV('n1', '2026-09-30', 'i0'), NV('n2', '2026-08-01', 'i1')] });
  page.on('console', () => {}); // el aviso del índice que falta es console.warn, no un error
  await page.evaluate(() => dayData([todayIso()], new Set(['p1'])));
  await expect.poll(() => page.evaluate(() => NOVA.has('2026-08-01|i1') && NOVA.has('2026-09-30|i0'))).toBe(true);
  expect(await page.evaluate(() => novaAll)).toBe(true);
  noErrors(errors, 'sin índice');
});
