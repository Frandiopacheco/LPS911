// P23 (oct 2026): la semana congelada vista desde el Plan diario. Estado de cada compromiso (cumplida, va bien, en riesgo,
// ya no llega) con la misma regla del avance del Tablero, la línea de la ficha, la pestaña «Semana» y su presentación.
// HOY = jueves 1 oct (semana 58: lun 28 sep – sáb 3 oct); quedan 2 días hábiles (vie y sáb).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const L = '2026-09-28', M = '2026-09-29', X = '2026-09-30', V = '2026-10-02', S = '2026-10-03';
const it = (sc, act, code, days, o = {}) => ({ sc, sector: 'S1', code, amb: 'Dpto ' + code, act, days, ord: days.length, ...o });
const items = {
  s1: it('c1', 'Pintura 1.ª mano', 'A-1', [L, M]),          // cumplida (lun y mar)
  s2: it('c1', 'Pintura 2.ª mano', 'A-2', [HOY, V]),        // hoy sin registro: faltan 2, quedan 2 → en riesgo
  s3: it('c2', 'Enchape', 'A-3', [L, M, X, HOY]),           // solo cumplió el lunes: faltan 3, quedan 2 → ya no llega
  s4: it('c2', 'Limpieza', 'A-4', [S]),                     // falta 1, quedan 2 → va bien
  s5: it('c2', 'Sellado', 'A-5', [X, HOY], { q: 10, qd: { [X]: 5, [HOY]: 5 } }), // metrado: ejecutó 10 el miércoles → cumplida
};
const ok = (exec = 1) => ({ status: 'ok', prog: exec, exec, by: 'ing@obra.pe', byName: 'Ing' });
const EXTRA = [
  ...Object.entries(items).map(([id, o]) => ['acts', id, { ambId: 'a1', sc: o.sc, name: o.act, days: o.days, order: 50 }]),
  ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-27T08:00:00.000Z', items, res: {}, snap: {} }],
  ['daily', L + '_p1', { date: L, pisoId: 'p1', recs: { s1: ok(), s3: ok() } }],
  ['daily', M + '_p1', { date: M, pisoId: 'p1', recs: { s1: ok(), s3: { status: 'no', prog: 1, exec: 0, by: 'ing@obra.pe' } } }],
  ['daily', X + '_p1', { date: X, pisoId: 'p1', recs: { s5: ok(10) } }],
];

test('Semana en el Plan diario: estados y pestaña (sin línea en la ficha ni Presentar)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: EXTRA });
  await expect.poll(() => page.evaluate(() => typeof semData === 'function' && semData('p1', todayIso()).frozen)).toBe(true);
  const st = await page.evaluate(() => Object.fromEntries(semData('p1', todayIso()).rows.map(r => [r.id, [r.st, r.falta, r.rem]])));
  expect(st).toEqual({ s1: ['ok', 0, 2], s2: ['risk', 2, 2], s3: ['no', 3, 2], s4: ['good', 1, 2], s5: ['ok', 0, 2] });
  // la evaluación del Plan semanal manda: un «Sí» la da por cumplida
  expect(await page.evaluate(() => { const w = S.wk.get('58_p1'); w.res = { s3: { ok: true } }; const r = semData('p1', todayIso()).rows.find(o => o.id === 's3'); w.res = {}; return r.st; })).toBe('ok');
  // oct 2026: la ficha ya no muestra la línea del plan semanal (los SC van en tren)
  // pestaña «Semana» del panel derecho: resumen por SC y, al elegir un SC, sus compromisos
  await page.locator('#mrst [data-rtab="msemb"]').click();
  const box = page.locator('#msemb');
  await expect(box).toBeVisible();
  await expect(box.locator('.smsc')).toHaveCount(2);
  await box.locator('.smsc[data-dzsc="c2"]').click();
  await expect(box.locator('.smr')).toHaveCount(3);
  await expect(box.locator('.smr').first()).toHaveClass(/bad/);
  await expect(box.locator('[data-semp]')).toHaveCount(0);
  // nada se escribió en la semana congelada
  expect((await page.evaluate(() => window.__dbGet('weeks', '58_p1'))).items).toEqual(items);
  noErrors(errors, 'semana en el plan diario');
});

test('Restricciones: compromiso del área después de lo requerido y confiabilidad de las áreas', async ({ page }) => {
  const R = (id, o) => ['restr', id, { actId: 's1', pisoId: 'p1', type: 'Materiales', desc: 'Pintura', resp: 'Logística', status: 'pend', created: L, ...o }];
  const errors = await openApp(page, { tab: 'restr', extra: [...EXTRA,
    R('r1', { need: M, comp: X }),                                        // compromiso tardío, pendiente y vencido
    R('r2', { need: X, comp: M, status: 'lib', freed: M }),               // a tiempo
    R('r3', { need: X, comp: M, status: 'lib', freed: X }),               // tarde
  ] });
  await expect(page.getByText('Compromiso tardío').first()).toBeVisible();
  const d = await page.evaluate(() => asRelData(58, new Set(['p1'])).T);
  expect(d).toEqual({ n: 3, ok: 1, late: 1, pend: 1, cl: 1 });
  noErrors(errors, 'restricciones compromiso');
});
