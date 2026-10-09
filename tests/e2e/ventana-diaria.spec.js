// Ventana viva + rangos antiguos (auditoría C8/P8): volver semanas atrás ya no reabre la suscripción de registros del día
// y planes cerrados desde una fecha cada vez más temprana (bajaba todo otra vez en cada paso). Se escucha en vivo como mucho
// 21 días; lo anterior se lee una sola vez por rango (desde el lunes) y se junta en los mismos datos.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

/* cuenta las suscripciones (onSnapshot) y lecturas (get) de daily y dplan, con sus filtros */
const contar = page => page.addInitScript(() => {
  let fb; window.__subs = []; window.__gets = [];
  Object.defineProperty(window, 'firebase', { configurable: true, get: () => fb, set: v => {
    fb = v; const f0 = v.firestore;
    const wq = (q, n, f) => ({ ...q, where: (...a) => wq(q.where(...a), n, [...f, a.join(' ')]),
      onSnapshot: (...a) => { window.__subs.push(n + ' ' + f.join(' & ')); return q.onSnapshot(...a); },
      get: (...a) => { window.__gets.push(n + ' ' + f.join(' & ')); return q.get(...a); } });
    const wrap = () => { const fs = f0(); if (!fs.__c) { fs.__c = 1; const oc = fs.collection; fs.collection = n => { const c = oc(n); return n === 'daily' || n === 'dplan' ? wq(c, n, []) : c; }; } return fs; };
    v.firestore = Object.assign(wrap, f0);
  } });
});

test('volver semanas atrás: una sola suscripción reciente y una lectura por rango antiguo, sin repetir', async ({ page }) => {
  await contar(page);
  const viejo = (d, p) => [['daily', d + '_' + p, { date: d, pisoId: p, recs: { i0: { status: 'ok', note: 'viejo ' + d } }, extra: {} }], ['dplan', d + '_' + p, { date: d, pisoId: p, ids: { i0: null } }]];
  const errors = await openApp(page, { as: 'campo', tab: 'campo', extra: [...viejo('2026-08-20', 'p1'), ...viejo('2026-09-03', 'p1'), ...viejo('2026-09-25', 'p1')] });
  const r = await page.evaluate(async ({ HOY }) => {
    const s0 = window.__subs.length;
    /* como Indicadores/En obra/Lookahead al ir hacia atrás, paso a paso (un día y una semana cada vez) */
    for (const n of [-20, -25, -30, -31, -35, -45, -46, -44, -30]) await ensureDaily(addD(HOY, n));
    const subs = window.__subs.slice(s0), gets = window.__gets.slice();
    /* otro usuario cambia un registro reciente: llega en vivo y no se pierde lo antiguo ya leído */
    await firebase.firestore().collection('daily').doc('2026-09-25_p1').set({ recs: { i1: { status: 'no', note: 'en vivo' } } }, { merge: true });
    for (let i = 0; i < 100 && DAY.get('2026-09-25_p1')?.recs?.i1?.note !== 'en vivo'; i++) await new Promise(ok => setTimeout(ok, 10));
    return { subs, gets, old: DAY.get('2026-08-20_p1')?.recs?.i0?.note, mid: DAY.get('2026-09-03_p1')?.recs?.i0?.note, live: DAY.get('2026-09-25_p1')?.recs?.i1?.note,
      dOld: !!DPL.get('2026-08-20_p1'), dMid: !!DPL.get('2026-09-03_p1'), dayFrom, dplFrom };
  }, { HOY });
  /* la suscripción baja una vez hasta hace 21 días (10-sep) y ya no se vuelve a abrir */
  expect(r.subs).toEqual(['dplan date >= 2026-09-10', 'daily date >= 2026-09-10']);
  expect([r.dayFrom, r.dplFrom]).toEqual(['2026-09-10', '2026-09-10']);
  /* lecturas antiguas: desde el lunes de la semana pedida hasta donde ya había, sin repetir rangos */
  expect(r.gets).toEqual([
    'dplan date >= 2026-08-31 & date < 2026-09-10', 'daily date >= 2026-08-31 & date < 2026-09-10',
    'dplan date >= 2026-08-24 & date < 2026-08-31', 'daily date >= 2026-08-24 & date < 2026-08-31',
    'dplan date >= 2026-08-17 & date < 2026-08-24', 'daily date >= 2026-08-17 & date < 2026-08-24',
    'dplan date >= 2026-08-10 & date < 2026-08-17', 'daily date >= 2026-08-10 & date < 2026-08-17',
  ]);
  expect([r.old, r.mid, r.live, r.dOld, r.dMid]).toEqual(['viejo 2026-08-20', 'viejo 2026-09-03', 'en vivo', true, true]);
  noErrors(errors, 'ventana diaria');
});

test('Indicadores: ir varias semanas hacia atrás muestra el PPC de esos días (leídos una vez)', async ({ page }) => {
  await contar(page);
  const errors = await openApp(page, { as: 'admin', tab: 'ind' });
  await page.evaluate(async () => { U.indMode = 'sem'; for (let i = 0; i < 6; i++) { U.week--; render(); await new Promise(ok => setTimeout(ok, 30)); } });
  await expect(page.locator('#main')).not.toContainText('No se pudo mostrar');
  const r = await page.evaluate(() => ({ subs: window.__subs.filter(s => s.startsWith('daily')).length, dayFrom }));
  expect(r.subs, 'una sola suscripción de registros del día por mucho que se retroceda').toBeLessThanOrEqual(2);
  noErrors(errors, 'indicadores hacia atrás');
});
