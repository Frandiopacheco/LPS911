// Tanda 2 de correcciones (frente E: plan diario, congelado y restricciones). Hoy = 1-oct-2026 (jue, semana 58); el plan diario
// abre en mañana (2-oct). C-11: «Todo el tren» sigue el tren del catálogo y muestra la lista antes de confirmar; «Frente no
// entregado» preselecciona la predecesora del tren. C-17: congelar / publicar con restricciones abiertas avisa y guarda restrIn;
// chapita R en el Plan semanal. C-23: restricciones de un «No va» cuya actividad ya se ejecutó («posiblemente liberadas»).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';
import { LAMINA } from './lamina.js';

const AMB = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
const row = (page, id) => page.locator(`#mpanel .mp-it[data-act="${id}"]`);

/* Dpto 102 (a2): orden de las filas i1(10) · e1(20) · p9 Pintura(25) · z9 Trazo(28) · t1 Tarrajeo(30) · l9 Limpieza(40, sin catálogo) · h9 Habilitado(15, sin catálogo).
   Tren del catálogo: Trazo 5 · Entubado 10 · Tarrajeo 30 · Pintura 40. Después de Entubado según el tren: Tarrajeo, Pintura;
   las filas sin catálogo siguen el orden visual (Limpieza va después, Habilitado antes). Trazo va antes en el tren: no se mueve. */
const TD = d => ['2026-10-05', '2026-10-06'].concat(d || []);
const TREN = [
  ['mcat', 'k1', { name: 'Entubado empotrado', sc: 'c2', cl: 't', al: ['entubado empotrado'], ord: 10, tr: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20, tr: 30 }],
  ['mcat', 'k3', { name: 'Pintura', sc: 'c3', cl: 't', al: ['pintura'], ord: 30, tr: 40 }],
  ['mcat', 'k4', { name: 'Trazo', sc: 'c1', cl: 't', al: ['trazo'], ord: 40, tr: 5 }],
  ['acts', 'p9', { ambId: 'a2', sc: 'c3', name: 'Pintura', und: 'm2', days: TD(), order: 25 }],
  ['acts', 'z9', { ambId: 'a2', sc: 'c1', name: 'Trazo', und: 'm', days: TD(), order: 28 }],
  ['acts', 'l9', { ambId: 'a2', sc: 'c3', name: 'Limpieza final', und: 'glb', days: TD(), order: 40 }],
  ['acts', 'h9', { ambId: 'a2', sc: 'c1', name: 'Habilitado', und: 'glb', days: TD(), order: 15 }],
  ['acts', 't1', { ambId: 'a2', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: [MANANA, '2026-10-05'], order: 30 }],
];

test('C-11 · «Todo el tren» sigue el tren del catálogo y muestra la lista antes de confirmar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, ...TREN] });
  await expect.poll(() => page.evaluate(() => MX.cat.size)).toBeGreaterThan(3);
  await row(page, 'e1').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="mat"]').click();
  await page.fill('#nvd', 'Falta tubería');
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop [data-tr="1"]').click();
  /* la lista se ve antes de «Reprogramar»: Entubado, luego Tarrajeo y Pintura (tren) y Limpieza (sin catálogo, orden visual) */
  const L = page.locator('#pop .nvtl li b');
  await expect(L).toHaveText(['Entubado empotrado', 'Tarrajeo de muros', 'Pintura', 'Limpieza final']);
  await expect(page.locator('#pop')).toContainText('orden del tren del catálogo');
  await expect(page.locator('#pop .nvtl')).not.toContainText('Trazo');
  await expect(page.locator('#pop .nvtl')).not.toContainText('Habilitado');
  await page.locator('#pop .nvok').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('pdz')).filter(z => z.kind === 'nova' && z.actId === 'e1').map(z => z.ids))).toEqual([['e1', 't1', 'p9', 'l9']]);
  noErrors(errors, 'C-11 tren');
});

test('C-11 · «Frente no entregado» preselecciona la predecesora según el tren (se puede cambiar)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, ...TREN] });
  await expect.poll(() => page.evaluate(() => MX.cat.size)).toBeGreaterThan(3);
  await row(page, 't1').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="fre"]').click();
  /* por el orden de las filas sería Trazo (c1, fila 28); por el tren es Entubado (c2, tren 10 < 30, la más cercana de otra partida) */
  await expect(page.locator('#nvpred')).toHaveValue('c2');
  await page.locator('#nvpred').selectOption('c1');
  await expect(page.locator('#nvpred')).toHaveValue('c1');
  noErrors(errors, 'C-11 predecesora');
});

/* semana 58: e0 con una restricción abierta; e1 restringida por una liberación crítica pendiente de i1 (partida siguiente) */
const RIN = [
  ['restr', 'rx', { actId: 'e0', pisoId: 'p1', type: 'Materiales', desc: 'Falta tubo', resp: 'SC ELECTRICAS', need: HOY, freed: '', status: 'pend', created: '2026-09-29', sc: 'c2', by: 'x' }],
  ['restr', 'ry', { actId: 'i0', pisoId: 'p1', type: 'Materiales', desc: 'Ya liberada', resp: '', need: HOY, freed: HOY, status: 'lib', created: '2026-09-29', sc: 'c1', by: 'x' }],
  ['lib', 'Lx', { actId: 'i1', ambId: 'a2', pisoId: 'p1', sc: 'c1', nm: 'Redes empotradas', crit: true, sup: false, rest: '', need: MANANA, slot: 'am', st: 'pro', prog: { d: MANANA, h: '09:00', insp: 'Ing. Uno' }, obs: [], photos: [], proto: [], hist: [], by: 'x', n: 'X', ts: 2 }],
];

test('C-17 · congelar con restricciones abiertas avisa con la lista, guarda restrIn y muestra la chapita R', async ({ page }) => {
  const errors = await openApp(page, { tab: 'plan', extra: RIN });
  const msgs = []; let ok = false;
  page.on('dialog', d => { msgs.push(d.message()); ok ? d.accept() : d.dismiss(); });
  await page.evaluate(() => { U.week = 58; U.piso = 'p1'; render(); });
  /* borrador: ya se ve la chapita R de lo que entraría con restricciones */
  await expect(page.locator('section[data-pid="p1"] tr[data-id="e0"] .rinb')).toHaveCount(1);
  await page.locator('section[data-pid="p1"] [data-freeze]').click();
  await expect.poll(() => msgs.some(m => /restricciones abiertas/.test(m))).toBe(true);
  expect(msgs.join('\n')).toContain('Falta tubo');
  expect(msgs.join('\n')).toMatch(/Liberación crítica/);
  /* cancelar: no se congela */
  expect(await page.evaluate(() => { const w = window.__dbGet('weeks', '58_p1'); return !!(w && w.frozenAt); })).toBe(false);
  ok = true;
  await page.locator('section[data-pid="p1"] [data-freeze]').click();
  await expect.poll(() => page.evaluate(() => { const w = window.__dbGet('weeks', '58_p1'); return w && w.frozenAt ? w.restrIn : null; })).toEqual({ e0: ['rx'], e1: ['lib:Lx'] });
  await expect(page.locator('section[data-pid="p1"] tr[data-id="e0"] .rinb')).toHaveText('R');
  await expect(page.locator('section[data-pid="p1"] tr[data-id="e1"] .rinb')).toHaveCount(1);
  await expect(page.locator('section[data-pid="p1"] tr[data-id="i0"] .rinb')).toHaveCount(0);
  /* lo congelado no cambia aunque después se libere la restricción */
  await page.evaluate(() => { const r = S.res.get('rx'); apply([op('restr', 'rx', { ...r, status: 'lib', freed: todayIso() })], ''); });
  await expect(page.locator('section[data-pid="p1"] tr[data-id="e0"] .rinb')).toHaveCount(1);
  noErrors(errors, 'C-17 congelar');
});

test('C-17 · publicar el plan del día con restricciones abiertas avisa y lo guarda en la foto del plan', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, ...RIN] });
  const msgs = [];
  page.on('dialog', d => { msgs.push(d.message()); d.accept(); });
  await page.locator('#mpanel [data-pub]').first().click();
  await expect(page.locator('#pop')).toContainText('con restricciones abiertas');
  await page.locator('#pop [data-do="si"]').click();
  await expect.poll(() => msgs.some(m => /restricciones abiertas/.test(m))).toBe(true);
  await expect.poll(() => page.evaluate(d => { const p = window.__dbGet('dplan', d + '_p1'); return p && p.ids ? p.restrIn : null; }, MANANA)).toEqual({ e0: ['rx'], e1: ['lib:Lx'] });
  noErrors(errors, 'C-17 publicar');
});

/* C-23: rp (de un «No va», creada el 28-sep) y su actividad i0 se cumplió el 30-sep → posiblemente liberada.
   rq (también de un «No va») sobre i1, que el 30-sep no se cumplió → sigue como vencida. */
const POS = [
  ['restr', 'rp', { actId: 'i0', pisoId: 'p1', type: 'Materiales', desc: 'Faltaba tubería', resp: 'SC SANITARIAS', need: '2026-09-29', freed: '', status: 'pend', created: '2026-09-28', sc: 'c1', by: 'x', via: 'plan diario' }],
  ['restr', 'rq', { actId: 'i1', pisoId: 'p1', type: 'Materiales', desc: 'Faltaba cemento', resp: 'SC SANITARIAS', need: '2026-09-29', freed: '', status: 'pend', created: '2026-09-28', sc: 'c1', by: 'x', via: 'plan diario' }],
];

test('C-23 · posiblemente liberadas: la actividad ya se ejecutó; «Liberar» con la fecha de esa ejecución; el Tablero no las cuenta como vencidas', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr', extra: POS });
  await page.evaluate(() => { U.piso = ''; U.rfilter = 'pend'; render(); });
  const card = page.locator('.rposl');
  await expect(card).toContainText('Posiblemente liberadas');
  await expect(card.locator('tr[data-rpos]')).toHaveCount(1);
  await expect(card).toContainText('Redes empotradas');
  await expect(card).not.toContainText('Faltaba cemento');
  await expect(page.locator('#main .tile', { hasText: 'Vencidas' })).toContainText('1 posiblemente liberada');
  /* Tablero: «N vencidas · 1 posiblemente liberada» (rp no suma a vencidas) */
  await page.evaluate(() => goTab('dash'));
  await expect(page.locator('#main')).toContainText('1 posiblemente liberada');
  const txt = await page.locator('#main').innerText();
  const m = txt.match(/(\d+) vencidas · 1 posiblemente liberada/);
  expect(m, txt.slice(0, 400)).toBeTruthy();
  await page.evaluate(() => goTab('restr'));
  await page.locator('[data-rposlib="rp"]').click();
  await expect.poll(() => page.evaluate(() => { const r = window.__dbGet('restr', 'rp'); return [r.status, r.freed]; })).toEqual(['lib', '2026-09-30']);
  await expect(page.locator('.rposl')).toHaveCount(0);
  noErrors(errors, 'C-23');
});
