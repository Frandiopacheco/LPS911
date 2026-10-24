// Auditoría tanda 3 · frente H (lookahead, catálogo, no programado, plan semanal, Hoy).
// C-31 filas con historial (pegar, «no está en el catálogo», propuestas), C-37, CON-08, C-33, CON-11, DAT-11, LPS-11 y PER-10.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

const PROJ = { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28' };
const get = (page, c, id) => page.evaluate(([c, id]) => window.__dbGet(c, id), [c, id]);
const acts = page => page.evaluate(() => Object.values(window.__dbAll('acts')).filter(a => !a.arch));
const nameIn = (page, a) => page.locator(`#grid .ci[data-a="${a}"][data-f="name"]`);
/* i0 tiene historial: un día pasado (30/09) y un registro de Campo; sin hoy, para que su propuesta no toque un día cerrado */
const I0 = { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days: ['2026-09-30', '2026-10-05'], order: 10 };

test('C-31 (1): pegar varias líneas en el nombre no renombra una fila con historial (editor); sin historial sí', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  await page.evaluate(() => pasteActs('i0', ['SC ELECTRICAS\tCableado', 'SC ELECTRICAS\tTomacorrientes']));
  await expect(page.locator('#toast')).toContainText('solo el administrador');
  await expect.poll(async () => (await acts(page)).filter(a => a.ambId === 'a1' && ['Cableado', 'Tomacorrientes'].includes(a.name)).map(a => [a.name, a.sc]).sort())
    .toEqual([['Cableado', 'c2'], ['Tomacorrientes', 'c2']]);
  const i0 = await get(page, 'acts', 'i0');
  expect([i0.name, i0.sc]).toEqual(['Redes empotradas', 'c1']);
  // t1 (sin historial): la primera línea la renombra
  await page.evaluate(() => pasteActs('t1', ['Solaqueo', 'Pintura']));
  await expect.poll(async () => (await get(page, 'acts', 't1')).name).toBe('Solaqueo');
  expect((await acts(page)).some(a => a.ambId === 'a2' && a.name === 'Pintura')).toBe(true);
  noErrors(errors, 'pegar');
});

test('C-31 (2): «no está en el catálogo» en una fila con historial agrega una fila nueva (editor), no la renombra', async ({ page }) => {
  const extra = [['meta', 'project', { ...PROJ, catReq: true }],
    ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
    ['mcat', 'k3', { name: 'Pruebas hidráulicas', sc: 'c1', cl: 't', al: ['pruebas hidraulicas'], ord: 20 }]];
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra });
  await nameIn(page, 'i0').fill('Pruebas de presión');
  await nameIn(page, 'i0').press('Enter');
  await expect(page.locator('.lqm')).toContainText('ya tiene historial');
  await page.locator('.lqm [data-mxuse="k3"]').click();
  await expect.poll(async () => (await acts(page)).filter(a => a.ambId === 'a1' && a.name === 'Pruebas hidráulicas').length).toBe(1);
  expect((await get(page, 'acts', 'i0')).name).toBe('Redes empotradas');
  noErrors(errors, 'catálogo historial');
});

test('C-31 (3): aceptar una propuesta que renombra una fila con historial: el editor acepta los días; el admin todo', async ({ browser }) => {
  for (const [as, nombre] of [['editor', 'Redes empotradas'], ['admin', 'Redes de agua fría']]) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    const P = ['lhprop', 'c1', { sc: 'c1', sentAt: 1, items: { i0: { after: { ...I0, name: 'Redes de agua fría', days: [...I0.days, '2026-10-06'] }, base: I0, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: 1 } } }];
    const errors = await openApp(page, { as, tab: 'look', extra: [['acts', 'i0', I0], P] });
    expect(await page.evaluate(() => decideProp('c1', 'i0', 'ok'))).toBe('ok');
    await expect.poll(async () => (await get(page, 'acts', 'i0')).days).toEqual([...I0.days, '2026-10-06']);
    expect((await get(page, 'acts', 'i0')).name).toBe(nombre);
    if (as === 'editor') await expect(page.locator('#toast')).toContainText('tiene historial');
    noErrors(errors, 'propuesta historial ' + as); await ctx.close();
  }
});

test('C-37: la fila saltada al renombrar en el catálogo (propuesta pendiente) toma el nombre del catálogo al aceptar', async ({ page }) => {
  const Z = { ambId: 'a1', sc: 'c1', name: 'Redes emp.', und: 'pto', metrado: 5, days: ['2026-10-05'], order: 40 };
  const extra = [['mcat', 'k1', { name: 'Redes empotradas PVC', sc: 'c1', cl: 't', al: ['redes empotradas', 'redes emp'], ord: 10 }], ['acts', 'z1', Z],
    ['lhprop', 'c1', { sc: 'c1', sentAt: 1, items: { z1: { after: { ...Z, days: ['2026-10-05', '2026-10-06'] }, base: Z, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: 1 } } }]];
  const errors = await openApp(page, { tab: 'look', extra });
  await expect.poll(() => page.evaluate(() => MX.ld.cat)).toBe(true);
  expect(await page.evaluate(() => decideProp('c1', 'z1', 'ok'))).toBe('ok');
  await expect.poll(async () => (await get(page, 'acts', 'z1')).name).toBe('Redes empotradas PVC');
  expect((await get(page, 'acts', 'z1')).days).toEqual(['2026-10-05', '2026-10-06']);
  noErrors(errors, 'C-37');
});

test('CON-08: fusionar con una actividad de otro SC suma el SC y no desliga las filas; restaurar lo quita', async ({ page }) => {
  const extra = [['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
    ['mcat', 'k6', { name: 'Redes sanitarias', sc: 'c2', cl: 't', al: ['redes sanitarias'], ord: 20 }]];
  const errors = await openApp(page, { tab: 'mat', extra });
  await expect.poll(() => page.evaluate(() => MX.ld.cat && MX.cat.size)).toBe(2);
  await page.evaluate(() => mxMerge('k1', 'k6'));
  await expect.poll(async () => (await get(page, 'mcat', 'k6')).scs || []).toEqual(['c1']);
  const i0 = await get(page, 'acts', 'i0');
  expect([i0.name, i0.sc]).toEqual(['Redes sanitarias', 'c1']);
  expect(await page.evaluate(() => mxCatOf(S.act.get('i0')))).toBe('k6');
  await expect.poll(() => page.evaluate(() => !!(MX.cat.get('k1') || {}).arch)).toBe(true);
  await page.evaluate(() => mxCatRestore('k1', true));
  await expect.poll(async () => (await get(page, 'mcat', 'k6')).scs || []).toEqual([]);
  noErrors(errors, 'CON-08');
});

test('C-33: eliminar una actividad comprometida hoy o en un día publicado pasa por el plan cerrado', async ({ page }) => {
  const PUB = ['dplan', `${MANANA}_p1`, { date: MANANA, pisoId: 'p1', ids: { t0: null }, pub: 'pub_x', by: 'editor@obra.pe' }];
  const T0 = ['acts', 't0', { ambId: 'a1', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: [MANANA, '2026-10-05'], order: 30 }];
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: [PUB, T0] });
  // e0 tiene hoy: no se elimina
  expect(await page.evaluate(() => apply([arc('acts', 'e0')], 'Eliminada'))).toBe(false);
  await expect(page.locator('#toast')).toContainText('ya está cerrado');
  // t0 está en el plan publicado de mañana: tampoco
  expect(await page.evaluate(() => apply([arc('acts', 't0')], 'Eliminada'))).toBe(false);
  expect((await get(page, 'acts', 't0')).arch).toBeFalsy();
  expect((await get(page, 'acts', 'e0')).arch).toBeFalsy();
  // t1 (solo días abiertos) sí
  await page.evaluate(() => apply([arc('acts', 't1')], 'Eliminada'));
  await expect.poll(async () => !!(await get(page, 'acts', 't1')).arch).toBe(true);
  noErrors(errors, 'C-33');
});

test('CON-11: «Pasarlo al lookahead» elige la actividad del catálogo y deja el texto como nota de la fila', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const REG = ['nprog', 'n1', { date: HOY, pisoId: 'p1', ambId: 'a2', sc: 'c2', desc: 'Canaletas sueltas', und: 'ML', exec: 6, note: '', photos: [], pt: null, by: 'veedor@obra.pe', byName: 'Vero Veedora', ts: 1 }];
  const extra = [REG, ['mcat', 'k5', { name: 'Instalación de canaletas', sc: 'c2', cl: 't', al: ['instalacion de canaletas'], ord: 10 }]];
  const errors = await openApp(page, { tab: 'campo', extra });
  await expect.poll(() => page.evaluate(() => { ensureMcat(); return MX.ld.cat; })).toBe(true);
  await page.evaluate(() => { CU.view = 'list'; render(); });
  await page.locator('#main article[data-np="n1"]').click();
  await page.locator('#npsheet [data-npa="look"]').click();
  await expect(page.locator('.lqm')).toContainText('¿qué actividad del catálogo es?');
  await page.locator('.lqm [data-mxuse="k5"]').click();
  await expect.poll(async () => (await acts(page)).filter(a => a.name === 'Instalación de canaletas').map(a => [a.ambId, a.sc, a.days])).toEqual([['a2', 'c2', [HOY]]]);
  const x = (await acts(page)).find(a => a.name === 'Instalación de canaletas');
  expect(x.obs).toContain('Canaletas sueltas');
  await expect.poll(async () => { const id = (await get(page, 'nprog', 'n1')).actId; return id && (await get(page, 'acts', id)).name; }).toBe('Instalación de canaletas');
  noErrors(errors, 'CON-11');
});

test('DAT-11: Ctrl+Z que devuelve una actividad cuyo ambiente se eliminó después restaura también el ambiente', async ({ page }) => {
  const extra = [['ambientes', 'a9', { sectorId: 's1', code: 'A-9', name: 'Dpto 109', order: 9 }],
    ['acts', 'z1', { ambId: 'a9', sc: 'c1', name: 'Redes empotradas', und: '', metrado: null, days: ['2026-10-05'], order: 10 }],
    ['acts', 'z2', { ambId: 'a9', sc: 'c1', name: 'Pruebas', und: '', metrado: null, days: ['2026-10-06'], order: 20 }]];
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra });
  await page.evaluate(() => apply([arc('acts', 'z1')], 'Actividad eliminada'));
  await expect.poll(async () => !!(await get(page, 'acts', 'z1')).arch).toBe(true);
  // otra persona elimina el ambiente (y lo que queda en él), fuera de este deshacer
  await page.evaluate(() => { const A = { t: NOW(), by: 'otro@obra.pe', n: 'Otro' }; put('ambientes', 'a9', { ...strip(S.amb.get('a9')), arch: A }); put('acts', 'z2', { ...strip(S.act.get('z2')), arch: A }); });
  await expect.poll(() => page.evaluate(() => ARCH.amb.has('a9'))).toBe(true);
  await page.evaluate(() => undo());
  await expect(page.locator('#toast')).toContainText('también se restauró el ambiente A-9');
  await expect.poll(async () => !!(await get(page, 'ambientes', 'a9')).arch).toBe(false);
  expect(!!(await get(page, 'acts', 'z1')).arch).toBe(false);
  await expect(page.locator('#grid tr[data-a="z1"]')).toHaveCount(1);
  noErrors(errors, 'DAT-11');
});

test('LPS-11: un compromiso eliminado después de congelar sale como tal en el Plan semanal (no «sin registros»)', async ({ page }) => {
  const items = { x1: { sc: 'c1', sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Cielo raso', days: [MANANA], ord: 1 } };
  const extra = [['acts', 'x1', { ambId: 'a1', sc: 'c1', name: 'Cielo raso', days: [MANANA], order: 40, arch: { t: 1, by: 'editor@obra.pe', n: 'Elena' } }],
    ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-28T08:00:00.000Z', items, res: {}, snap: {} }]];
  const errors = await openApp(page, { tab: 'plan', extra });
  const row = page.locator('section[data-pid="p1"] tr[data-id="x1"]');
  await expect(row).toContainText('eliminada del lookahead');
  await expect(row.locator('.fsug')).toContainText('Eliminada del lookahead después de congelar');
  await expect(row.locator('.fsug')).not.toContainText('sin registros');
  noErrors(errors, 'LPS-11');
});

test('PER-10: Hoy avisa al administrador de los pisos sin responsable y lleva a Equipo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'hoy' });
  const card = page.locator('[data-hoy="resp"]');
  await expect(card).toContainText('Pisos sin responsable');
  await expect(card).toContainText('P2');
  await expect(card).not.toContainText('P1 ·');
  await card.locator('[data-hgo]').click();
  await expect.poll(() => page.evaluate(() => U.tab)).toBe('team');
  noErrors(errors, 'PER-10');
});

test('CON-09 / CON-10: la sesión pull avisa de una culminada (no la toca por defecto) y lista el choque con un pósit nuevo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  const r = await page.evaluate(() => {
    const t0 = S.act.get('t0');
    const s = { piso: 'p1', ambs: ['a1'], base: { t0: { days: t0.days, name: t0.name, sc: t0.sc } }, h: {},
      ps: { 'ps-1': { n: t0.name, sc: 'c3', amb: 'a1', d0: '2026-10-12', dur: 2, src: 't0' }, 'ps-2': { n: 'Pintura', sc: 'c3', amb: 'a1', d0: '2026-10-08', dur: 1, nw: true } },
      ln: { 'ps-1>ps-2': 1 } };
    DONE.set('t0', '2026-10-01');
    PU.apDn = false; const A = puPlan(s); PU.apDn = true; const B = puPlan(s); PU.apDn = false; DONE.delete('t0');
    return { dn: A.dn.map(x => x.dn), opsA: A.ops.map(o => o.id), opsB: B.ops.map(o => o.id), rs: A.rs.map(x => [x.act, x.typ]) };
  });
  expect(r.dn).toEqual(['2026-10-01']);
  expect(r.opsA).not.toContain('t0');
  expect(r.opsB).toContain('t0');
  expect(r.rs).toEqual([['act-2p', 'TAREA PREDECESORA']]);
  noErrors(errors, 'pull');
});
