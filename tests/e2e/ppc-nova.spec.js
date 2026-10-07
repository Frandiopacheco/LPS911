// PPC semanal y nuevo «No va»: la causa (cuadro de la empresa), quién responde, la sugerencia para el semanal,
// el PPC del SC, quién decide en cada piso y el aviso del congelado automático.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';
import { LAMINA } from './lamina.js';

const AMB = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
const act = (page, id) => page.evaluate(id => window.__dbGet('acts', id), id);
const row = (page, id) => page.locator(`#mpanel .mp-it[data-act="${id}"]`);
const restrs = (page, aid) => page.evaluate(aid => Object.values(window.__dbAll('restr')).filter(r => r.actId === aid && !r.arch), aid);
async function publicar(page) {
  await page.locator('#mpanel [data-pub]').click();
  await page.locator('#pop [data-do="si"]').click();
  await expect(page.locator('#mpanel .pubb.ok')).toBeVisible();
}

test('No va › frente no entregado: responde la partida anterior y el ingeniero decide si le cuenta', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await row(page, 'e1').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="fre"]').click();
  // sugiere la partida de la actividad anterior del ambiente (Redes empotradas, SC SANITARIAS)
  await expect(page.locator('#nvpred')).toHaveValue('c1');
  await expect(page.locator('#pop .nvtg')).toContainText('responde SC SANITARIAS');
  await page.locator('#nvpc').check();
  await page.fill('#nvd', 'No terminaron las pruebas');
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop .nvok').click();
  await publicar(page);
  await expect.poll(async () => (await restrs(page, 'e1')).map(r => [r.desc, r.ccode, r.imp, r.rsc, r.pc, r.resp])).toEqual([['No terminaron las pruebas', 'SC', false, 'c1', true, 'SC SANITARIAS']]);
  const rp = (await act(page, 'e1')).rpl[MANANA];
  expect([rp.c, rp.imp, rp.rsc, rp.pc]).toEqual(['SC', false, 'c1', true]);
  expect(rp.m).toContain('Frente no entregado (SC SANITARIAS)');
  noErrors(errors, 'frente');
});

test('No va › error de programación: por defecto es de obra si el SC pidió cambiarla y se le rechazó', async ({ page }) => {
  const H = ['lhphist', 'c2_e0_1', { sc: 'c2', actId: 'e0', st: 'rej', t: 1, sk: 'c2|000000000000001', by: 'editor@obra.pe' }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, H] });
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="prg"]').click();
  await expect(page.locator('#pop [data-who="obra"].on')).toBeVisible();
  await expect(page.locator('#pop .nvhint')).toContainText('no se le aceptó');
  await expect(page.locator('#pop .nvtg')).toContainText('no imputable al SC');
  // sin ese antecedente, se sugiere que lo aceptó el SC
  await page.keyboard.press('Escape');
  await row(page, 'e1').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="prg"]').click();
  await expect(page.locator('#pop [data-who="sc"].on')).toBeVisible();
  await expect(page.locator('#pop .nvtg')).toContainText('imputable a SC ELECTRICAS');
  noErrors(errors, 'programación');
});

test('el SC propone con la causa y el ingeniero la ve al revisar', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, ['acts', 's9', { ambId: 'a1', sc: 'c1', name: 'Pruebas hidráulicas', und: 'pto', days: [MANANA], order: 25 }]] });
  await row(page, 's9').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="fre"]').click();
  await expect(page.locator('#nvpc')).toHaveCount(0); // si le cuenta al predecesor lo decide el ingeniero
  await page.selectOption('#nvpred', 'c2');
  await page.locator('#pop [data-nv="prop"]').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('pdz')).filter(z => z.kind === 'dprop').map(z => [z.k, z.pred, z.st]))).toEqual([['fre', 'c2', 'pend']]);
  await expect(row(page, 's9').locator('.dzp')).toContainText('Frente no entregado (SC ELECTRICAS)');
  noErrors(errors, 'propuesta con causa');
});

/* semana 58 congelada en P1: e0 (2 días, el segundo reprogramado en el plan diario por frente no entregado) e i0 (cumplida) */
const WK = ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00.000Z', res: {}, snap: {},
  items: { e0: { sc: 'c2', sector: 'S1', code: 'A-0', amb: 'Dpto', act: 'Entubado empotrado', days: [HOY, MANANA], ord: 1 }, i0: { sc: 'c1', sector: 'S1', code: 'A-0', amb: 'Dpto', act: 'Redes empotradas', days: [HOY], ord: 0 } } }];
const DAY = ['daily', `${HOY}_p1`, { date: HOY, pisoId: 'p1', recs: { e0: { status: 'ok', sc: 'c2', by: 'campo@obra.pe' }, i0: { status: 'ok', sc: 'c1', by: 'campo@obra.pe' } } }];

test('PPC semanal: lo reprogramado en el plan diario llega con su causa y quién responde; PPC del SC', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: [WK, DAY] });
  // e0 ya no tiene mañana: el plan diario lo pasó a la semana siguiente por «frente no entregado» (responde SC SANITARIAS, le cuenta)
  await page.evaluate(([h, m]) => window.firebase.firestore().collection('acts').doc('e0').update({ days: [h, '2026-10-06'], rpl: { [m]: { to: '2026-10-06', m: 'Frente no entregado (SC SANITARIAS)', c: 'SC', cnc: 'Subcontratas', imp: false, rsc: 'c1', pc: true } } }), [HOY, MANANA]);
  const r = page.locator('#main tr[data-id="e0"]');
  await expect(r.locator('.fsug')).toContainText('1 reprog.');
  await expect(r.locator('.fsug')).toContainText('sugiere No (SC)');
  await page.locator('[data-applyfield]').click();
  await expect.poll(() => page.evaluate(() => { const x = window.__dbGet('weeks', '58_p1').res.e0; return [x.ok, x.cnc, x.imp, x.rsc, x.pc]; })).toEqual([false, 'Subcontratas', false, 'c1', true]);
  await expect(r.locator('[data-resp]')).toHaveValue('p:c1');
  await expect(r.locator('[data-rpc]')).toBeChecked();
  // PPC bruto 50 %; en el piso la falla es imputable (a otra partida): PPC del SC 50 %. A SC SANITARIAS le cuenta: «del SC 50 %».
  await expect(page.locator('#main .tile', { hasText: 'PPC P1' })).toContainText('50%');
  await expect(page.locator('#main .tile', { hasText: 'PPC del SC' })).toContainText('50%');
  await expect(page.locator('#main tr.grp', { hasText: 'SC SANITARIAS' })).toContainText('1 de otras partidas le cuenta');
  // si el ingeniero decide que no le cuenta, deja de ser imputable en el piso: PPC del SC 100 %
  await r.locator('[data-rpc]').uncheck();
  await expect(page.locator('#main .tile', { hasText: 'PPC del SC' })).toContainText('100%');
  // y lo puede pasar a «Imputable al SC»
  await r.locator('[data-resp]').selectOption('y');
  await expect.poll(() => page.evaluate(() => { const x = window.__dbGet('weeks', '58_p1').res.e0; return [x.imp, x.rsc]; })).toEqual([true, '']);
  await expect(page.locator('#main .tile', { hasText: 'PPC del SC' })).toContainText('50%');
  noErrors(errors, 'ppc del sc');
});

for (const [pisos, n] of [[['p2'], 0], [['p1'], 1]]) {
  test(`quién decide: «Ver como» editor a cargo de ${pisos} ${n ? 'publica' : 'no publica'} en P1 (responsable Elena)`, async ({ page }) => {
    const errors = await openApp(page, { tab: 'mapa', va: { role: 'editor', pisos }, extra: [...LAMINA, ...AMB] });
    await expect(page.locator('#mpanel .mp-h')).toBeVisible();
    await expect(page.locator('#mpanel [data-pub]')).toHaveCount(n);
    noErrors(errors, 'ver como');
  });
}

test('piso sin responsable: decide cualquier editor', async ({ page }) => {
  const SINRESP = ['members', 'editor@obra.pe', { role: 'editor', name: 'Elena Editora', pisos: [] }];
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB, SINRESP] });
  await expect(page.locator('#mpanel [data-pub]')).toHaveCount(1);
  expect(await page.evaluate(() => isPisoResp('p1'))).toBe(true);
  noErrors(errors, 'sin responsable');
});

test('Hoy avisa que la semana siguiente se congela sola y PPC semanal lo muestra', async ({ page }) => {
  const errors = await openApp(page, { tab: 'hoy' });
  await expect(page.locator('[data-hoy="plan2"]')).toHaveCount(0); // el jueves todavía falta más de 2 días
  await page.clock.setFixedTime(new Date('2026-10-02T15:00:00-05:00')); // viernes 15:00: el corte es mañana 13:00
  await page.evaluate(() => render());
  await expect(page.locator('[data-hoy="plan2"]')).toContainText('se congela sola');
  await expect(page.locator('[data-hoy="plan2"]')).toContainText('sábado 03 oct, 13:00');
  await page.evaluate(() => { U.week = 59; goTab('plan'); });
  await expect(page.locator('#main .pill.warn').first()).toContainText('se congela solo el sábado 03 oct, 13:00');
  noErrors(errors, 'aviso de congelado');
});

test('PPC diario: lo comprometido que salió con «No va» cuenta como no cumplido con su causa, no «sin verificar»', async ({ page }) => {
  const X = { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days: [MANANA], order: 10,
    rpl: { [HOY]: { to: MANANA, m: 'Materiales: no llegó la tubería', c: 'MAT', cnc: 'Materiales', imp: true } } };
  const errors = await openApp(page, { tab: 'ind', extra: [['acts', 'nv1', X], ['dplan', `${HOY}_p1`, { date: HOY, pisoId: 'p1', ids: { nv1: null }, at: 1, by: 'x' }]] });
  const r = await page.evaluate(d => { const D = dayData([d], new Set(['p1'])); const row = D.rows.find(o => o.x.id === 'nv1'); return row && { st: row.rc && row.rc.status, cnc: row.rc && row.rc.cnc, imp: impOf(row.rc) }; }, HOY);
  expect(r).toEqual({ st: 'no', cnc: 'Materiales', imp: true });
  noErrors(errors, 'no va en el PPC diario');
});
