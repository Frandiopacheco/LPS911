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

test('N05: guardar una holgura no borra la que otro usuario guardó en otra actividad', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [['cli', 'buf', { all: 1, x: { e0: 3 } }]] });
  await page.evaluate(() => ensureCli());
  await page.waitForFunction(() => CLIB && CLIB.x && CLIB.x.e0 === 3);
  // esta sesión quedó con una copia vieja (sin el +3 de e0) y guarda +5 para e1
  await page.evaluate(() => { CLIB = { all: 1 }; bufSave('x', 'e1', 5, 'Holgura e1 +5'); });
  await expect.poll(() => page.evaluate(() => window.__dbGet('cli', 'buf').x)).toEqual({ e0: 3, e1: 5 });
  // quitar la de e1 tampoco toca la de e0
  await page.evaluate(() => bufSave('x', 'e1', null, 'Sin holgura propia'));
  await expect.poll(() => page.evaluate(() => window.__dbGet('cli', 'buf').x)).toEqual({ e0: 3 });
  noErrors(errors, 'N05');
});

test('N06: con el día cerrado, pasar un trabajo no programado al lookahead no deja un enlace roto', async ({ page }) => {
  const extra = [
    ['nprog', 'NP1', { date: HOY, pisoId: 'p1', ambId: 'a1', sc: 'c1', desc: 'Trabajo observado', exec: 2, und: 'ml', by: 'editor@obra.pe', byName: 'Elena Editora', ts: 1, photos: [] }],
    ['dplan', `${HOY}_p1`, { date: HOY, pisoId: 'p1', ids: { i0: null }, at: 1, by: 'editor@obra.pe' }],
  ];
  const errors = await openApp(page, { as: 'editor', tab: 'campo', extra });
  await page.waitForFunction(() => typeof NPM !== 'undefined' && NPM.has('NP1'));
  await page.evaluate(() => npOpen('NP1'));
  await page.locator('[data-npa="look"]').click();
  await expect(page.locator('#toast')).toContainText('ya está cerrado');
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => ({ mem: NPM.get('NP1').actId || null, db: window.__dbGet('nprog', 'NP1').actId || null })))
    .toEqual({ mem: null, db: null });
  await expect(page.locator('#toast')).not.toContainText('Agregado al lookahead');
  noErrors(errors, 'N06');
});

test('N07: la vista cliente se recalcula al cambiar el calendario (feriado, sábado no laborable)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: [['cli', 'buf', { all: 1 }]] });
  await page.evaluate(() => cliToggle());
  await page.waitForFunction(() => CLIB && CLIB.all === 1);
  const before = await page.evaluate(() => cliActs().get('e0').days);
  await page.evaluate(async () => { await fcol('meta').doc('project').update({ cal: { sat: false, hol: [{ d: '2026-10-02', n: 'Día no laborable' }] } }); });
  await page.waitForFunction(() => P().cal && P().cal.sat === false);
  const r = await page.evaluate(() => ({ got: cliActs().get('e0').days, want: cliShift(S.act.get('e0')).days }));
  expect(r.got).toEqual(r.want);
  expect(r.got).not.toEqual(before);
  noErrors(errors, 'N07');
});

test('N08: deshacer y rehacer quedan en el historial con referencia al cambio original', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await page.evaluate(() => { const x = S.act.get('t0'); apply([op('acts', 't0', { ...x, name: 'Nombre que se deshará' })], 'Cambio temporal'); });
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('lhlog')).length)).toBe(1);
  await page.locator('#bundo').click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 't0').name)).toBe('Tarrajeo de muros');
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('lhlog')).length)).toBe(2);
  const L = await page.evaluate(() => Object.entries(window.__dbAll('lhlog')).map(([id, d]) => ({ id, ...d })).sort((a, b) => a.id.localeCompare(b.id)));
  const orig = L.find(d => !d.undo), un = L.find(d => d.undo);
  expect(un.undo).toBe(orig.id);
  expect(un.label).toBe('Deshacer: Cambio temporal');
  expect(un.items[0]).toMatchObject({ id: 't0', k: 'mod', b: { name: 'Nombre que se deshará' }, a: { name: 'Tarrajeo de muros' } });
  await page.locator('#bredo').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('lhlog')).filter(d => d.redo).length)).toBe(1);
  noErrors(errors, 'N08');
});

test('N09: mover 151 actividades guarda el detalle de las 151 en el historial', async ({ page }) => {
  const ids = Array.from({ length: 151 }, (_, i) => 'bulk-' + String(i).padStart(3, '0'));
  const extra = ids.map((id, i) => ['acts', id, { ambId: 'a1', sc: 'c1', name: 'Trabajo ' + i, und: 'ml', days: [MANANA], order: 100 + i }]);
  const errors = await openApp(page, { tab: 'look', extra });
  await page.evaluate(ids => shiftActs(ids, 1, '2026-10-02', 'Mover 151 actividades'), ids);
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('lhlog')).reduce((n, d) => n + d.items.length, 0))).toBe(151);
  const docs = await page.evaluate(() => Object.values(window.__dbAll('lhlog')));
  expect(docs.length).toBe(2);
  expect(new Set(docs.map(d => d.g)).size).toBe(1);
  // la ventana las junta en un solo cambio con las 151
  const merged = await page.evaluate(() => histMerge(Object.entries(window.__dbAll('lhlog')).map(([id, d]) => ({ ...d, id }))));
  expect(merged.length).toBe(1);
  expect(merged[0].items.map(x => x.id).sort()).toEqual(ids);
  noErrors(errors, 'N09');
});

test('N10: un piso archivado sigue en el PPC histórico de «Todos los pisos»', async ({ page }) => {
  const extra = [['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00Z', items: { i0: { sc: 'c1', act: 'Redes', code: 'A-1', amb: 'Dpto 101', days: [HOY] } }, res: { i0: { ok: true } }, snap: { i0: [HOY] } }]];
  const errors = await openApp(page, { tab: 'ind', extra });
  await page.evaluate(() => { U.indMode = 'sem'; U.piso = ''; render(); });
  await page.evaluate(() => { apply([arc('pisos', 'p1')], 'Piso archivado'); });
  await expect.poll(() => page.evaluate(() => S.pis.has('p1'))).toBe(false);
  expect(await page.evaluate(() => (ppcWeekAgg(58, histPisoSet()) || {}).ppc)).toBe(1);
  await page.evaluate(() => render());
  await expect(page.locator('#main')).not.toContainText('Sin semanas evaluadas');
  noErrors(errors, 'N10');
});

test('N11: en el celular, al repartir una cuadrilla «Equipos del día» se pliega y no tapa los números', async ({ page }) => {
  const { LAMINA } = await import('./lamina.js');
  await page.setViewportSize({ width: 390, height: 844 });
  const AMB = [['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }]];
  const T1 = ['acts', 's9', { ambId: 'a1', sc: 'c1', name: 'Pruebas hidráulicas', und: 'pto', days: [MANANA], order: 15 }];
  const F = ['pdz', 'fz_' + MANANA + '_c1', { date: MANANA, sc: 'c1', kind: 'fza', items: [{ cat: 'Operario', esp: '', n: 2 }], cuad: [{ id: 'C1', n: 2 }], hor: { t: 'n', fin: '17:00' }, asg: {}, sinDist: false, ts: 1 }];
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, T1, F] });
  await page.waitForFunction(() => window.__plano && window.__plano.M);
  await page.evaluate(() => { const M = window.__plano.M; M.cqOn = true; M.panel = false; requestRender(); });
  await expect(page.locator('#mfzb .mpdl')).toHaveCount(1); // abierto antes de elegir
  await page.locator('#mcqb [data-cqd="C1"]').click();
  await expect(page.locator('#mfzb .mpdl')).toHaveCount(0); // plegado mientras se reparte
  // el número de la actividad queda accesible: lo que hay bajo su centro es la etiqueta, no un recuadro
  const lb = await page.locator('#mstage .pvl[data-z="v:s9"]').boundingBox();
  expect(await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return !!(el && el.closest('#mstage .pvl')); }, [lb.x + lb.width / 2, lb.y + lb.height / 2])).toBe(true);
  await page.locator('#mstage .pvl[data-z="v:s9"]').click();
  await expect.poll(() => page.evaluate(d => (window.__dbGet('pdz', 'fz_' + d + '_c1').asg?.s9 || {}).c, MANANA)).toBe('C1');
  await page.locator('#pop [data-do="no"]').click();
  await expect(page.locator('#mfzb .mpdl')).toHaveCount(1); // al terminar vuelve a verse
  noErrors(errors, 'N11');
});
