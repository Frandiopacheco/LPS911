// Plan diario: las actividades se ubican solas en su ambiente (Sectorización) y el plan se decide por excepción:
// Va · No va (restricción o personal) · Culminado, y se pueden programar otras actividades del lookahead.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab, HOY, MANANA } from './helpers.js';
import { LAMINA, enPantalla } from './lamina.js';

const AMB = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
const act = (page, id) => page.evaluate(id => window.__dbGet('acts', id), id);
const row = (page, id) => page.locator(`#mpanel .mp-it[data-act="${id}"]`);

test('se arma para mañana, todo ubicado en su ambiente, y se decide por excepción', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await expect(page.locator('#mpanel .mp-h')).toContainText('02 oct'); // el día siguiente
  await expect(row(page, 'e0')).toContainText('en su ambiente');
  await expect(row(page, 'e1')).toContainText('en su ambiente');
  await expect(page.locator('#mstage .pvl.nb')).toHaveCount(2); // numeradas sobre su ambiente
  await expect(page.locator('#mpanel')).not.toContainText('sin ubicar');
  // No va › Personal: se reprograma solo esta al siguiente día hábil
  const sig = await page.evaluate(d => wshift(d, 1), MANANA);
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="per"]').click();
  await page.locator('#pop [data-nv="nolib"]').click();
  await expect(page.locator('#pop [data-to].on')).toHaveCount(1);
  await page.locator('#pop .nvok').click();
  // queda en el plan como borrador: el lookahead no cambia hasta publicar
  await expect(row(page, 'e0')).toContainText('No va');
  expect((await act(page, 'e0')).days).toEqual([HOY, MANANA]);
  await expect(page.locator('#mpanel .pubb')).toContainText('se aplican al lookahead al publicar');
  // programar otra actividad del lookahead este día (antes de publicar: después el plan queda cerrado)
  await page.click('#dzadd');
  await page.fill('#dzq', 'tarrajeo');
  await page.locator('#pop .dzpl button:not([hidden])').first().click();
  await expect.poll(async () => (await act(page, 't0')).days).toContain(MANANA);
  await expect(row(page, 't0')).toBeVisible();
  await publicar(page);
  await expect.poll(async () => (await act(page, 'e0')).days).toEqual([HOY, sig]);
  await expect(row(page, 'e0')).toHaveCount(0);
  await expect(page.locator('#mpanel .pubb.ok')).toContainText('Plan publicado');
  // el cambio queda en el recuadro «Cambios del plan» (a la derecha), no en el panel
  await expect(page.locator('#mpanel')).not.toContainText('Reprogramadas');
  await page.locator('#mchb [data-chtog]').click();
  await expect(page.locator('#mchb .mchi').first()).toContainText('Falta de personal');
  // publicado, el plan queda cerrado: ya no se programa otra ni se decide «no va»
  await expect(page.locator('#dzadd')).toHaveCount(0);
  await expect(row(page, 't0').locator('[data-dv]')).toHaveCount(0);
  await expect(page.locator('#mpanel .pubb.ok')).toContainText('ya no se reprograma');
  // al volver a Campo, el día vuelve a hoy
  await openTab(page, 'campo');
  await expect(page.locator('#main')).toContainText('hoy');
  noErrors(errors, 'plan diario');
});

test('en Campo › Plano las actividades salen numeradas en su ambiente', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'campo', extra: [...LAMINA, ...AMB] });
  await page.evaluate(() => { CU.view = 'plan'; render(); });
  await page.locator('[data-kp="p1"]').click();
  await expect(page.locator('#kplan .pvl.nb')).toHaveCount(4); // i0, e0 (A-1) e i1, e1 (A-2) hoy
  await expect(page.locator('#klist')).not.toContainText('Sin ubicar');
  noErrors(errors, 'campo');
});

test('reunión: «sin interferencia» quita el achurado del cruce', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await page.click('#wtoday'); // hoy: en A-1 trabajan SANITARIAS (Redes) y ELÉCTRICAS (Entubado)
  // los cruces van en un recuadro a la derecha del plano, plegado; el panel izquierdo ya no los lista
  await expect(page.locator('#mcxb .mcxh')).toContainText('Dos partidas en el mismo lugar');
  await expect(page.locator('#mpanel .mp-cx')).toHaveCount(0);
  await page.click('#mcxb .mcxh');
  await expect(page.locator('#mcxb .mp-cx').first()).toBeVisible();
  const n0 = await page.locator('#mcxb .mp-cx').count();
  const p = await enPantalla(page, '#mstage', 200, 200);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  await page.click('#pop [data-x="ok"]');
  await expect(page.locator('#mcxb .mp-cx')).toHaveCount(n0 - 1);
  expect(await page.evaluate(() => Object.values(window.__dbAll('pdz')).filter(z => z.kind === 'xok').length)).toBe(1);
  noErrors(errors, 'cruce');
});

test('resaltar solo al subcontratista elegido viene marcado y se mantiene al cambiar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await page.click('#wtoday');
  await page.locator('#mpanel [data-dzsc="c1"]').click();
  await expect(page.locator('#mscv')).toBeChecked();
  await page.locator('#mpanel [data-dzsc="c2"]').click();
  await expect(page.locator('#mscv')).toBeChecked();
  expect(await page.evaluate(() => window.__plano.M.scDraw)).toBe('c2');
  await page.locator('#mscv').uncheck();
  await page.locator('#mpanel [data-dzsc="c1"]').click();
  await expect(page.locator('#mscv')).not.toBeChecked();
  noErrors(errors, 'resaltar');
});

const T1 = ['acts', 's9', { ambId: 'a1', sc: 'c1', name: 'Pruebas hidráulicas', und: 'pto', days: [MANANA], order: 15 }];
const pdz = page => page.evaluate(() => Object.values(window.__dbAll('pdz')));
/** «Publicar plan»: lo decidido pasa al lookahead */
async function publicar(page, sel = '#mpanel [data-pub]') { await page.locator(sel).first().click(); await page.locator('#pop [data-do="si"]').click(); }

test('No va › restricción que no se libera: se registra y se mueve todo el tren del ambiente', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  const t1 = (await act(page, 't1')).days;
  await row(page, 'e1').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="mat"]').click();
  await page.fill('#nvd', 'Falta levantar el muro');
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop [data-tr="1"]').click(); // todo el tren: Entubado y Tarrajeo de A-2
  await expect(page.locator('#pop')).toContainText('Tarrajeo');
  const to = await page.evaluate(d => wshift(d, 2), MANANA);
  await page.locator(`#pop [data-to="${to}"]`).click();
  await page.locator('#pop .nvok').click();
  expect(await page.evaluate(() => Object.values(window.__dbAll('restr')).filter(r => r.actId === 'e1').length)).toBe(0); // aún borrador
  await publicar(page);
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('restr')).filter(r => r.actId === 'e1').map(r => [r.desc, r.status]))).toEqual([['Falta levantar el muro', 'pend']]);
  const e1 = await act(page, 'e1');
  expect(e1.days).toEqual([HOY, to]);
  expect((await act(page, 't1')).days).toEqual(await page.evaluate(([L, n]) => L.map(d => wshift(d, n)), [t1, 2]));
  expect((await act(page, 't0')).days).toEqual(t1); // el otro ambiente no cambia
  // deshacer devuelve todo
  await page.locator('#toast button', { hasText: 'Deshacer' }).click();
  await expect.poll(async () => (await act(page, 'e1')).days).toEqual([HOY, MANANA]);
  expect((await act(page, 't1')).days).toEqual(t1);
  noErrors(errors, 'tren');
});

test('No va › restricción que se libera a primera hora: va con aviso en el plano', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="mat"]').click();
  await page.fill('#nvd', 'Retirar material apilado de drywall');
  await page.locator('#pop [data-nv="lib"]').click();
  await expect(row(page, 'e0').locator('.dzav')).toContainText('Retirar material apilado');
  expect((await act(page, 'e0')).days).toEqual([HOY, MANANA]);
  expect((await pdz(page)).filter(z => z.kind === 'aviso').map(z => z.desc)).toEqual(['Retirar material apilado de drywall']);
  // la restricción queda registrada por liberar a primera hora (se mide igual); quitar el aviso la archiva
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('restr')).filter(r => r.actId === 'e0' && !r.arch).map(r => [r.desc, r.status, r.ccode]))).toEqual([['Retirar material apilado de drywall', 'pend', 'MAT']]);
  noErrors(errors, 'aviso');
});

test('el subcontratista solo propone: queda en espera y no cambia el lookahead', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, T1] });
  await row(page, 's9').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="mat"]').click();
  await expect(page.locator('#pop [data-nv="nolib"]')).toHaveCount(0); // eso lo decide el ingeniero
  await page.fill('#nvd', 'Material de otra partida en el ambiente');
  await page.locator('#pop [data-nv="prop"]').click();
  await expect(row(page, 's9')).toHaveClass(/wait/);
  // en su plano ya no aparece (así reparte sus cuadrillas solo en lo que va)
  await expect(page.locator('#mstage .pvl.nb[data-z="v:s9"]')).toHaveCount(0);
  await expect(row(page, 's9').locator('.dzp')).toContainText('lo decide el ingeniero');
  await expect(page.locator('#mpdb')).toContainText('Tus propuestas');
  const p = (await pdz(page)).filter(z => z.kind === 'dprop');
  expect(p.map(z => [z.actId, z.k, z.st, z.sc])).toEqual([['s9', 'mat', 'pend', 'c1']]);
  expect((await act(page, 's9')).days).toEqual([MANANA]);
  // vuelve a «Va»: se retira la propuesta
  await row(page, 's9').locator('[data-dv^="va"]').click();
  await expect.poll(async () => (await pdz(page)).filter(z => z.kind === 'dprop').length).toBe(0);
  noErrors(errors, 'sc propone');
});

test('en la reunión el ingeniero acepta o rechaza lo propuesto', async ({ page }) => {
  const prop = (k, desc) => ['pdz', `dp_${MANANA}_s9`, { date: MANANA, pisoId: 'p1', sc: 'c1', kind: 'dprop', actId: 's9', ambId: 'a1', k, desc, st: 'pend', by: 'sc@obra.pe', byName: 'Sandra Sanitarias', ts: 1 }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1, prop('per', '')] });
  await expect(page.locator('#mpdb')).toContainText('Por decidir en la reunión');
  await expect(page.locator('#mpdb .mpdi')).toContainText('Falta de personal');
  await expect(row(page, 's9').locator('.dzp')).toContainText('SC SANITARIAS propone');
  // aceptar: pasa a reprogramar con el motivo ya elegido
  await page.locator('#mpdb [data-dpa]').click();
  await expect(page.locator('#pop')).toContainText('Falta de personal');
  await page.locator('#pop [data-nv="nolib"]').click(); // el ingeniero confirma la causa: no se resuelve a primera hora
  await page.locator('#pop .nvok').click();
  await publicar(page);
  const sig = await page.evaluate(d => wshift(d, 1), MANANA);
  await expect.poll(async () => (await act(page, 's9')).days).toEqual([sig]);
  await expect.poll(async () => (await pdz(page)).find(z => z.kind === 'dprop').st).toBe('ok');
  await expect(page.locator('#mpdb')).toBeHidden();
  noErrors(errors, 'aceptar');
});

test('revisar una propuesta y mantenerla: la actividad va', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1, ['pdz', `dp_${MANANA}_s9`, { date: MANANA, pisoId: 'p1', sc: 'c1', kind: 'dprop', actId: 's9', ambId: 'a1', k: 'fin', desc: '', st: 'pend', by: 'sc@obra.pe', byName: 'Sandra', ts: 1 }]] });
  // un solo botón «Revisar»: ahí se decide si culminó o sigue
  await expect(row(page, 's9').locator('[data-dpr]')).toHaveCount(0);
  await row(page, 's9').locator('[data-dpa]').click();
  await page.locator('#pop [data-do="no"]').click();
  await expect(row(page, 's9').locator('.dzp.rej')).toContainText('va según lo programado');
  expect((await pdz(page)).find(z => z.kind === 'dprop').st).toBe('rej');
  expect((await act(page, 's9')).days).toEqual([MANANA]);
  noErrors(errors, 'rechazar');
});

test('«Cambios del plan» permite deshacer una reprogramación', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="per"]').click();
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop .nvok').click();
  await publicar(page);
  await expect.poll(async () => (await act(page, 'e0')).days).not.toContain(MANANA);
  // publicado, el plan está cerrado: «Deshacer» de un cambio no corre; se deshace la publicación entera
  await page.locator('#mchb [data-chtog]').click();
  await page.locator('#mchb [data-chu]').click();
  await page.waitForTimeout(300);
  expect((await act(page, 'e0')).days).not.toContain(MANANA); // no se deshizo: el plan está cerrado
  page.once('dialog', d => d.accept());
  await page.locator('#mpanel [data-unpub]').click();
  await expect.poll(async () => (await act(page, 'e0')).days).toEqual([HOY, MANANA]);
  await expect.poll(() => page.evaluate(d => window.__dbGet('dplan', d + '_p1'), MANANA)).toBeFalsy();
  // vuelve a borrador: ahí sí se deshace el cambio
  await page.locator('#mchb [data-chu]').click();
  await expect.poll(async () => (await pdz(page)).filter(z => z.kind === 'nova').length).toBe(0);
  await expect(row(page, 'e0')).toBeVisible();
  noErrors(errors, 'deshacer cambio');
});

test('la ventanita sigue a su fila al desplazar el panel', async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 760 }); // la lista de causas es más alta: con menos alto la ventanita queda pegada arriba
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1] });
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  const y0 = await page.locator('#pop').evaluate(p => p.getBoundingClientRect().top);
  await page.locator('#mpanel').evaluate(p => { p.scrollTop += 60; });
  await expect.poll(() => page.locator('#pop').evaluate(p => p.getBoundingClientRect().top)).toBeLessThan(y0 - 30);
  noErrors(errors, 'ventanita');
});

const S8 = ['acts', 's8', { ambId: 'a2', sc: 'c1', name: 'Pruebas de presión', und: 'pto', days: [MANANA], order: 15 }];
const fz = page => page.evaluate(d => window.__dbGet('pdz', 'fz_' + d + '_c1'), MANANA);
async function arrastrar(page, from, to) {
  /* el plano se vuelve a dibujar al llegar cada cambio: esperar a que ambos estén en pantalla antes de medirlos */
  await expect(page.locator(from)).toBeVisible(); await expect(page.locator(to)).toBeVisible();
  const a = await page.locator(from).boundingBox(); const b = await page.locator(to).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(a.x + 30, a.y - 30, { steps: 4 }); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
}

test('el subcontratista indica su fuerza laboral y arrastra sus cuadrillas al plano', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, T1, S8] });
  await page.locator('#mpanel [data-fz="open"]').click();
  const m = page.locator('#lqm');
  await expect(m).toContainText('Personal de C1');
  await m.locator('[data-ff="esp"]').first().fill('Gasfitero');
  await m.locator('.lqc').evaluate(c => { c.__mark = 1; });
  await m.locator('[data-fn="0|1"]').click(); // 2 operarios en C1
  await expect(m.locator('[data-fnv="0"]')).toHaveText('2');
  expect(await m.locator('.lqc').evaluate(c => c.__mark)).toBe(1); // no se volvió a armar la ventana (no parpadea)
  await expect(m.locator('[data-fqn="0"]')).toHaveText('3 p.');
  await m.locator('[data-fh="e"]').click();
  await m.locator('[data-fqadd]').click(); // C2, queda elegida
  await expect(m).toContainText('Personal de C2');
  await m.locator('[data-fqs="0"]').click(); // volver a C1: conserva lo editado
  await expect(m.locator('[data-ff="esp"]').first()).toHaveValue('Gasfitero');
  await m.locator('[data-fok]').click();
  await expect.poll(async () => (await fz(page) || {}).cuad?.map(q => [q.id, q.n])).toEqual([['C1', 3], ['C2', 1]]);
  const f = await fz(page);
  expect(f.items).toContainEqual({ cat: 'Operario', esp: 'Gasfitero', n: 2 });
  expect(f.hor.t).toBe('e');
  expect(await page.evaluate(() => window.__dbGet('pdz', 'fzl_c1').cuad.length)).toBe(2); // se copia al día siguiente
  await expect(page.locator('#mcqb')).toBeVisible();
  await expect(page.locator('#mpanel .fzc')).toContainText('4 personas');
  // mientras el SC reparte no se dibuja el achurado de cruces
  expect(await page.locator('#mstage svg rect[fill="url(#hxr)"]').count()).toBe(0);
  // arrastrar C1 a «Pruebas hidráulicas» y luego a «Pruebas de presión»
  await arrastrar(page, '#mcqb [data-cqd="C1"]', '#mstage .pvl[data-z="v:s9"]');
  await expect.poll(async () => (await fz(page)).asg?.s9?.c).toBe('C1');
  await arrastrar(page, '#mcqb [data-cqd="C1"]', '#mstage .pvl[data-z="v:s8"]');
  await expect(page.locator('#mstage [data-cqt="s8"]')).toHaveText('C1·2');
  await expect(page.locator('#mstage [data-cqt="s9"]')).toHaveText('C1');
  await expect(page.locator('#mcqb')).toContainText('Todas con cuadrilla');
  // la etiqueta soltada fuera de las actividades se quita
  await arrastrar(page, '#mstage [data-cqt="s8"]', '#mcqb .cqh');
  await expect.poll(async () => Object.keys((await fz(page)).asg)).toEqual(['s9']);
  await expect(page.locator('#mcqb')).toContainText('1 sin cuadrilla');
  // Ctrl+Z deshace
  await page.keyboard.press('Control+z');
  await expect.poll(async () => Object.keys((await fz(page)).asg).sort()).toEqual(['s8', 's9']);
  // «Limpiar todo» deja el reparto vacío
  await page.locator('#mcqb [data-cqclr]').click();
  await expect.poll(async () => Object.keys((await fz(page)).asg)).toEqual([]);
  // en la PC, un clic en la cuadrilla no deja el plano «pegado»: solo muestra su recorrido
  await page.locator('#mcqb [data-cqd="C1"]').click();
  await expect(page.locator('#mcqb')).not.toContainText('Toca la actividad');
  noErrors(errors, 'cuadrillas');
});

test('en el celular: se toca la cuadrilla y luego la actividad', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const F = ['pdz', 'fz_' + MANANA + '_c1', { date: MANANA, sc: 'c1', kind: 'fza', items: [{ cat: 'Operario', esp: '', n: 2 }], cuad: [{ id: 'C1', n: 2 }], hor: { t: 'n', fin: '17:00' }, asg: {}, sinDist: false, ts: 1 }];
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, T1, F] });
  await page.waitForFunction(() => window.__plano && window.__plano.M);
  await page.evaluate(() => { const M = window.__plano.M; M.cqOn = true; M.panel = false; requestRender(); });
  await page.locator('#mcqb [data-cqd="C1"]').click();
  await expect(page.locator('#mcqb')).toContainText('Toca la actividad');
  await page.locator('#mstage .pvl[data-z="v:s9"]').click();
  await expect.poll(async () => (await fz(page)).asg?.s9?.c).toBe('C1');
  await expect(page.locator('#pop')).toContainText('¿C1 hará otra actividad más?');
  await page.locator('#pop [data-do="no"]').click();
  noErrors(errors, 'cuadrillas celular');
});

test('el ingeniero ve los equipos del día y el recorrido de cada cuadrilla', async ({ page }) => {
  const F = ['pdz', 'fz_' + MANANA + '_c1', { date: MANANA, sc: 'c1', kind: 'fza', items: [{ cat: 'Operario', esp: 'Gasfitero', n: 3 }, { cat: 'Peón', esp: '', n: 2 }], cuad: [{ id: 'C1', n: 2 }, { id: 'C2', n: 3 }], hor: { t: 'e', fin: '19:00' }, asg: { s9: { c: 'C1', o: 1 }, s8: { c: 'C1', o: 2 } }, sinDist: false, ts: 1 }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1, S8, F] });
  const b = page.locator('#mfzb');
  await expect(b).toContainText('SC SANITARIAS');
  await expect(b).toContainText('5 personas · 2 cuadrillas');
  await expect(b).toContainText('extendido hasta 7:00 p. m.');
  await expect(b.locator('.mfzq').first()).toContainText('A-1 → A-2');
  await expect(b).toContainText('SC ELECTRICAS');
  await expect(b).toContainText('Sin fuerza laboral indicada');
  await expect(page.locator('#mstage [data-cqt="s8"]')).toHaveText('C1·2');
  await expect(page.locator('#mcqb')).toBeHidden(); // el ingeniero no reparte
  // las flechas del recorrido se ven solo al elegir la cuadrilla
  const flechas = () => page.locator('#mstage svg polyline[stroke-dasharray="9 7"]').count();
  expect(await flechas()).toBe(0);
  await b.locator('[data-cqf="c1|C1"]').click();
  await expect.poll(flechas).toBe(1);
  // el ingeniero puede ocultar el achurado de cruces
  await page.locator('#mcxb [data-cxtog]').click();
  expect(await page.locator('#mstage svg rect[fill="url(#hxr)"]').count()).toBeGreaterThan(0);
  await page.locator('#mcxb [data-cxv]').click();
  await expect.poll(() => page.locator('#mstage svg rect[fill="url(#hxr)"]').count()).toBe(0);
  noErrors(errors, 'equipos');
});

test('Ctrl+clic elige varias partidas; tocar el plano fuera de ellas no abre otras', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1] });
  await page.click('#wtoday'); // hoy: SANITARIAS y ELÉCTRICAS
  await page.locator('#mpanel [data-dzsc="c2"]').click();
  await expect(row(page, 'i0')).toHaveCount(0);
  await page.locator('#mpanel [data-dzsc="c1"]').click({ modifiers: ['Control'] });
  await expect(page.locator('#mpanel .dzf button.on')).toHaveCount(2);
  await expect(row(page, 'i0')).toBeVisible();
  await expect(row(page, 'e0')).toBeVisible();
  await expect(page.locator('#mscv')).toBeChecked();
  // un clic simple vuelve a una sola
  await page.locator('#mpanel [data-dzsc="c2"]').click();
  await expect(page.locator('#mpanel .dzf button.on')).toHaveCount(1);
  // las zonas de Sectorización no se seleccionan (no se pueden mover)
  const bx = await page.locator('#mstage polygon[data-z="v:e0"]').boundingBox();
  await page.mouse.click(bx.x + 15, bx.y + 15);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__plano.M.selId)).toBeNull();
  noErrors(errors, 'varias partidas');
});

test('arrastrar una etiqueta a otra actividad la suma como la siguiente; lo que no va sale del reparto', async ({ page }) => {
  const F = ['pdz', 'fz_' + MANANA + '_c1', { date: MANANA, sc: 'c1', kind: 'fza', items: [{ cat: 'Operario', esp: '', n: 2 }], cuad: [{ id: 'C1', n: 2, items: [{ cat: 'Operario', esp: '', n: 2 }] }], hor: { t: 'n', fin: '17:00' }, asg: { s9: { c: 'C1', o: 1 } }, sinDist: false, ts: 1 }];
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, T1, S8, F] });
  await page.waitForFunction(() => window.__plano && window.__plano.M);
  await page.evaluate(() => { window.__plano.M.cqOn = true; requestRender(); });
  await expect(page.locator('#mstage [data-cqt="s9"]')).toBeVisible();
  await arrastrar(page, '#mstage [data-cqt="s9"]', '#mstage .pvl[data-z="v:s8"]');
  await expect.poll(async () => Object.keys((await fz(page)).asg).sort()).toEqual(['s8', 's9']);
  await expect(page.locator('#mstage [data-cqt="s9"]')).toHaveText('C1');
  await expect(page.locator('#mstage [data-cqt="s8"]')).toHaveText('C1·2');
  // si «Pruebas hidráulicas» deja de ir ese día, C1 empieza por la otra
  await page.evaluate(d => { const x = S.act.get('s9'); apply([op('acts', 's9', { ...x, days: [] })]); }, MANANA);
  await expect(page.locator('#mstage [data-cqt="s8"]')).toHaveText('C1');
  await expect(page.locator('#mpanel .fzc')).toContainText('1 actividad con cuadrilla');
  noErrors(errors, 'siguiente');
});

test('modo reunión: primero el cumplimiento de hoy, luego el plan de mañana con sus interferencias', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  const fecha = d => page.evaluate(d => fmtD(d), d);
  await page.click('#mmeetb');
  // empieza en «Cumplimiento» y en el día de hoy: la ficha resume lo registrado y no hay achurado
  await expect(page.locator('#mmbar [data-mmode="cu"]')).toHaveClass(/on/);
  await expect(page.locator('#mmbar .mmday')).toContainText(await fecha(HOY));
  await expect(page.locator('#mcard')).toContainText('Cumplimiento del día');
  await expect(page.locator('#mstage rect[fill="url(#hxr)"]')).toHaveCount(0);
  let p = await enPantalla(page, '#mstage', 200, 200);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('#mzc .zcb')).toBeVisible(); // ✓ / ✗ como en Campo (sin «parcial»)
  await expect(page.locator('#mzc [data-zcs="partial"]')).toHaveCount(0);
  await page.locator('#mzc [data-zcs="no"]').click();
  await page.locator('#mzc .zcq [data-zcc="0"]').click(); // la causa se elige en la misma ficha
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('daily')).flatMap(d => Object.values(d.recs || {})).filter(r => r.status === 'no' && r.cnc).length)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  // ver la sectorización: contornos y códigos de los ambientes sobre el plano
  await page.click('#mmbar [data-msz]');
  await expect(page.locator('#mstage polygon.szl')).toHaveCount(2);
  await expect(page.locator('#mstage text.szt').first()).toHaveText('A-1');
  // «Plan e interferencias»: pasa al día siguiente, se ve lo de la derecha y un toque decide si va
  await page.click('#mmbar [data-mmode="plan"]');
  await expect(page.locator('#mmbar .mmday')).toContainText(await fecha(MANANA));
  await expect(page.locator('#mcard')).toBeHidden();
  await expect(page.locator('#mstage polygon.szl')).toHaveCount(2); // la sectorización sigue prendida
  p = await enPantalla(page, '#mstage', 200, 200);
  await page.mouse.click(p.x, p.y);
  const dv = page.locator('#mzc.pl [data-dv^="no"]').first();
  await expect(dv).toBeVisible();
  const aid = (await dv.getAttribute('data-dv')).split('|')[1];
  const antes = (await act(page, aid)).days;
  await dv.click();
  await page.locator('#pop [data-nk="per"]').click();
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop .nvok').click();
  await expect(page.locator('#mzc.pl')).toContainText('No va');
  expect((await act(page, aid)).days).toEqual(antes); // borrador hasta publicar
  await page.keyboard.press('Escape');
  await publicar(page, '#mmbar [data-pub]');
  await expect.poll(async () => (await act(page, aid)).days).not.toEqual(antes);
  await expect(page.locator('#mmbar .pubok')).toBeVisible();
  // en el plan de hoy hay un cruce: el achurado se prende y apaga desde la barra
  await page.click('#mmbar [data-mdd="-1"]');
  await expect(page.locator('#mmbar [data-cxv]')).toBeVisible();
  await expect(page.locator('#mcxb .mcxh')).toBeVisible();
  await expect(page.locator('#mstage rect[fill="url(#hxr)"]').first()).toBeAttached();
  await page.click('#mmbar [data-cxv]');
  await expect(page.locator('#mstage rect[fill="url(#hxr)"]')).toHaveCount(0);
  // la tecla C vuelve al cumplimiento; al salir, los colores vuelven a ser por subcontratista
  await page.keyboard.press('c');
  await expect(page.locator('#mmbar [data-mmode="cu"]')).toHaveClass(/on/);
  await page.click('#mmx');
  await expect(page.locator('#mmbar')).toBeHidden();
  expect(await page.evaluate(() => window.__plano.M.colorBy)).toBe('sc');
  noErrors(errors, 'reunión');
});

test('revisar «no va» del SC: «No, va igual» mantiene lo programado', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1, ['pdz', `dp_${MANANA}_s9`, { date: MANANA, pisoId: 'p1', sc: 'c1', kind: 'dprop', actId: 's9', ambId: 'a1', k: 'res', desc: 'Falta andamio', st: 'pend', by: 'sc@obra.pe', byName: 'Sandra', ts: 1 }]] });
  await page.locator('#mpdb [data-dpa]').click();
  await expect(page.locator('#pop')).toContainText('Sandra propone que no va');
  await page.locator('#pop [data-nv="keep"]').click();
  await expect.poll(async () => (await pdz(page)).find(z => z.kind === 'dprop').st).toBe('rej');
  expect((await act(page, 's9')).days).toEqual([MANANA]);
  noErrors(errors, 'va igual');
});

test('una zona dibujada se puede redibujar (reemplaza) o volver a su ambiente', async ({ page }) => {
  const Z = ['pdz', 'pzX', { date: MANANA, pisoId: 'p1', vista: 'L1', sc: 'c2', kind: 'zona', pts: [120, 120, 200, 120, 200, 200, 120, 200], actId: 'e0', ambId: 'a1', by: 'admin@obra.pe', ts: 1 }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, Z] });
  const zonas = async () => (await pdz(page)).filter(z => z.kind === 'zona' && z.actId === 'e0').length;
  await expect(row(page, 'e0')).toContainText('zona dibujada');
  await row(page, 'e0').locator('[data-redo]').click();
  const a = await enPantalla(page, '#mstage', 150, 150), b = await enPantalla(page, '#mstage', 280, 280);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
  await expect.poll(zonas).toBe(1); // la anterior se reemplazó
  expect((await pdz(page)).find(z => z.kind === 'zona' && z.actId === 'e0').pts).not.toEqual(Z[2].pts);
  await row(page, 'e0').locator('[data-zamb]').click();
  await expect.poll(zonas).toBe(0);
  await expect(row(page, 'e0')).toContainText('en su ambiente');
  await expect(row(page, 'e0').locator('[data-put]')).toBeVisible();
  noErrors(errors, 'redibujar');
});

test('el subcontratista no ve el achurado de cruces salvo que lo prenda', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await page.click('#wtoday');
  await expect(page.locator('#mcxb .mcxh')).toBeVisible();
  await expect(page.locator('#mstage rect[fill="url(#hxr)"]')).toHaveCount(0);
  await expect(page.locator('#mstage .pvl.nb.rx')).toHaveCount(0); // tampoco el anillo rojo en los números
  await page.locator('#mcxb [data-cxv]').click();
  await expect(page.locator('#mstage rect[fill="url(#hxr)"]').first()).toBeAttached();
  noErrors(errors, 'sc achurado');
});

test('cruce: se ordenan arrastrando (1.º, 2.º, 3.º…), la ✗ reprograma y queda en «Cambios del plan»', async ({ page }) => {
  // una tercera partida en A-1 hoy: tres en el mismo lugar
  const Z3 = ['pdz', 'pz3', { date: HOY, pisoId: 'p1', vista: 'L1', sc: 'c3', kind: 'zona', pts: [110, 110, 290, 110, 290, 290, 110, 290], actId: null, desc: 'Resane de muro', fuera: true, ambId: 'a1', by: 'admin@obra.pe', ts: 1 }]; // trabajo no programado planificado
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, Z3] });
  await page.click('#wtoday');
  await page.click('#mcxb .mcxh');
  await page.locator('#mcxb .mp-cx').first().click(); // tocar en la lista abre la decisión
  await expect(page.locator('#pop .xo')).toHaveCount(3);
  await expect(page.locator('#pop .ph')).toContainText('3 partidas');
  await expect(page.locator('#pop [data-x="seq"]')).toHaveCount(0); // el orden se decide arrastrando
  const ultimo = await page.locator('#pop .xo[data-xi="2"] .xn').textContent();
  // arrastrar el 3.º al primer lugar: el orden se guarda solo
  const a = await page.locator('#pop .xo[data-xi="2"]').boundingBox(), b = await page.locator('#pop .xo[data-xi="0"]').boundingBox();
  await page.mouse.move(a.x + 60, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(a.x + 60, b.y + 4, { steps: 8 }); await page.mouse.up();
  await expect(page.locator('#pop .xo[data-xi="0"] .xn')).toHaveText(ultimo);
  const xok = async () => (await pdz(page)).filter(z => z.kind === 'xok');
  await expect.poll(async () => (await xok()).length).toBe(1);
  expect((await xok())[0].ord).toHaveLength(3);
  await expect(page.locator('#pop .xhint')).toContainText('Orden guardado');
  await page.keyboard.press('Escape');
  await page.locator('#mchb [data-chtog]').click();
  await expect(page.locator('#mchb')).toContainText('3.º');
  await page.locator('#mchb [data-xun]').click();
  await expect.poll(async () => (await xok()).length).toBe(0);
  noErrors(errors, 'cruce orden');
});

test('cruce del plan de mañana: la ✗ abre la reprogramación con los días siguientes', async ({ page }) => {
  const Z = ['pdz', 'pzM', { date: MANANA, pisoId: 'p1', vista: 'L1', sc: 'c1', kind: 'zona', pts: [110, 110, 290, 110, 290, 290, 110, 290], actId: 's9', ambId: 'a1', by: 'admin@obra.pe', ts: 1 }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, T1, Z] });
  await page.click('#mcxb .mcxh');
  await page.locator('#mcxb .mp-cx').first().click();
  await page.locator('#pop .xo .xno').first().click();
  await expect(page.locator('#pop .nvtag')).toContainText('Interferencia con');
  await expect(page.locator('#pop [data-to]')).toHaveCount(3); // los días siguientes, como en el plan
  await page.locator('#pop .nvok').click();
  await expect.poll(async () => (await pdz(page)).filter(z => z.kind === 'nova' && z.k === 'int').length).toBe(1);
  noErrors(errors, 'cruce no va');
});

test('una reprogramación antigua (sin el «antes» guardado) también se deshace', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  const s2 = await page.evaluate(d => wshift(d, 1), MANANA);
  const e0 = await act(page, 'e0');
  // simular lo que dejó una versión anterior: la actividad ya movida un día y el registro sin «mv»
  await page.evaluate(([d, s2]) => { const x = S.act.get('e0'); apply([op('acts', 'e0', { ...x, days: x.days.map(y => y >= d ? s2 : y) })], ''); }, [MANANA, s2]);
  await page.evaluate(([d, s2]) => window.__plano && fcol('pdz').doc('pzOld').set({ date: d, pisoId: 'p1', sc: 'c2', kind: 'nova', actId: 'e0', ambId: 'a1', motivo: 'Sin personal', k: 'per', repTo: s2, tren: 0, by: 'admin', ts: 5 }), [MANANA, s2]);
  await page.locator('#mchb [data-chtog]').click();
  await page.locator('#mchb [data-chu="pzOld"]').click();
  await page.locator('#pop [data-do="si"]').click();
  await expect.poll(async () => (await act(page, 'e0')).days).toEqual(e0.days);
  noErrors(errors, 'deshacer antiguo');
});

test('reunión, plan: la ficha explica con quién comparte el lugar y permite decidir', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await page.click('#mmeetb');
  await page.click('#mmbar [data-mmode="plan"]');
  await page.click('#mmbar [data-mdd="-1"]'); // hoy hay cruce en A-1
  await page.locator('#mstage .pvl.nb').first().click(); // tocar el número abre su ficha (el achurado abre la decisión)
  await expect(page.locator('#mzc .zccx').first()).toContainText('Comparte el lugar con');
  await page.locator('#mzc .zccx').first().click();
  await expect(page.locator('#pop [data-x="ok"]')).toBeVisible();
  noErrors(errors, 'ficha cruce');
});

test('publicar el plan: un borrador se descarta sin tocar el lookahead y publicar se puede deshacer', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="per"]').click();
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop .nvok').click();
  await page.locator('#mchb [data-chtog]').click();
  await expect(page.locator('#mchb')).toContainText('se aplica al publicar');
  await page.locator('#mchb [data-chu]').click(); // descartar el borrador
  await expect.poll(async () => (await pdz(page)).filter(z => z.kind === 'nova').length).toBe(0);
  expect((await act(page, 'e0')).days).toEqual([HOY, MANANA]);
  // otra vez, publicar y deshacer la publicación
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="per"]').click();
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop .nvok').click();
  await publicar(page);
  await expect.poll(async () => (await act(page, 'e0')).days).not.toContain(MANANA);
  await page.locator('#toast button', { hasText: 'Deshacer' }).click();
  await expect.poll(async () => (await act(page, 'e0')).days).toEqual([HOY, MANANA]);
  await expect(page.locator('#mpanel [data-pub]')).toBeVisible();
  // ya publicado, el plan queda cerrado: se guarda la foto de lo comprometido y no se reprograma
  await publicar(page);
  await expect.poll(() => page.evaluate(d => Object.keys(window.__dbGet('dplan', d + '_p1')?.ids || {}).sort(), MANANA)).toEqual(['e1']); // e0 vuelve a salir: al deshacer, su reprogramación quedó como borrador y se publicó de nuevo
  await expect(row(page, 'e1').locator('[data-dv]')).toHaveCount(0);
  await expect(page.locator('#mpanel [data-unpub]')).toBeVisible();
  noErrors(errors, 'publicar');
});

test('varios usuarios: publicar salta lo que otro ya movió y el reparto de cuadrillas no se pisa', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB] });
  await row(page, 'e0').locator('[data-dv^="no"]').click();
  await page.locator('#pop [data-nk="per"]').click();
  await page.locator('#pop [data-nv="nolib"]').click();
  await page.locator('#pop .nvok').click();
  // mientras tanto otra persona movió «e0» en el lookahead (ya no va mañana)
  const otro = await page.evaluate(d => wshift(d, 3), MANANA);
  await page.evaluate(([h, o]) => window.firebase.firestore().collection('acts').doc('e0').update({ days: [h, o] }), [HOY, otro]);
  await publicar(page);
  await expect(page.locator('#toast')).toContainText('ya no estaba');
  expect((await act(page, 'e0')).days).toEqual([HOY, otro]); // no se corrió dos veces
  noErrors(errors, 'publicar concurrente');
});

test('un borrador que no se publicó a tiempo avisa y se puede descartar', async ({ page }) => {
  const D = ['pdz', 'pzD', { date: HOY, pisoId: 'p1', sc: 'c2', kind: 'nova', actId: 'e0', ambId: 'a1', motivo: 'Sin personal', k: 'per', repTo: MANANA, tren: 0, draft: true, ids: ['e0'], shift: 1, by: 'admin', ts: 1 }];
  const errors = await openApp(page, { tab: 'mapa', extra: [...LAMINA, ...AMB, D] });
  await page.click('#wtoday');
  await expect(page.locator('#mpanel .pubb.late')).toContainText('Sin publicar');
  await page.locator('#mpanel [data-pubx]').click();
  await expect.poll(async () => (await pdz(page)).filter(z => z.kind === 'nova').length).toBe(0);
  expect((await act(page, 'e0')).days).toEqual([HOY, MANANA]);
  noErrors(errors, 'borrador vencido');
});

test('el reparto de cuadrillas se guarda por actividad (otro equipo del mismo SC no lo pisa)', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, T1, S8,
    ['pdz', `fz_${MANANA}_c1`, { date: MANANA, kind: 'fza', sc: 'c1', items: [{ cat: 'Operario', esp: '', n: 2 }], cuad: [{ id: 'C1', n: 2, items: [{ cat: 'Operario', esp: '', n: 2 }] }], hor: { t: 'n', fin: '17:00' }, asg: {} }]] });
  // desde el celular asignan C1 a s8; en la PC, sin haberlo recibido aún, se asigna a s9
  await page.evaluate(d => window.firebase.firestore().collection('pdz').doc('fz_' + d + '_c1').update({ 'asg.s8': { c: 'C1', o: 1 } }), MANANA);
  await page.evaluate(() => { window.__plano.M.cqOn = true; requestRender(); });
  await arrastrar(page, '#mcqb [data-cqd="C1"]', '#mstage .pvl[data-z="v:s9"]');
  await expect.poll(async () => Object.keys((await page.evaluate(d => window.__dbGet('pdz', 'fz_' + d + '_c1'), MANANA)).asg || {}).sort()).toEqual(['s8', 's9']);
  noErrors(errors, 'reparto concurrente');
});

test('la etiqueta de la cuadrilla muestra su personal por especialidad y sumar cambia la fuerza laboral', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mapa', extra: [...LAMINA, ...AMB, T1, S8,
    ['pdz', `fz_${MANANA}_c1`, { date: MANANA, kind: 'fza', sc: 'c1', items: [{ cat: 'Operario', esp: 'Gasfitero', n: 2 }, { cat: 'Peón', esp: '', n: 1 }], cuad: [{ id: 'C1', n: 3, items: [{ cat: 'Operario', esp: 'Gasfitero', n: 2 }, { cat: 'Peón', esp: '', n: 1 }] }], hor: { t: 'n', fin: '17:00' }, asg: { s8: { c: 'C1', o: 1 } } }]] });
  await page.evaluate(() => { window.__plano.M.cqOn = true; requestRender(); });
  await page.locator('#mstage [data-cqt="s8"]').click();
  await expect(page.locator('#pop')).toContainText('Operario · Gasfitero');
  await page.locator('#pop [data-do="p0"]').click();
  await expect.poll(async () => (await page.evaluate(d => window.__dbGet('pdz', 'fz_' + d + '_c1'), MANANA)).items.find(i => i.esp === 'Gasfitero').n).toBe(3);
  expect((await page.evaluate(d => window.__dbGet('pdz', 'fz_' + d + '_c1'), MANANA)).cuad[0].n).toBe(4);
  noErrors(errors, 'personal por especialidad');
});
