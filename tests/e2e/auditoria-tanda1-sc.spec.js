// Auditoría tanda 1 · frente C «Historia de SC» (C-28/DAT-01 y C-30/DAT-04). Hoy = 1-oct-2026 (jue, semana 58).
// Adaptadas de simulacion-obra.spec.js (DAT-01, DAT-04, DAT-04b): fallaban con el código anterior.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

const IT = (sc, i) => ({ sc, sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Tarea ' + i, days: ['2026-09-29'], ord: i });
function sem(n, pid, sc, tot, ok) {
  const items = {}, res = {};
  for (let i = 0; i < tot; i++) { const id = `w${n}${pid}_${i}`; items[id] = IT(sc, i); if (i < ok) res[id] = { ok: true, cnc: '', note: '' }; }
  return ['weeks', `${n}_${pid}`, { n, pisoId: pid, frozenAt: '2026-09-19T18:00:00.000Z', items, res }];
}

/* C-28 / DAT-01 */
test('C-28 · «×» en Configuración archiva el SC: sigue en el historial y se restaura desde la Papelera', async ({ page }) => {
  const extra = [['contractors', 'c4', { name: 'SC DRYWALL', partida: 'Drywall', color: '#884488' }], sem(57, 'p1', 'c4', 5, 4)];
  const errors = await openApp(page, { tab: 'cfg', extra });
  page.on('dialog', d => d.accept());
  await page.evaluate(() => { U.cfgV = 'sc'; render(); });
  const btn = page.locator('[data-cdel="c4"]');
  await expect(btn).toHaveCount(1);
  await btn.click();
  await expect.poll(() => page.evaluate(() => !S.con.has('c4') && ARCH.con.has('c4'))).toBe(true);
  const doc = await page.evaluate(() => window.__dbGet('contractors', 'c4'));
  expect(doc, 'el documento no se borra').toBeTruthy();
  expect(doc.arch && doc.arch.t, 'queda archivado con arch:{t,by,n}').toBeTruthy();
  expect(doc.arch.by).toBe('frandiopacheco@gmail.com');
  expect(await page.evaluate(() => conOf('c4').name), 'el historial sigue resolviendo su nombre').toBe('SC DRYWALL');
  // ya no se ofrece en la lista de Configuración ni en los selectores
  await expect(page.locator('[data-c="c4"][data-f="name"]')).toHaveCount(0);
  // semana congelada 57: el Plan semanal sigue mostrando su nombre
  await page.evaluate(() => { U.week = 57; U.piso = ''; U.pisoAll = true; goTab('plan'); });
  await expect(page.locator('#main')).toContainText('SC DRYWALL');
  // Papelera: aparece y se restaura
  await page.evaluate(() => { U.cfgV = 'arc'; goTab('cfg'); });
  const rest = page.locator('[data-arcr="contractors|c4"]');
  await expect(rest).toHaveCount(1);
  await rest.click();
  await expect.poll(() => page.evaluate(() => S.con.has('c4') && !ARCH.con.has('c4'))).toBe(true);
  expect((await page.evaluate(() => window.__dbGet('contractors', 'c4'))).arch).toBeFalsy();
  noErrors(errors, 'C-28');
});

test('C-28 · restaurar una actividad cuyo SC está en la Papelera recupera también el SC', async ({ page }) => {
  const extra = [['contractors', 'c4', { name: 'SC DRYWALL', partida: 'Drywall', color: '#884488', arch: { t: 1, by: 'x', n: 'x' } }],
    ['acts', 'zd', { ambId: 'a1', sc: 'c4', name: 'Drywall', und: 'm2', days: [MANANA], order: 90, arch: { t: 2, by: 'x', n: 'x' } }]];
  const errors = await openApp(page, { tab: 'cfg', extra });
  expect(await page.evaluate(() => [S.con.has('c4'), ARCH.con.has('c4'), conOf('c4').name])).toEqual([false, true, 'SC DRYWALL']);
  await page.evaluate(() => archRestore('acts', 'zd'));
  await expect.poll(() => page.evaluate(() => S.act.has('zd') && S.con.has('c4'))).toBe(true);
  noErrors(errors, 'C-28b');
});

/* C-30 / DAT-04 (a) */
test('C-30a · pasar una fila a otro SC no hace desaparecer el cierre que su capataz reportó días antes (su «Culminado» no cuenta como terminada: tanda 1)', async ({ page }) => {
  const D0 = '2026-09-29';
  const Z4 = ['acts', 'z4', { ambId: 'a1', sc: 'c1', name: 'Detección de incendio', und: 'pto', days: [D0, '2026-09-30', HOY, MANANA], order: 50 }];
  const LV = ['live', `${D0}_z4`, { date: D0, pisoId: 'p1', actId: 'z4', sc: 'c1', close: { status: 'ok', done: true, by: 'u_cap1', n: 'Capataz SANITARIAS', t: Date.parse(D0 + 'T16:30:00-05:00') } }];
  // hoy: cierre con el SC anterior, sin plan publicado que diga de quién era: hoy no cuenta (puede ser de otra partida)
  const LH = ['live', `${HOY}_z4`, { date: HOY, pisoId: 'p1', actId: 'z4', sc: 'c1', close: { status: 'no', cnc: 'Materiales', by: 'u_cap1', n: 'Capataz SANITARIAS', t: Date.parse(HOY + 'T16:30:00-05:00') } }];
  const errors = await openApp(page, { tab: 'look', extra: [Z4, LV, LH] });
  await page.evaluate(d => ensureLive(d), D0);
  await expect.poll(() => page.evaluate(d => LIVE.has(d + '_z4'), D0)).toBe(true);
  await page.evaluate(() => doneRebuild());
  const antes = await page.evaluate(d => ({ rec: !!recOf(d, 'z4'), done: DONE.get('z4') || null }), D0);
  expect(antes, 'control: el cierre cuenta; el «Culminado» del capataz no es terminada').toEqual({ rec: true, done: null });
  await page.evaluate(() => apply([op('acts', 'z4', { ...S.act.get('z4'), sc: 'c2' })]));
  await expect.poll(() => page.evaluate(() => S.act.get('z4').sc)).toBe('c2');
  await page.evaluate(() => doneRebuild());
  const despues = await page.evaluate(([d, h]) => ({ rec: !!recOf(d, 'z4'), sc: (recOf(d, 'z4') || {}).sc, done: DONE.get('z4') || null, hoy: !!recOf(h, 'z4') }), [D0, HOY]);
  expect(despues, 'el cierre del 29-sep sigue contando, a nombre del SC de ese día; el de hoy (otro SC, sin plan) no').toEqual({ rec: true, sc: 'c1', done: null, hoy: false });
  // con el plan de hoy publicado a nombre de c1 (dplan.who), el cierre de hoy también es de su SC
  await page.evaluate(h => { DPL.set(h + '_p1', { date: h, pisoId: 'p1', ids: { z4: null }, who: { z4: { sc: 'c1', amb: 'a1' } } }); }, HOY);
  expect(await page.evaluate(h => !!recOf(h, 'z4'), HOY)).toBe(true);
  noErrors(errors, 'C-30a');
});

/* C-30 / DAT-04 (b) */
test('C-30b · renombrar el SC en Configuración pasa sus restricciones al nombre nuevo (también las antiguas, solo con nombre)', async ({ page }) => {
  const R = ['restr', 'rx', { actId: 'i0', pisoId: 'p1', type: 'Materiales', desc: 'Falta tubería', resp: 'SC SANITARIAS', need: '2026-10-05', freed: '', status: 'pend', created: '2026-09-29', sc: 'c1', by: 'frandiopacheco@gmail.com' }];
  const RO = ['restr', 'ry', { actId: 'i0', pisoId: 'p1', type: 'Materiales', desc: 'Otra', resp: 'Editor', need: '2026-10-05', freed: '', status: 'pend', created: '2026-09-29', sc: 'c1', by: 'frandiopacheco@gmail.com' }];
  const errors = await openApp(page, { tab: 'cfg', extra: [R, RO] });
  await page.evaluate(() => { U.cfgV = 'sc'; render(); });
  const inp = page.locator('[data-c="c1"][data-f="name"]');
  await inp.fill('ICR-ACI');
  await inp.press('Tab');
  await expect.poll(() => page.evaluate(() => conOf('c1').name)).toBe('ICR-ACI');
  await expect.poll(() => page.evaluate(() => window.__dbGet('restr', 'rx'))).toMatchObject({ resp: 'ICR-ACI', respSc: 'c1' });
  const ry = await page.evaluate(() => window.__dbGet('restr', 'ry'));
  expect(ry.resp, 'una restricción a cargo de otra persona no cambia').toBe('Editor');
  expect(ry.respSc).toBeFalsy();
  noErrors(errors, 'C-30b');
});

test('C-30b · el usuario SC sigue viendo sus restricciones aunque cambie el nombre de su empresa (responsable por id)', async ({ page }) => {
  const R = ['restr', 'rx', { actId: 'i0', pisoId: 'p1', type: 'Materiales', desc: 'Falta tubería', resp: 'SC SANITARIAS', respSc: 'c1', need: '2026-10-05', freed: '', status: 'pend', created: '2026-09-29', sc: 'c1', by: 'frandiopacheco@gmail.com' }];
  const errors = await openApp(page, { as: 'sc', tab: 'restr', extra: [R], editar: false });
  await expect.poll(() => page.evaluate(() => S.res.has('rx'))).toBe(true);
  expect(await page.evaluate(() => restrMine(S.res.get('rx'))), 'control').toBe(true);
  await page.evaluate(() => { const c = S.con.get('c1'); S.con.set('c1', { ...c, name: 'ICR-ACI' }); render(); });
  expect(await page.evaluate(() => restrMine(S.res.get('rx'))), 'tras renombrar, por id sigue siendo suya').toBe(true);
  expect(await page.evaluate(() => rWho(S.res.get('rx'))), 'se muestra con el nombre actual').toBe('ICR-ACI');
  await expect(page.locator('#main [data-r="rx"]').first()).toBeAttached();
  await expect(page.locator('#main')).not.toContainText('ICR-ACI (no está en el equipo)');
  // una restricción nueva de su partida guarda el id de la empresa
  const n0 = await page.evaluate(() => S.res.size);
  await page.evaluate(() => newRestr('i0'));
  await expect.poll(() => page.evaluate(() => S.res.size)).toBe(n0 + 1);
  const nueva = await page.evaluate(() => [...S.res.values()].find(r => r.id !== 'rx' && r.by === me.email && r.actId === 'i0'));
  expect(nueva && nueva.respSc).toBe('c1');
  noErrors(errors, 'C-30b-sc');
});
