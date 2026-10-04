// Auditoría externa (ChatGPT) del commit 02e575c: una prueba de regresión por hallazgo aprobado.
// Las reglas (N01–N03) se prueban en tests/rules; aquí, lo que hace la página.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

test('N01: un cierre en vivo de otra partida no termina ni compromete la actividad', async ({ page }) => {
  // e0 es de Eléctricas (c2); el documento dice Sanitarias (c1)
  const FOREIGN = ['live', `${HOY}_e0`, { date: HOY, pisoId: 'p1', actId: 'e0', sc: 'c1', close: { status: 'ok', done: true, by: 'u_cap1', n: 'Capataz SANITARIAS', t: 1 } }];
  const OWN = ['live', `${HOY}_i0`, { date: HOY, pisoId: 'p1', actId: 'i0', sc: 'c1', close: { status: 'ok', done: false, by: 'u_cap1', n: 'Capataz SANITARIAS', t: 1 } }];
  const errors = await openApp(page, { tab: 'campo', extra: [FOREIGN, OWN] });
  await page.evaluate(d => ensureLive(d), HOY);
  await expect.poll(() => page.evaluate(d => !!(recOf(d, 'i0') || {})._prop, HOY)).toBe(true);
  expect(await page.evaluate(d => ({ done: DONE.has('e0'), rec: recOf(d, 'e0'), dates: doneDates('e0'), tm: schedOn(S.act.get('e0'), '2026-10-02') }), HOY))
    .toEqual({ done: false, rec: null, dates: [], tm: true });
  noErrors(errors, 'N01');
});

test('N04: «Cumplido» en Campo se mide contra la cantidad del plan cerrado, no la rebajada después', async ({ page }) => {
  const extra = [
    ['acts', 'e0', { ambId: 'a1', sc: 'c2', name: 'Entubado empotrado', und: 'ml', metrado: 40, qty: { [HOY]: 20 }, days: [HOY], order: 20 }],
    ['dplan', `${HOY}_p1`, { date: HOY, pisoId: 'p1', ids: { e0: 20 }, at: 1, by: 'frandiopacheco@gmail.com' }],
  ];
  const errors = await openApp(page, { tab: 'look', extra });
  page.on('dialog', d => d.accept());
  // el administrador rebaja la programación a 10 (acepta el aviso de día cerrado)
  await page.evaluate(d => { const x = S.act.get('e0'); apply([op('acts', 'e0', { ...x, qty: { [d]: 10 } })], 'Corrección'); }, HOY);
  await expect.poll(() => page.evaluate(d => window.__dbGet('acts', 'e0').qty[d], HOY)).toBe(10);
  await page.evaluate(() => { goTab('campo'); CU.view = 'list'; render(); });
  await page.locator('article[data-a="e0"] [data-st="ok"]').click();
  await expect.poll(() => page.evaluate(d => (window.__dbGet('daily', d + '_p1')?.recs?.e0 || {}).status, HOY)).toBe('ok');
  const r = await page.evaluate(d => window.__dbGet('daily', d + '_p1').recs.e0, HOY);
  expect([r.prog, r.exec]).toEqual([20, 20]);
  noErrors(errors, 'N04');
});

test('seguimiento N10: el PPC del cliente no cuenta un cierre del capataz que el ingeniero quitó', async ({ page }) => {
  const sn = { secs: { s1: { pisoId: 'p1', code: 'S1', name: 'Sector 1', order: 1 } }, ambs: { a1: { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0 } },
    acts: { e0: { ambId: 'a1', sc: 'c2', name: 'Entubado empotrado', und: 'ml', metrado: 40, days: [HOY], order: 20 } } };
  const base = [
    ['cli', 'buf', { all: 0 }],
    ['clidx', 'c0', { label: 'Emitida S58', date: '2026-09-28', ts: 1, week: 58, pisos: { p1: { code: 'P1', name: 'Primer piso' } } }],
    ['cliver', 'c0__p1', { piso: { code: 'P1', name: 'Primer piso', order: 1 }, json: JSON.stringify(sn) }],
    ['live', `${HOY}_e0`, { date: HOY, pisoId: 'p1', actId: 'e0', sc: 'c2', close: { status: 'ok', by: 'cap', n: 'Capataz', t: 1 } }],
  ];
  const ppc = async () => { await page.evaluate(d => { ensureLive(d); ensureCli(); }, HOY); await page.waitForFunction(() => CLVD.get('c0') && CLVD.get('c0').ready);
    return page.evaluate(() => cliPpc(new Set(['p1'])).W.find(o => o.w === 58).ppc); };
  let errors = await openApp(page, { tab: 'campo', extra: base });
  expect(await ppc()).toBe(1); // control: sin quitar, el cierre del capataz cuenta
  noErrors(errors, 'N10 control');
  await page.context().clearCookies();
  const p2 = await page.context().newPage(); page = p2;
  errors = await openApp(page, { tab: 'campo', extra: [...base, ['daily', `${HOY}_p1`, { date: HOY, pisoId: 'p1', recs: { e0: { status: null, clr: true } } }]] });
  await page.evaluate(d => ensureDaily(d), HOY);
  expect(await ppc()).not.toBe(1);
  noErrors(errors, 'N10');
});
