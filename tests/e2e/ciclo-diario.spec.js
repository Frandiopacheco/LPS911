// Auditoría del ciclo diario (Opus + ChatGPT, oct 2026): una prueba por corrección aprobada.
// Cada una falla con el código anterior a estas correcciones.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';
import { LAMINA } from './lamina.js';

const AYER = '2026-09-30';
const AMB = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
const T1 = ['acts', 's9', { ambId: 'a1', sc: 'c1', name: 'Pruebas hidráulicas', und: 'pto', days: [MANANA], order: 15 }];
const prop = (aid, k, extra = {}) => ['pdz', `dp_${MANANA}_${aid}`, { date: MANANA, pisoId: 'p1', sc: extra.sc || 'c1', kind: 'dprop', actId: aid, ambId: 'a1', k, desc: extra.desc || '', st: 'pend', by: 'sc@obra.pe', byName: 'Sandra', ts: 1 }];
const act = (page, id) => page.evaluate(id => window.__dbGet('acts', id), id);
const pdzDoc = (page, id) => page.evaluate(id => window.__dbGet('pdz', id), id);
const row = (page, id) => page.locator(`#mpanel .mp-it[data-act="${id}"]`);
const sorted = L => [...(L || [])].sort();
async function publicar(page) {
  await page.locator('#mpanel [data-pub]').first().click();
  await page.locator('#pop [data-do="si"]').click();
  await expect(page.locator('#mpanel .pubb.ok')).toBeVisible();
}
/* escribe en la base como si fuera otro usuario (llega por la suscripción) */
const otro = (page, col, id, data, merge = true) => page.evaluate(([c, i, d, m]) => fcol(c).doc(i).set(d, { merge: m }), [col, id, data, merge]);
/* cambia la base sin avisar a esta página (lo que otro guardó y aún no llega) */
const enSilencio = (page, col, id, data) => page.evaluate(([c, i, d]) => { const m = window.__DB[c]; m.set(i, { ...(m.get(i) || {}), ...d }); }, [col, id, data]);

test('1 · la página ya no acepta sola los cierres del capataz: no pisa lo que corrigió el ingeniero', async ({ page }) => {
  const D3 = '2026-09-28';
  const LV = ['live', `${D3}_e0`, { date: D3, actId: 'e0', sc: 'c2', pisoId: 'p1', st: 'run', close: { status: 'ok', cnc: '', done: false, by: 'u_cap1', n: 'Pedro', t: 1 } }];
  const DY = ['daily', `${D3}_p1`, { date: D3, pisoId: 'p1', recs: { e0: { status: 'no', cnc: 'Materiales', note: 'corregido por el ingeniero', sc: 'c2', by: 'editor@obra.pe', ts: 2 } } }];
  const errors = await openApp(page, { as: 'editor', tab: 'campo', extra: [LV, DY] });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => typeof autoAccept)).toBe('undefined');
  const r = await page.evaluate(d => window.__dbGet('daily', d + '_p1').recs.e0, D3);
  expect([r.status, r.cnc, !!r.auto]).toEqual(['no', 'Materiales', false]);
  noErrors(errors, 'sin autoAccept');
});

test('2 · para publicar hay que revisar todas las propuestas; el editor no ve «aceptar/rechazar todas»', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB, T1, prop('s9', 'per')] });
  await page.locator('#mpanel [data-pub]').first().click();
  await expect(page.locator('#pop')).toContainText('Quedan 1 propuesta');
  await expect(page.locator('#pop [data-do="si"]')).toHaveCount(0);
  await expect(page.locator('#pop [data-do="acc"]')).toHaveCount(0);
  await expect(page.locator('#pop [data-do="rej"]')).toHaveCount(0);
  expect(await page.evaluate(d => !!window.__dbGet('dplan', d + '_p1'), MANANA)).toBe(false);
  noErrors(errors, 'gate editor');
});

test('3 · el administrador acepta todas (no va → borrador al día siguiente, culminada) o rechaza todas', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1, prop('s9', 'per'), prop('e0', 'fin', { sc: 'c2' })] });
  page.on('dialog', d => d.accept());
  await page.locator('#mpanel [data-pub]').first().click();
  await page.locator('#pop [data-do="acc"]').click();
  await expect.poll(async () => (await pdzDoc(page, `dp_${MANANA}_s9`)).st).toBe('ok');
  await expect.poll(async () => (await pdzDoc(page, `dp_${MANANA}_e0`)).st).toBe('ok');
  const sig = await page.evaluate(d => wshift(d, 1), MANANA);
  const D = await page.evaluate(() => window.__plano.draftsOf().map(z => [z.actId, z.repTo, z.k]));
  expect(D).toEqual([['s9', sig, 'per']]);
  expect(await page.evaluate(() => DONE.has('e0'))).toBe(true);
  // ya no queda nada por revisar: se puede publicar
  await publicar(page);
  await expect.poll(async () => (await act(page, 's9')).days).toEqual([sig]);
  noErrors(errors, 'aceptar todas');
});

test('3b · rechazar todas: van según lo programado', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1, prop('s9', 'per')] });
  page.on('dialog', d => d.accept());
  await page.locator('#mpanel [data-pub]').first().click();
  await page.locator('#pop [data-do="rej"]').click();
  await expect.poll(async () => (await pdzDoc(page, `dp_${MANANA}_s9`)).st).toBe('rej');
  expect((await act(page, 's9')).days).toEqual([MANANA]);
  noErrors(errors, 'rechazar todas');
});

test('4 · decidir una propuesta que el SC cambió mientras se revisaba: no se aplica a la nueva', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB, T1, prop('s9', 'per')] });
  await row(page, 's9').locator('[data-dpa]').click();
  await expect(page.locator('#pop [data-nv="keep"]')).toBeVisible();
  // el SC la reemplaza (otra causa) y a esta página aún no le llega
  await enSilencio(page, 'pdz', `dp_${MANANA}_s9`, { k: 'mat', desc: 'PROPUESTA_NUEVA', ts: 2 });
  await page.locator('#pop [data-nv="keep"]').click();
  await expect(page.locator('#toast')).toContainText('cambió su propuesta');
  const z = await pdzDoc(page, `dp_${MANANA}_s9`);
  expect([z.st, z.desc]).toEqual(['pend', 'PROPUESTA_NUEVA']);
  noErrors(errors, 'version propuesta');
});

test('5 · mismo universo del día: la reunión y Campo incluyen lo publicado que salió del día', async ({ page }) => {
  // la foto de hoy tenía i0 y e0; i0 ya no está hoy en el lookahead y nadie la registró
  const SNAP = ['dplan', `${HOY}_p1`, { date: HOY, pisoId: 'p1', ids: { i0: null, e0: null }, pub: 'pub_x' }];
  const I0 = ['acts', 'i0', { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days: [AYER], order: 10 }];
  const errors = await openApp(page, { as: 'editor', tab: 'campo', extra: [...LAMINA, ...AMB, SNAP, I0] });
  await expect(page.locator('article[data-a="i0"]')).toBeVisible();
  await page.evaluate(d => { daySet(d); U.tab = 'mapa'; requestRender(); }, HOY);
  await page.waitForFunction(() => window.__plano && window.__plano.cuRows);
  await page.evaluate(d => { window.__plano.M.date = d; }, HOY);
  await expect.poll(() => page.evaluate(d => { window.__plano.M.date = d; return window.__plano.cuRows('c1').map(r => r.x.id); }, HOY)).toContain('i0');
  noErrors(errors, 'universo');
});

test('5b · PPC diario: lo terminado antes del día no cuenta como «salió del plan»', async ({ page }) => {
  const SNAP = ['dplan', `${AYER}_p1`, { date: AYER, pisoId: 'p1', ids: { i0: null, e0: 10 }, pub: 'pub_x' }];
  const DI = ['doneidx', 'p1', { d: { e0: '2026-09-29' } }];
  const errors = await openApp(page, { tab: 'ind', extra: [SNAP, DI] });
  await page.evaluate(d => ensureDaily(d), AYER);
  await expect.poll(() => page.evaluate(d => !!dplanOf(d, 'p1') && DONE.has('e0'), AYER)).toBe(true);
  const r = await page.evaluate(d => { const o = dayData([d], new Set(['p1'])); return { prog: o.tot.prog, out: o.rows.filter(x => x.rc && x.rc._out).map(x => x.x.id) }; }, AYER);
  expect(r.out).toEqual([]);
  expect(r.prog).toBe(1);
  noErrors(errors, 'terminada antes');
});

test('6 · Ctrl+Z no cambia un día que se publicó después', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  await page.evaluate(d => { const x = S.act.get('e0'); apply([op('acts', 'e0', { ...x, days: x.days.filter(z => z !== d) })], 'Quitar mañana'); }, MANANA);
  await expect.poll(async () => (await act(page, 'e0')).days).toEqual([HOY]);
  // se publica mañana (otro ingeniero)
  await otro(page, 'dplan', `${MANANA}_p1`, { date: MANANA, pisoId: 'p1', ids: { e1: null }, pub: 'pub_y' }, false);
  await expect.poll(() => page.evaluate(d => dayLocked(d, 'p1'), MANANA)).toBe(true);
  await page.evaluate(() => undo());
  await expect(page.locator('#toast')).toContainText('ya está cerrado');
  expect((await act(page, 'e0')).days).toEqual([HOY]);
  noErrors(errors, 'undo cerrado');
});

test('7 · publicar no corre el tren sobre un día ya publicado', async ({ page }) => {
  const t1 = '2026-10-06';
  const CL = ['dplan', `${t1}_p1`, { date: t1, pisoId: 'p1', ids: { t1: null }, pub: 'pub_z' }];
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB, CL] });
  const t1d = (await act(page, 't1')).days;
  await row(page, 'e1').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="per"]').click();
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop [data-tr="1"]').click();
  await page.locator('#pop .nvok').click();
  await publicar(page);
  await expect.poll(async () => (await act(page, 'e1')).days).not.toContain(MANANA);
  expect((await act(page, 't1')).days).toEqual(t1d);
  noErrors(errors, 'tren cerrado');
});

test('8 · deshacer la publicación es todo o nada: si algo cambió después, no se borra la foto', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="per"]').click();
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop .nvok').click();
  await publicar(page);
  await expect.poll(async () => (await act(page, 'e0')).days).not.toContain(MANANA);
  const moved = (await act(page, 'e0')).days;
  // otro usuario cambia e0 después de publicar
  await otro(page, 'acts', 'e0', { days: [...moved, '2026-10-09'] });
  await expect.poll(() => page.evaluate(() => S.act.get('e0').days.includes('2026-10-09'))).toBe(true);
  page.once('dialog', d => d.accept());
  await page.locator('#mpanel [data-unpub]').click();
  await expect(page.locator('#toast')).toContainText('No se deshizo nada');
  expect(!!(await page.evaluate(d => window.__dbGet('dplan', d + '_p1'), MANANA))).toBe(true);
  expect(!!(await pdzDoc(page, `pub_${MANANA}_p1`))).toBe(true);
  expect(sorted((await act(page, 'e0')).days)).toEqual(sorted([...moved, '2026-10-09']));
  noErrors(errors, 'unpub todo o nada');
});

test('9 · la foto del plan se arma con lo del servidor, no con la copia local atrasada', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await expect(page.locator('#mpanel [data-pub]').first()).toBeVisible();
  await enSilencio(page, 'acts', 'e0', { qty: { [MANANA]: 7 } });
  await publicar(page);
  await expect.poll(() => page.evaluate(d => (window.__dbGet('dplan', d + '_p1') || {}).ids, MANANA)).toMatchObject({ e0: 7 });
  noErrors(errors, 'foto servidor');
});

test('10 · mover días no pisa un día que otro agregó mientras tanto', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  const t0 = (await act(page, 't0')).days;
  await enSilencio(page, 'acts', 't0', { days: [...t0, '2026-10-14'] });
  await page.evaluate(() => { const x = S.act.get('t0'); apply([op('acts', 't0', { ...x, days: x.days.map(d => wshift(d, 1)) })], ''); });
  await expect.poll(async () => sorted((await act(page, 't0')).days)).toEqual(sorted([...(await page.evaluate(L => L.map(d => wshift(d, 1)), t0)), '2026-10-14']));
  noErrors(errors, 'mover sin pisar');
});

test('11 · el respaldo incluye el plan del día cerrado y lo demás de la obra', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  const L = await page.evaluate(() => BK_DATA);
  for (const c of ['dplan', 'nprog', 'lhlog', 'cliver']) expect(L).toContain(c);
  noErrors(errors, 'respaldo');
});

test('12 · aceptar una propuesta movida con ‹ › revisa el cierre con las fechas movidas', async ({ page }) => {
  const T0 = { ambId: 'a1', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: ['2026-10-06', '2026-10-07'], order: 30 };
  const P = ['lhprop', 'c3', { sc: 'c3', sentAt: 1, items: { t0: { after: { ...T0, days: ['2026-10-12', '2026-10-13'] }, base: T0, ts: 1, by: 'sc@obra.pe', n: 'Tito', sent: true, sentAt: 1 } } }];
  const PUB = ['dplan', `${MANANA}_p1`, { date: MANANA, pisoId: 'p1', ids: { e0: null }, pub: 'pub_x' }];
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: [['acts', 't0', T0], P, PUB] });
  await expect.poll(() => page.evaluate(d => dayLocked(d, 'p1'), MANANA)).toBe(true);
  expect(await page.evaluate(d => decideProp('c3', 't0', 'shift', { start: d }), MANANA)).toBe('closed');
  expect((await act(page, 't0')).days).toEqual(T0.days);
  noErrors(errors, 'propuesta desplazada');
});

test('13 · la restricción de un «No va» toma el tipo elegido (las opciones son los tipos de Configuración)', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await otro(page, 'meta', 'project', { restrTypes: ['Diseño', 'Materiales'] });
  await expect.poll(() => page.evaluate(() => (P().restrTypes || []).length)).toBe(2);
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  // las opciones de «No va» son los tipos de restricción de Configuración
  await expect(page.locator('#pop [data-nk]')).toHaveCount(2);
  await page.locator('#pop [data-nk="rt:Materiales"]').click();
  await page.fill('#nvd', 'Falta cemento');
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop .nvok').click();
  await publicar(page);
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('restr')).filter(r => r.actId === 'e0').map(r => r.type))).toEqual(['Materiales']);
  // la reprogramación publicada queda en el Historial del lookahead
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('lhlog')).some(h => /publicado/.test(h.label || '') && (h.items || []).some(i => i.id === 'e0')))).toBe(true);
  noErrors(errors, 'tipo por causa');
});

test('14 · «Quitar registro» también anula la «terminada» del cierre del capataz', async ({ page }) => {
  const LV = ['live', `${HOY}_e0`, { date: HOY, actId: 'e0', sc: 'c2', pisoId: 'p1', close: { status: 'ok', done: true, by: 'u_cap1', n: 'Pedro', t: 1 } }];
  const DY = ['daily', `${HOY}_p1`, { date: HOY, pisoId: 'p1', recs: { e0: { status: null, clr: true, sc: 'c2' } } }];
  const errors = await openApp(page, { as: 'editor', tab: 'campo', extra: [LV, DY] });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => DONE.has('e0'))).toBe(false);
  noErrors(errors, 'quitar registro');
});

test('15 · el historial en vivo se agrega, no se reemplaza', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'cap' });
  await page.evaluate(d => liveWrite(d, 'e0', { st: 'run' }, { s: 'run' }), HOY);
  await expect.poll(() => page.evaluate(d => (window.__dbGet('live', d + '_e0') || {}).log?.length || 0, HOY)).toBe(1);
  // otro (el capataz sin señal) agregó su evento y a esta página aún no le llega
  await page.evaluate(d => { const m = window.__DB.live; const c = m.get(d + '_e0'); m.set(d + '_e0', { ...c, log: [...c.log, { s: 'stop', m: 'RACE_SC', t: 5 }] }); }, HOY);
  await page.evaluate(d => liveWrite(d, 'e0', { st: 'stop', mot: 'RACE_ING' }, { s: 'stop', m: 'RACE_ING' }), HOY);
  await expect.poll(() => page.evaluate(d => window.__dbGet('live', d + '_e0').log.map(e => e.m || e.s), HOY)).toEqual(['run', 'RACE_SC', 'RACE_ING']);
  noErrors(errors, 'log arrayUnion');
});

test('16 · el SC propone el cierre del día; el ingeniero lo confirma', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'cap' });
  await page.evaluate(d => liveWrite(d, 'i0', { st: 'run', t0: 1 }, { s: 'run' }), HOY);
  await page.evaluate(d => capSheet('i0', d, 'main'), HOY);
  await page.locator('#ksheet [data-ka="closef"]').click();
  await page.locator('#ksheet [data-kcs="ok"]').click();
  await page.locator('#ksheet [data-ka="closesave"]').click();
  await expect.poll(() => page.evaluate(d => (window.__dbGet('live', d + '_i0') || {}).close?.status, HOY)).toBe('ok');
  noErrors(errors, 'sc cierra');
});

test('16b · «Detenido · Inicia después» (tren de trabajo) y luego «Iniciado» pasa a en ejecución', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'cap' });
  await page.evaluate(d => capSheet('i0', d, 'main'), HOY);
  await expect(page.locator('#ksheet [data-ka="seqf"]')).toHaveCount(0);
  await page.locator('#ksheet [data-ka="stopf"]').click();
  await expect(page.locator('#ksheet [data-kmot]')).toHaveText(['Inicia después', 'Actividad predecesora', 'Seguridad', 'Materiales', 'Calidad', 'Otros']);
  await page.locator('#ksheet [data-kmot="Otros"]').click();
  await page.locator('#ksheet [data-ka="stopsave"]').click(); // «Otros» pide detalle
  await expect(page.locator('#ksheet')).toHaveCount(1);
  await page.locator('#ksheet [data-kmot="Inicia después"]').click();
  await page.locator('#ksheet [data-ka="stopsave"]').click();
  await expect.poll(() => page.evaluate(d => (window.__dbGet('live', d + '_i0') || {}).mot, HOY)).toBe('Inicia después');
  expect(await page.evaluate(d => kText(d, 'i0'), HOY)).toContain('Detenido: Inicia después');
  await page.evaluate(d => capSheet('i0', d, 'main'), HOY);
  await expect(page.locator('#ksheet [data-ka="res"]')).toHaveText('▶ Iniciado'); // nunca había iniciado
  await page.locator('#ksheet [data-ka="res"]').click();
  await expect.poll(() => page.evaluate(d => kState(d, 'i0').k, HOY)).toBe('run');
  expect(await page.evaluate(d => (window.__dbGet('live', d + '_i0') || {}).log.at(-1).s, HOY)).toBe('run');
  noErrors(errors, 'detenido');
});

test('17 · el administrador mantiene en cada piso la lista de sus responsables (la usan las reglas)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'team' });
  await otro(page, 'members', 'editor@obra.pe', { pisos: ['p1', 'p2'] });
  await expect.poll(() => page.evaluate(() => window.__dbGet('pisos', 'p2').resp), { timeout: 8000 }).toEqual(['editor@obra.pe']);
  noErrors(errors, 'resp');
});

test('7b · si la actividad principal tocaría otro día ya publicado, no se publica nada y se avisa', async ({ page }) => {
  const X = '2026-10-03'; // día hábil siguiente a mañana (sábado)
  const E0 = ['acts', 'e0', { ambId: 'a1', sc: 'c2', name: 'Entubado empotrado', und: 'ml', metrado: 40, days: [HOY, MANANA, X], qty: { [MANANA]: 3, [X]: 5 }, order: 20 }];
  const CL = ['dplan', `${X}_p1`, { date: X, pisoId: 'p1', ids: { e0: 5 }, pub: 'pub_z' }];
  const errors = await openApp(page, { as: 'editor', tab: 'mapa', extra: [...LAMINA, ...AMB, E0, CL] });
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="per"]').click();
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop .nvok').click();
  await page.locator('#mpanel [data-pub]').first().click();
  await page.locator('#pop [data-do="si"]').click();
  await expect(page.locator('#toast')).toContainText('No se publicó');
  expect((await act(page, 'e0')).days).toEqual([HOY, MANANA, X]);
  expect(await pdzDoc(page, `pub_${MANANA}_p1`)).toBeFalsy();
  expect(await page.evaluate(d => window.__dbGet('dplan', d + '_p1'), MANANA)).toBeFalsy();
  noErrors(errors, 'principal en día cerrado');
});

test('18 · la hora de la publicación automática se edita en Configuración (por defecto 21:00)', async ({ page }) => {
  const errors = await openApp(page, { tab: 'cfg' });
  await expect(page.locator('#p_plc')).toHaveValue('21:00');
  await page.locator('#p_plc').fill('19:30');
  await page.locator('#p_plc').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => window.__dbGet('meta', 'project').planCutHH)).toBe('19:30');
  expect(await page.evaluate(() => planCutHH())).toBe('19:30');
  noErrors(errors, 'hora de cierre');
});

test('19 · aceptar una propuesta que mueve días se guarda (Firestore no admite listas dentro de listas)', async ({ page }) => {
  const T0 = { ambId: 'a1', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: ['2026-10-13', '2026-10-14'], order: 30 };
  const P = ['lhprop', 'c3', { sc: 'c3', items: { t0: { after: { ...T0, days: ['2026-10-23', '2026-10-26'] }, base: T0, ts: 5, by: 'sc@obra.pe', n: 'Tito', sent: true, sentAt: 1 } } }];
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 't0', T0], P] });
  expect(await page.evaluate(() => decideProp('c3', 't0', 'ok', { bulk: true, lateNote: 'x' }))).toBe('ok');
  await expect.poll(async () => sorted((await act(page, 't0')).days)).toEqual(['2026-10-23', '2026-10-26']);
  const h = await page.evaluate(() => Object.values(window.__dbAll('lhphist')).find(x => x.actId === 't0'));
  expect(h.prop.days).toEqual(['2026-10-13,2026-10-14', '2026-10-23,2026-10-26']);
  noErrors(errors, 'propuesta con días');
});

test('20 · revisión de propuestas: «Rechazar todo lo visible»', async ({ page }) => {
  const T0 = { ambId: 'a1', sc: 'c3', name: 'Tarrajeo de muros', und: 'm2', metrado: 60, days: ['2026-10-13', '2026-10-14'], order: 30 };
  const P = ['lhprop', 'c3', { sc: 'c3', items: { t0: { after: { ...T0, days: ['2026-10-23', '2026-10-26'] }, base: T0, ts: 5, by: 'sc@obra.pe', n: 'Tito', sent: true, sentAt: 1 } } }];
  const errors = await openApp(page, { tab: 'look', extra: [['acts', 't0', T0], P] });
  await page.evaluate(() => { U.rev = true; requestRender(); });
  page.on('dialog', d => d.accept());
  await page.locator('[data-rvrej]').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('lhphist')).filter(x => x.actId === 't0').map(x => x.st))).toEqual(['rej']);
  expect((await act(page, 't0')).days).toEqual(T0.days);
  noErrors(errors, 'rechazar todo');
});

test('21 · Configuración: subir el logo de la empresa lo guarda', async ({ page }) => {
  const errors = await openApp(page, { tab: 'cfg' });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.locator('input[data-logo="logoE"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('#toast')).toContainText('Logo guardado');
  await expect.poll(() => page.evaluate(() => window.__dbGet('meta', 'project').logoE || '')).toMatch(/^logo_logoE_/);
  noErrors(errors, 'logo');
});

test('20b · rechazar muchas a la vez es rápido (una transacción por SC) y respeta las que el SC cambió', async ({ page }) => {
  const acts = [], items = {};
  for (let i = 0; i < 60; i++) { const a = { ambId: 'a1', sc: 'c3', name: 'Act ' + i, und: 'm2', metrado: 1, days: ['2026-10-13'], order: 100 + i }; acts.push(['acts', 'q' + i, a]); items['q' + i] = { after: { ...a, days: ['2026-10-14'] }, base: a, ts: 5, by: 'sc@obra.pe', n: 'Tito', sent: true, sentAt: 1 }; }
  const errors = await openApp(page, { tab: 'look', extra: [...acts, ['lhprop', 'c3', { sc: 'c3', items }]] });
  await page.evaluate(() => { U.rev = true; requestRender(); });
  await expect(page.locator('[data-rvrej]')).toBeEnabled();
  // el SC cambia una mientras tanto (esta página aún no lo ve)
  await page.evaluate(() => { const m = window.__DB.lhprop; const c = m.get('c3'); m.set('c3', { ...c, items: { ...c.items, q0: { ...c.items.q0, ts: 9 } } }); });
  page.on('dialog', d => d.accept());
  const t0 = Date.now();
  await page.locator('[data-rvrej]').click();
  await expect(page.locator('#toast')).toContainText('59 propuestas rechazadas');
  expect(Date.now() - t0).toBeLessThan(4000);
  await expect(page.locator('#toast')).toContainText('1 porque el SC las cambió');
  const lh = await page.evaluate(() => window.__dbGet('lhprop', 'c3').items);
  expect(Object.keys(lh).filter(k => lh[k])).toEqual(['q0']);
  expect(await page.evaluate(() => Object.values(window.__dbAll('lhphist')).filter(x => x.st === 'rej').length)).toBe(59);
  noErrors(errors, 'rechazo rápido');
});

test('20c · si ninguna propuesta se ve en la grilla, explica por qué y se pueden rechazar todas igual', async ({ page }) => {
  const acts = [], items = {};
  for (let i = 0; i < 5; i++) { const a = { ambId: 'a1', sc: 'c3', name: 'Oc ' + i, und: 'm2', metrado: 1, days: ['2026-10-13'], order: 300 + i }; acts.push(['acts', 'h' + i, a]); items['h' + i] = { after: { ...a, days: ['2026-10-14'] }, base: a, ts: 5, by: 'sc@obra.pe', n: 'Tito', sent: true, sentAt: 1 }; }
  // una nueva en un ambiente que ya no existe
  items.hx = { after: { ambId: 'no-existe', sc: 'c3', name: 'Huérfana', und: 'm2', metrado: 1, days: ['2026-10-14'] }, ts: 5, by: 'sc@obra.pe', n: 'Tito', sent: true, sentAt: 1 };
  const errors = await openApp(page, { tab: 'look', extra: [...acts, ['lhprop', 'c3', { sc: 'c3', items }]] });
  // el filtro de subcontratista apunta a otra partida: ninguna propuesta de c3 se ve
  await page.evaluate(() => { U.rev = true; U.revSc = 'c3'; U.sc = 'c1'; requestRender(); });
  const b = page.locator('[data-rvrej]');
  await expect(b).toBeEnabled();
  await expect(b).toContainText('Rechazar las 6');
  let msg = '';
  page.on('dialog', d => { msg = d.message(); d.accept(); });
  await b.click();
  await expect(page.locator('#toast')).toContainText('6 propuestas rechazadas');
  expect(msg).toContain('el filtro de subcontratista');
  expect(msg).toContain('ambiente fue eliminado');
  const lh = await page.evaluate(() => window.__dbGet('lhprop', 'c3').items);
  expect(Object.keys(lh).filter(k => lh[k])).toEqual([]);
  noErrors(errors, 'rechazar ocultas');
});
