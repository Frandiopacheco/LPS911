// Plan del día cerrado: hoy y los días publicados no se reprograman (lookahead, propuestas, mover en bloque); el
// administrador puede, dejando registro; el PPC diario se mide contra la foto del plan cerrado.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

const dias = (page, id) => page.evaluate(id => window.__dbGet('acts', id).days, id);
const cell = (page, a, d) => page.locator(`#grid tr[data-a="${a}"] td.d[data-d="${d}"]`);

test('lookahead: el editor no cambia hoy ni un día ya publicado; mañana sin publicar sí', async ({ page }) => {
  const PUB = ['dplan', `${MANANA}_p1`, { date: MANANA, pisoId: 'p1', ids: { e0: null }, pub: 'pub_x', by: 'editor@obra.pe' }];
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: [PUB] });
  // quitar hoy a e0 (sin registro de campo): no se aplica
  const r = await page.evaluate(d => { const x = S.act.get('e0'); return apply([op('acts', 'e0', { ...x, days: x.days.filter(z => z !== d) })]); }, HOY);
  expect(r).toBe(false);
  await expect(page.locator('#toast')).toContainText('ya está cerrado');
  expect(await dias(page, 'e0')).toEqual([HOY, MANANA]);
  // mañana ya está publicado: tampoco
  expect(await page.evaluate(d => { const x = S.act.get('e0'); return apply([op('acts', 'e0', { ...x, days: x.days.filter(z => z !== d) })]); }, MANANA)).toBe(false);
  await expect(page.locator('#toast')).toContainText('deshaz la publicación');
  // un día abierto sí (t0 pasa del 06 al 07)
  const t0 = await dias(page, 't0');
  await page.evaluate(() => { const x = S.act.get('t0'); apply([op('acts', 't0', { ...x, days: x.days.map(d => wshift(d, 1)) })]); });
  await expect.poll(() => dias(page, 't0')).toEqual(await page.evaluate(L => L.map(d => wshift(d, 1)), t0));
  // con registro de campo de hoy, cerrar el día (pasar el saldo) sí se permite
  await page.evaluate(d => { const x = S.act.get('e0'); writeDaily(d, 'p1', { recs: { e0: { ...baseRec(d, x, null), status: 'no', cnc: 'Materiales' } } }); }, HOY);
  await expect.poll(() => page.evaluate(d => !!recReal(d, 'e0'), HOY)).toBe(true);
  await page.evaluate(([h, m]) => { const x = S.act.get('e0'); apply([op('acts', 'e0', { ...x, days: x.days.filter(z => z !== h) })]); }, [HOY, MANANA]);
  await expect.poll(() => dias(page, 'e0')).toEqual([MANANA]);
  noErrors(errors, 'cerrado lookahead');
});

test('lookahead: el administrador puede cambiar un día cerrado, y queda registrado', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  page.once('dialog', d => d.dismiss());
  expect(await page.evaluate(d => { const x = S.act.get('e0'); return apply([op('acts', 'e0', { ...x, days: x.days.filter(z => z !== d) })]); }, HOY)).toBe(false);
  expect(await dias(page, 'e0')).toEqual([HOY, MANANA]);
  page.once('dialog', d => d.accept());
  await page.evaluate(d => { const x = S.act.get('e0'); apply([op('acts', 'e0', { ...x, days: x.days.filter(z => z !== d) })]); }, HOY);
  await expect.poll(() => dias(page, 'e0')).toEqual([MANANA]);
  await expect.poll(() => page.evaluate(d => (window.__dbGet('dplan', d + '_p1')?.log || []).map(e => e.what), HOY)).toEqual(['cambio en el lookahead']);
  noErrors(errors, 'admin cambia cerrado');
});

test('propuestas: no se acepta una que cambia hoy sin registro; rechazar sí', async ({ page }) => {
  const I0 = { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days: ['2026-09-30', HOY], order: 10 };
  const P = ['lhprop', 'c1', { sc: 'c1', sentAt: 1, items: { i0: { after: { ...I0, days: ['2026-09-30', MANANA] }, base: I0, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: 1 } } }];
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: [['members', 'editor@obra.pe', { role: 'editor', name: 'Elena', pisos: ['p1'] }], P] });
  expect(await page.evaluate(() => decideProp('c1', 'i0', 'ok'))).toBe('closed');
  expect(await dias(page, 'i0')).toEqual(['2026-09-30', HOY]);
  expect(await page.evaluate(() => decideProp('c1', 'i0', 'rej'))).toBe('ok');
  noErrors(errors, 'propuesta cerrada');
});

test('PPC diario: se mide contra la foto del plan; lo agregado no cuenta y lo que salió sin registro queda sin verificar', async ({ page }) => {
  const AYER = '2026-09-30';
  // la foto del 30 set en P1 tenía i0 y e0; e0 ya no está ese día en el lookahead y nadie la registró; i1 se agregó después
  const SNAP = ['dplan', `${AYER}_p1`, { date: AYER, pisoId: 'p1', ids: { i0: null, e0: 10 }, pub: 'pub_x' }];
  const D = ['daily', `${AYER}_p1`, { date: AYER, pisoId: 'p1', recs: { i0: { status: 'ok', sc: 'c1' }, i1: { status: 'ok', sc: 'c1' } } }];
  const errors = await openApp(page, { tab: 'ind', extra: [SNAP, D] });
  await page.evaluate(d => ensureDaily(d), AYER);
  await expect.poll(() => page.evaluate(d => !!dplanOf(d, 'p1'), AYER)).toBe(true);
  const r = await page.evaluate(d => { const o = dayData([d], new Set(['p1'])); return { tot: o.tot, adds: o.adds.map(x => x.x.id).sort(), e0: o.rows.filter(x => x.x.id === 'e0').map(x => x.rc || null) }; }, AYER);
  // e0 salió del día sin registro: sigue comprometida, sin verificar y sin causa inventada (misma regla que si siguiera en el Lookahead)
  expect(r.tot).toEqual({ prog: 2, ver: 1, ok: 1, partial: 0, no: 0, nimp: 0 });
  expect(r.adds).toContain('i1');
  expect(r.e0).toEqual([null]);
  noErrors(errors, 'ppc diario foto');
});
