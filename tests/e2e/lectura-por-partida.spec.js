// SEG-05, paso 1 (decidido con el dueño, oct 2026): el subcontratista pide solo lo de SU partida en nprog (no programado),
// lhprop (su documento), lhphist (historial de propuestas), mcatp (propuestas al catálogo) y mlog (sus cambios en la Matriz),
// y en Indicadores ve solo su PPC. El lookahead de todos sigue a la vista. El Firebase falso no aplica reglas: se revisa lo que
// llega a la página (NPM, PROP, LHH, MX.prop, MX.log) y las consultas que pidió (window.__qlog).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const T = Date.parse('2026-09-30T15:00:00Z');
const sk = (sc, t) => sc + '|' + String(t).padStart(15, '0');
const hist = (sc, actId, t) => ['lhphist', `${sc}_${actId}_${t}`, { sc, actId, sk: sk(sc, t), st: 'rej', kind: 'mod', id: actId, name: 'x', amb: 'A-1 Dpto 101', from: '', to: '', note: '', t, by: 'editor@obra.pe', n: 'Elena', sentAt: t - 1000, sent0: t - 1000, late: null, lateNote: '', prop: {}, chg: null }];
const np = (id, sc, date) => ['nprog', id, { date, pisoId: 'p1', ambId: 'a1', sc, desc: 'Trabajo de ' + sc, und: '', exec: null, note: '', photos: [], pt: null, by: 'campo@obra.pe', byName: 'Campo', ts: 1 }];
const OTRAS = [
  np('n1', 'c1', HOY), np('n2', 'c2', HOY), np('n3', 'c3', HOY), np('nviejo', 'c1', '2026-01-05'),
  ['lhprop', 'c1', { sc: 'c1', items: { i0: { after: null, base: { name: 'Redes' }, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: false } } }],
  ['lhprop', 'c2', { sc: 'c2', items: { e0: { after: null, base: { name: 'Entubado' }, ts: 1, by: 'otro@obra.pe', n: 'Otro', sent: true, sentAt: 1 } } }],
  hist('c1', 'i0', T), hist('c2', 'e0', T + 1), hist('c3', 't0', T + 2),
  ['mcatp', 'm1', { sc: 'c1', name: 'Prop. de c1', st: 'pend' }], ['mcatp', 'm2', { sc: 'c2', name: 'Prop. de c2', st: 'pend' }],
  ['mlog', 'l1', { sc: 'c1', st: 'pend', amb: 'a1', cat: 'k1', t: 1 }], ['mlog', 'l2', { sc: 'c2', st: 'pend', amb: 'a1', cat: 'k2', t: 1 }],
];
const PIDE = ['nprog', 'lhphist', 'mcatp', 'mlog'];

/* lo que tiene la página y lo que pidió */
const estado = page => page.evaluate(PIDE => ({
  np: [...NPM.values()].map(n => n.id).sort(),
  prop: [...PROP.keys()].sort(),
  lhh: [...LHH.values()].map(h => h.sc).sort(),
  mcatp: [...MX.prop.values()].map(p => p.sc).sort(),
  mlog: [...MX.log.values()].map(l => l.sc).sort(),
  /* consultas a esas colecciones sin where('sc','==',…) y lecturas de lhprop entera */
  sinSc: window.__qlog.filter(q => PIDE.includes(q.n) && !q.filters.some(f => f[0] === 'sc' && f[1] === '==')).map(q => q.n),
  lhpropCol: window.__qlog.filter(q => q.n === 'lhprop').length,
}), PIDE);

async function abrirTodo(page) {
  await page.evaluate(() => { ensureProp(); ensureLhh(); ensureMx(); ensureNP('2026-09-20'); });
}

test('el SC recibe solo nprog, lhprop, lhphist, mcatp y mlog de su partida', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: OTRAS });
  await abrirTodo(page);
  await expect.poll(async () => (await estado(page)).lhh.length).toBe(1);
  await expect.poll(async () => (await estado(page)).mlog.length).toBe(1);
  const e = await estado(page);
  expect(e.np).toEqual(['n1']);
  expect(e.prop).toEqual(['c1']);
  expect(e.lhh).toEqual(['c1']);
  expect(e.mcatp).toEqual(['c1']);
  expect(e.mlog).toEqual(['c1']);
  expect(e.sinSc).toEqual([]);
  expect(e.lhpropCol).toBe(0);
  /* el lookahead sigue completo: filas de los tres SC */
  expect(await page.evaluate(() => [...new Set([...S.act.values()].map(x => x.sc))].sort())).toEqual(['c1', 'c2', 'c3']);
  /* Historial del lookahead › Propuestas: solo las decisiones de su partida */
  await page.evaluate(async () => { HST.d = '2026-09-30'; histOpen(); });
  await expect.poll(() => page.evaluate(() => HST.P ? HST.P.map(h => h.sc) : null)).toEqual(['c1']);
  expect((await estado(page)).sinSc).toEqual([]);
  noErrors(errors, 'SC por partida');
});

test('sin el índice compuesto (en construcción) el SC lee toda su partida y filtra en la página; la app no se queda en «Conectando…»', async ({ page }) => {
  await page.addInitScript(() => { window.__noIdx = true; });
  const errors = await openApp(page, { as: 'sc', tab: 'look', extra: OTRAS });
  await abrirTodo(page);
  await expect.poll(async () => (await estado(page)).lhh.length).toBe(1);
  const e = await estado(page);
  expect(e.np).toEqual(['n1']); /* «nviejo» (enero) queda fuera por la fecha, aunque es de su partida */
  expect(e.lhh).toEqual(['c1']);
  expect(e.sinSc).toEqual([]);
  await page.evaluate(async () => { HST.d = '2026-09-30'; histOpen(); });
  await expect.poll(() => page.evaluate(() => HST.P ? HST.P.map(h => h.sc) : null)).toEqual(['c1']);
  await expect(page.locator('#loading')).toHaveCount(0);
  noErrors(errors.filter(x => !/requires an index/.test(x)), 'SC sin índice');
});

test('los demás roles siguen leyendo todo (el ingeniero ve las propuestas de todos los SC)', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: OTRAS });
  await page.evaluate(() => { ensureProp(); ensureMx(); ensureNP('2026-09-20'); });
  await expect.poll(async () => (await estado(page)).prop).toEqual(['c1', 'c2']);
  await expect.poll(async () => (await estado(page)).np).toEqual(['n1', 'n2', 'n3']);
  expect((await estado(page)).mcatp).toEqual(['c1', 'c2']);
  noErrors(errors, 'editor');
});

/* semana 58 (la de HOY) congelada en P1: c1 cumplió, c2 no (Materiales), c3 cumplió. Del día: c1 cumplió, c2 no. */
const PPC = [
  ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00Z', items: {
    i0: { sc: 'c1', act: 'Redes empotradas', code: 'A-1', amb: 'Dpto 101', days: [HOY] },
    e0: { sc: 'c2', act: 'Entubado empotrado', code: 'A-1', amb: 'Dpto 101', days: [HOY] },
    t0: { sc: 'c3', act: 'Tarrajeo de muros', code: 'A-1', amb: 'Dpto 101', days: [HOY] } },
    res: { i0: { ok: true }, e0: { ok: false, cnc: 'Materiales' }, t0: { ok: true } } }],
  ['daily', HOY + '_p1', { date: HOY, pisoId: 'p1', recs: {
    i0: { status: 'ok', sc: 'c1', nm: 'Redes empotradas', ambId: 'a1', by: 'campo@obra.pe', ts: 1 },
    e0: { status: 'no', cnc: 'Materiales', note: 'Sin tubo', sc: 'c2', nm: 'Entubado empotrado', ambId: 'a1', by: 'campo@obra.pe', ts: 1 } }, extra: {} }],
];

test('Indicadores: el SC ve solo su PPC (semanal y diario), sin presentación ni exportes', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'ind', extra: PPC });
  const main = page.locator('#main');
  await page.evaluate(() => { U.indMode = 'sem'; U.week = 58; render(); });
  await expect(main).toContainText('PPC semanal (oficial)');
  await expect(main.locator('.tile').first()).toContainText('100');
  for (const otro of ['SC ELECTRICAS', 'SC TARRAJEO']) await expect(main).not.toContainText(otro);
  await expect(main).toContainText('SC SANITARIAS');
  await expect(main.locator('#bxppc, #bipr, #bpdf')).toHaveCount(0);
  await page.evaluate(() => { U.indMode = 'dia'; render(); });
  await expect(main).toContainText('PPC diario');
  await expect(main.locator('.tile').first()).toContainText('100');
  await expect(main).not.toContainText('SC ELECTRICAS');
  await expect(main.locator('#bxppc, #bipr, #bpdf')).toHaveCount(0);
  noErrors(errors, 'Indicadores SC');
});

test('Indicadores: el ingeniero sigue viendo el PPC de toda la obra', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'ind', extra: PPC });
  const main = page.locator('#main');
  await page.evaluate(() => { U.indMode = 'sem'; U.week = 58; render(); });
  await expect(main.locator('.tile').first()).toContainText('67');
  await expect(main).toContainText('SC ELECTRICAS');
  await expect(main.locator('#bxppc')).toHaveCount(1);
  noErrors(errors, 'Indicadores editor');
});
