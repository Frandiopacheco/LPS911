// Tanda 3 de correcciones (frente I: servidor, tiempo, exportes y datos). Hoy = 1-oct-2026 (jue, semana 58), 09:30 de Lima.
// C-34: el Excel de Restricciones no cuenta como pendientes las de actividades en la Papelera (misma regla que la pantalla y el AR
// del Lookahead). C-35: editar un no programado no borra las fotos quitadas (phQ). C-36: el respaldo lleva pmet y lo demás que
// faltaba. TMP-10: horas en hora de Lima aunque el equipo esté en otra zona. H12b: Equipo › Limpieza borra también lo que quedaba
// huérfano del piso (solo de ese piso). C-26/TMP-8: hora de la publicación automática 18:00–23:00 y aviso al mover un corte que ya pasó.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('C-34 · el Excel de Restricciones no cuenta como pendiente la de una actividad en la Papelera (una sola regla con el AR)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr' });
  await page.evaluate(() => apply([arc('acts', 't0')], 'Eliminar'));
  await expect.poll(() => page.evaluate(() => ARCH.act.has('t0'))).toBe(true);
  const r = await page.evaluate(() => {
    const X = { utils: { encode_cell: ({ r, c }) => r + ':' + c, encode_range: () => 'A1' } };
    const list = restrInScope();
    const ws = restrWs(X, list, '');
    const row = Object.keys(ws).filter(k => /^\d+:1$/.test(k) && +k.split(':')[0] > 4).map(k => ws[k].v);
    return { head: ws['2:0'].v, estados: row, ar: arRows(list).map(q => q.id), arLook: arList().map(q => q.id), pend: list.filter(rOpenC).length };
  });
  expect(r.ar).not.toContain('r1');
  expect(r.ar).toEqual(r.arLook); // AR de Restricciones = AR del Lookahead
  expect(r.head).toContain(`${r.pend} pendientes`);
  expect(r.head).toContain('de actividades eliminadas (no cuentan)');
  expect(r.estados).toContain('Actividad eliminada');
  noErrors(errors, 'C-34');
});

test('C-35 · editar un no programado y quitar una foto no la borra: queda en phQ', async ({ page }) => {
  const errors = await openApp(page, { tab: 'campo', extra: [
    ['fotos', 'fq1', { data: PNG, date: HOY, pisoId: 'p1', npId: 'np1', by: 'campo@obra.pe', ts: 1 }],
    ['fotos', 'fq2', { data: PNG, date: HOY, pisoId: 'p1', npId: 'np1', by: 'campo@obra.pe', ts: 1 }],
    ['nprog', 'np1', { date: HOY, pisoId: 'p1', ambId: 'a1', sc: 'c1', desc: 'Limpieza de escombros', und: '', exec: null, note: '', photos: ['fq1', 'fq2'], pt: null, by: 'frandiopacheco@gmail.com', byName: 'Admin', ts: 1 }],
  ] });
  await page.evaluate(d => ensureNP(d), HOY);
  await expect.poll(() => page.evaluate(() => NPM.has('np1'))).toBe(true);
  await page.evaluate(() => npOpen('np1'));
  await page.locator('#npsheet [data-npphx="fq1"]').click();
  await page.locator('#npsheet [data-npa="save"]').click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('nprog', 'np1').photos)).toEqual(['fq2']);
  expect(await page.evaluate(() => window.__dbGet('nprog', 'np1').phQ)).toEqual(['fq1']);
  expect(await page.evaluate(() => !!window.__dbGet('fotos', 'fq1'))).toBe(true); // la evidencia sigue en «fotos»
  noErrors(errors, 'C-35');
});

test('C-36 · el respaldo incluye pmet, hhpc y las publicaciones del tareo; la carga salta lo que solo escribe el servidor', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team', extra: [
    ['pmet', `${HOY}_pc1_p1_-`, { pc: 'pc1', d: HOY, piso: 'p1', zona: '', q: 12, by: 'campo@obra.pe', ts: 1 }],
    ['hhpc', HOY, { fecha: HOY, v: 1, hh: 8, pcs: {} }],
  ] });
  const r = await page.evaluate(() => ({ data: BK_DATA, srv: [...BK_SRV] }));
  expect(r.data).toEqual(expect.arrayContaining(['pmet', 'hhpc', 'tpexc', 'tpub', 'tpubidx', 'pcrit', 'pav', 'pull']));
  expect(r.data).not.toEqual(expect.arrayContaining(['push']));
  expect(r.srv).toEqual(['tpub', 'tpubidx']);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => backupJson(false))]);
  const J = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  expect(Object.keys(J.colecciones.pmet || {})).toEqual([`${HOY}_pc1_p1_-`]);
  expect(Object.keys(J.colecciones.hhpc || {})).toEqual([HOY]);
  noErrors(errors, 'C-36');
});

test.describe('TMP-10 · equipo con otra zona horaria', () => {
  test.use({ timezoneId: 'Asia/Tokyo' });
  test('la hora del congelado del Plan semanal sale en hora de Lima', async ({ page }) => {
    const FZ = '2026-09-26T18:00:00.000Z'; // sáb 26-set 13:00 Lima (03:00 del domingo en Tokio)
    const errors = await openApp(page, { tab: 'plan', extra: [['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: FZ, items: {}, res: {} }]] });
    await page.evaluate(() => { U.piso = 'p1'; U.week = 58; render(); });
    const pill = page.locator('#main .pill.ok', { hasText: 'Congelado' }).first();
    await expect(pill).toBeVisible();
    const [lima, local] = await page.evaluate(t => [new Date(t).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      new Date(t).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })], FZ);
    expect(lima).not.toBe(local);
    await expect(pill).toContainText(lima);
    noErrors(errors, 'TMP-10');
  });
});

test('C-26 / TMP-8 · publicación automática entre 18:00 y 23:00 y aviso al mover un corte a una hora que ya pasó', async ({ page }) => {
  const errors = await openApp(page, { tab: 'cfg' });
  const r = await page.evaluate(() => {
    const at = h => Date.parse(`2026-10-01T${h}:00-05:00`);
    return {
      def: planCutHH(),
      planAntes: cutChangeWarn({ planCutHH: '19:00' }, at('09:30')).length, // aún no llega: nada
      planPaso: cutChangeWarn({ planCutHH: '19:00' }, at('19:30')).length, // 19:30, corte 21:00 → 19:00: se publica ya
      frzPaso: cutChangeWarn({ frzCutDow: 4, frzCutHH: '09:00' }, at('09:30')), // jue 09:00 (ya pasó) en vez de sáb 13:00
      frzFut: cutChangeWarn({ frzCutDow: 5, frzCutHH: '18:00' }, at('09:30')).length,
      prop: cutChangeWarn({ propCutDow: 4, propCutHH: '09:00' }, at('09:30')), // sin día propio del congelado: los dos cortes
    };
  });
  expect(r.def).toBe('21:00');
  expect(r.planAntes).toBe(0);
  expect(r.planPaso).toBe(1);
  expect(r.frzPaso.join(' ')).toContain('se congelará sola');
  expect(r.frzPaso.join(' ')).not.toContain('fuera de plazo'); // el corte de las propuestas no cambió
  expect(r.prop.join(' ')).toContain('fuera de plazo');
  expect(r.prop.join(' ')).toContain('se congelará sola');
  expect(r.frzFut).toBe(0);
  /* en la pantalla: a las 19:30, bajar el corte a 19:00 pregunta antes (uiAsk); Cancelar deja 21:00, aceptar lo guarda */
  await page.clock.setFixedTime(new Date(HOY + 'T19:30:00-05:00'));
  await page.evaluate(() => { U.cfgV = 'pry'; render(); });
  const inp = page.locator('#p_plc');
  {
    const msgs = [];
    page.once('dialog', d => { msgs.push(d.message()); d.dismiss(); });
    await inp.fill('19:00'); await inp.dispatchEvent('change');
    await expect.poll(() => msgs.length).toBe(1);
    expect(msgs[0]).toContain('se publicará solo');
    expect(await page.evaluate(() => P().planCutHH)).toBe('21:00');
    page.once('dialog', d => d.accept());
    await page.locator('#p_plc').fill('19:00'); await page.locator('#p_plc').dispatchEvent('change');
    await expect.poll(() => page.evaluate(() => P().planCutHH)).toBe('19:00');
  }
  /* fuera de rango ya no vale (ni en la página ni en el servidor) */
  await page.evaluate(() => apply([op('meta', 'project', { ...P(), planCutHH: '23:30' })]));
  expect(await page.evaluate(() => planCutHH())).toBe('21:00');
  noErrors(errors, 'C-26');
});

test('H12b · Limpieza borra lo huérfano del piso elegido (y solo de ese piso)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team', extra: [
    ['dplan', MANANA + '_p2', { date: MANANA, pisoId: 'p2', ids: { i2: null } }],
    ['dplan', MANANA + '_p1', { date: MANANA, pisoId: 'p1', ids: { i0: null } }],
    ['doneidx', 'p2', { d: { t2: '2026-09-20' } }],
    ['doneidx', 'p1', { d: { t0: '2026-09-20' } }],
    ['pdz', 'z2', { kind: 'zona', date: MANANA, pisoId: 'p2', actId: 'i2' }],
    ['pdz', 'z1', { kind: 'zona', date: MANANA, pisoId: 'p1', actId: 'i0' }],
    ['pzon', 'i2', { pisoId: 'p2' }], ['pzon', 'i0', { pisoId: 'p1' }],
    ['live', HOY + '_i2', { date: HOY, pisoId: 'p2', actId: 'i2', sc: 'c1', photos: ['fh2'] }],
    ['live', HOY + '_i0', { date: HOY, pisoId: 'p1', actId: 'i0', sc: 'c1' }],
    ['fotos', 'fh2', { data: PNG, date: HOY, pisoId: 'p2', by: 'x', ts: 1 }],
    ['nprog', 'nq2', { date: HOY, pisoId: 'p2', ambId: 'a3', sc: 'c1', desc: 'x', photos: [], by: 'x', ts: 1 }],
    ['nprog', 'nq1', { date: HOY, pisoId: 'p1', ambId: 'a1', sc: 'c1', desc: 'x', photos: [], by: 'x', ts: 1 }],
    ['lib', 'lq2', { actId: 'i2', ambId: 'a3', pisoId: 'p2', sc: 'c1', nm: 'Redes', st: 'sol', photos: ['fl2'], proto: [], obs: [], hist: [] }],
    ['fotos', 'fl2', { data: PNG, date: HOY, pisoId: 'p2', by: 'x', ts: 1 }],
    ['mamb', 'a3', { tipo: 'tp1', c: {}, by: 'x', t: 1 }], ['mamb', 'a1', { tipo: 'tp1', c: {}, by: 'x', t: 1 }],
    ['clia', 'i2', { hide: true }], ['clia', 'i0', { hide: true }],
    ['lhprop', 'c1', { sc: 'c1', items: { i2: { after: { ambId: 'a3', name: 'Redes' } }, nx: { after: { ambId: 'a3', name: 'Nueva' } }, i0: { after: { ambId: 'a1', name: 'Redes' } } } }],
    ['weeks', '58_p2', { n: 58, pisoId: 'p2', frozenAt: '2026-09-26T18:00:00.000Z', items: {}, res: {} }],
    ['wsnap', '58_p2', { n: 58, pisoId: 'p2', snap: {} }], ['wsnap', '58_p1', { n: 58, pisoId: 'p1', snap: {} }],
  ] });
  await page.evaluate(() => { U.teamV = 'cln'; render(); });
  await page.locator('#clean input[data-clp="p2"]').check();
  await page.locator('#clprep').click();
  await expect(page.locator('#clean .sum')).toContainText('planes del día');
  await page.fill('#clconf', 'BORRAR');
  await page.locator('#clgo').click();
  await expect(page.locator('#clmsg')).toContainText('Listo');
  const g = await page.evaluate(() => {
    const has = (c, id) => !!window.__dbGet(c, id);
    return {
      fuera: [['dplan', '2026-10-02_p2'], ['doneidx', 'p2'], ['pdz', 'z2'], ['pzon', 'i2'], ['live', '2026-10-01_i2'], ['fotos', 'fh2'], ['nprog', 'nq2'], ['lib', 'lq2'], ['fotos', 'fl2'], ['mamb', 'a3'], ['clia', 'i2'], ['wsnap', '58_p2'], ['weeks', '58_p2'], ['acts', 'i2'], ['ambientes', 'a3'], ['pisos', 'p2']].filter(([c, id]) => has(c, id)),
      quedan: [['dplan', '2026-10-02_p1'], ['doneidx', 'p1'], ['pdz', 'z1'], ['pzon', 'i0'], ['live', '2026-10-01_i0'], ['nprog', 'nq1'], ['mamb', 'a1'], ['clia', 'i0'], ['wsnap', '58_p1'], ['acts', 'i0'], ['pisos', 'p1']].filter(([c, id]) => !has(c, id)),
      prop: Object.keys((window.__dbGet('lhprop', 'c1') || {}).items || {}),
    };
  });
  expect(g.fuera).toEqual([]);
  expect(g.quedan).toEqual([]);
  expect(g.prop).toEqual(['i0']); // la propuesta del SC sigue; solo salen los elementos del piso borrado
  noErrors(errors, 'H12b');
});
