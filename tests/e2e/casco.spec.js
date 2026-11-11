// Módulo Casco (docs/ia/casco.md): mismo motor con colecciones cs_, obra de ejemplo, tren, generador, entregas y asistente.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';
import fs from 'node:fs';
import path from 'node:path';
const NM = path.join(path.dirname(new URL(import.meta.url).pathname), 'node_modules', 'pdfjs-dist', 'build');

const SHOT = process.env.SHOTS || '';
async function casco(page, as = 'admin') {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  return openApp(page, { as });
}
async function cargarEjemplo(page) {
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  page.once('dialog', d => d.accept());
  await page.locator('[data-cs="demo"]').click();
  await expect.poll(() => page.evaluate(() => S.act.size), { timeout: 20000 }).toBeGreaterThan(200);
}

test('casco: carga la obra de ejemplo en cs_ y arma el tren sin tocar Last Planner', async ({ page }) => {
  const errors = await casco(page);
  const lp0 = await page.evaluate(() => Object.keys(window.__dbAll('acts')).length);
  await cargarEjemplo(page);
  const r = await page.evaluate(() => ({ cs: Object.keys(window.__dbAll('cs_acts')).length, lp: Object.keys(window.__dbAll('acts')).length, pis: Object.keys(window.__dbAll('cs_pisos')).length, cat: Object.keys(window.__dbAll('cs_mcat')).length }));
  expect(r.lp).toBe(lp0);
  expect(r.pis).toBe(9);
  expect(r.cat).toBe(20);
  expect(r.cs).toBeGreaterThan(200);
  await expect(page.locator('#trw table.cstr')).toBeVisible();
  await expect(page.locator('#trw .csk').first()).toBeVisible();
  if (SHOT) await page.screenshot({ path: SHOT + '/tren.png' });
  expect(errors).toEqual([]);
});

/* celda del tren por fila (nombre de la actividad que tiene ese día) y día */
const cellSel = (name, d) => `#trw tr[data-ctr]:has(.pn[title="${name}"]) td.ctc[data-d="${d}"]`;

test('casco: Lookahead › Tren tipo Excel: escribir sectores, Enter avanza, mover, borrar, copiar y pegar, ficha', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  const NAME = 'Encofrado de 2.º costado de viga y fondo de losa';
  const id = await page.evaluate(n => { const t = todayIso(); const x = [...S.act.values()].find(a => (a.days || []).length === 1 && a.days[0] > addD(t, 3) && a.name === n && ctMapAmb(a.ambId, 1, '_') && ctNextAmb(S.amb.get(a.ambId), '_')); return x.id; }, NAME);
  const d0 = await page.evaluate(i => S.act.get(i).days.slice(), id);
  await page.evaluate(i => { const x = S.act.get(i); U.tab = 'look'; U.lkV = 'tren'; U.week = weekOf(x.days[0]); render(); }, id);
  await expect(page.locator('tr.ctfrh')).toHaveCount(1);
  /* clic en la celda: queda activa; Alt+→ la mueve un día hábil; Deshacer */
  await page.locator(cellSel(NAME, d0[0])).click();
  await expect(page.locator(cellSel(NAME, d0[0]))).toHaveClass(/ctact/);
  await page.keyboard.press('Alt+ArrowRight');
  await expect.poll(() => page.evaluate(i => S.act.get(i).days[0], id)).toBe(await page.evaluate(d => wshift(d, 1), d0[0]));
  await page.evaluate(() => undo());
  await expect.poll(() => page.evaluate(i => S.act.get(i).days.join(), id)).toBe(d0.join());
  /* escribir en un día vacío más adelante: el sector siguiente, sin nivel → toma el nivel del último chip de la fila */
  const info = await page.evaluate(i => { const x = S.act.get(i); const a = S.amb.get(x.ambId); const nx = ctNextAmb(a, '_'); const up = ctMapAmb(x.ambId, 1, '_'); const t1 = wshift(x.days[0], 3), t2 = wshift(x.days[0], 4), t3 = wshift(x.days[0], 5);
    return { nx: nx.id, nxCode: nx.code, up, upTag: ctTag(S.amb.get(up)).replace('·', ' '), t1, t2, t3, clr: [1, 2, 3, 4, 5].map(k => wshift(x.days[0], k)) }; }, id);
  /* deja vacía la fila entre el día original y los de prueba (así el «último chip a la izquierda» es el original) */
  await page.evaluate(([n, ds]) => { const ops = []; for (const y of S.act.values()) if (!y.arch && y.name === n && ds.some(d => (y.days || []).includes(d))) { const keep = y.days.filter(d => !ds.includes(d)); ops.push(keep.length ? op('acts', y.id, { ...y, days: keep }) : arc('acts', y.id)); } apply(ops, 'test'); }, [NAME, info.clr]);
  await page.locator(cellSel(NAME, info.t1)).click();
  await page.keyboard.type(info.nxCode);
  await expect(page.locator('.ctsug')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(([n, a, d]) => [...S.act.values()].some(y => !y.arch && y.name === n && y.ambId === a && (y.days || []).includes(d)), [NAME, info.nx, info.t1])).toBe(true);
  /* Enter pasa a la columna siguiente: con nivel explícito («T5 S2») va a ese nivel */
  await expect(page.locator(cellSel(NAME, info.t2))).toHaveClass(/ctact/);
  await page.keyboard.type(info.upTag);
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(([n, a, d]) => [...S.act.values()].some(y => !y.arch && y.name === n && y.ambId === a && (y.days || []).includes(d)), [NAME, info.up, info.t2])).toBe(true);
  /* seleccionar las dos celdas (Mayús+clic) y borrarlas con Supr */
  await page.locator(cellSel(NAME, info.t1)).click();
  await page.locator(cellSel(NAME, info.t2)).click({ modifiers: ['Shift'] });
  await expect(page.locator('#ctbar')).toContainText('celdas');
  await page.keyboard.press('Delete');
  await expect.poll(() => page.evaluate(([n, ds]) => [...S.act.values()].some(y => !y.arch && y.name === n && ds.some(d => (y.days || []).includes(d))), [NAME, [info.t1, info.t2]])).toBe(false);
  /* copiar la celda original y pegarla en otro día */
  await page.locator(cellSel(NAME, d0[0])).click();
  await page.keyboard.press('Control+c');
  await page.locator(cellSel(NAME, info.t3)).click();
  await page.keyboard.press('Control+v');
  await expect.poll(() => page.evaluate(([i, d]) => { const x = S.act.get(i); return [...S.act.values()].some(y => !y.arch && y.name === x.name && y.ambId === x.ambId && (y.days || []).includes(d)); }, [id, info.t3])).toBe(true);
  /* doble clic: escribir; Esc cancela */
  await page.locator(cellSel(NAME, info.t1)).dblclick();
  await expect(page.locator('.ctedi')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ctedi')).toHaveCount(0);
  /* clic derecho en la celda: menú con la ficha */
  await page.locator(cellSel(NAME, d0[0])).click({ button: 'right' });
  await page.locator('#pop button[data-do="fi"]').first().click();
  await expect(page.locator('#pop .cspop')).toBeVisible();
  await page.evaluate(() => closePop());
  if (SHOT) await page.screenshot({ path: SHOT + '/tren-editable.png' });
  expect(errors).toEqual([]);
});

test('casco: Tren: filas por frente: clic derecho, insertar, duplicar, copiar y pegar debajo, ordenar y eliminar', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  await page.evaluate(() => { U.tab = 'look'; U.lkV = 'tren'; render(); });
  const lab = name => page.locator(`#trw tr[data-ctr] td.ctlab:has(.pn[title="${name}"])`);
  await lab('Acero de vigas').click();
  await expect(page.locator('#ctbar')).toContainText('1 fila');
  const nAV = await page.evaluate(() => [...S.act.values()].filter(y => y.name === 'Acero de vigas' && !y.arch).length);
  await page.keyboard.press('Control+c');
  await page.locator('#ctbar [data-ctra="paste"]').click();
  await expect.poll(() => page.evaluate(() => [...S.act.values()].filter(y => y.name === 'Acero de vigas' && y.trw).length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => ctRows('_').filter(r => r.name === 'Acero de vigas').length)).toBe(2);
  expect(await page.evaluate(() => { const R = ctRows('_'); const i = R.findIndex(r => r.name === 'Acero de vigas'); return R[i + 1].name; })).toBe('Acero de vigas');
  /* clic derecho en el nombre: duplicar vacía */
  await lab('Acero de losa').click({ button: 'right' });
  await page.locator('#pop button[data-do="dupv"]').click();
  await expect.poll(() => page.evaluate(() => ctRows('_').filter(r => r.name === 'Acero de losa').length)).toBe(2);
  /* clic derecho: insertar fila arriba (otra partida) */
  await lab('Instalaciones en losa').click({ button: 'right' });
  await page.locator('#pop button[data-do="up"]').click();
  page.once('dialog', d => d.accept('Curado de losa'));
  await page.locator('#pop button[data-do="other"]').click();
  await expect.poll(() => page.evaluate(() => ctRows('_').some(r => r.name === 'Curado de losa'))).toBe(true);
  expect(await page.evaluate(() => { const R = ctRows('_'); return R[R.findIndex(r => r.name === 'Curado de losa') + 1].name; })).toBe('Instalaciones en losa');
  /* subir la fila nueva y eliminarla */
  await lab('Curado de losa').click();
  await page.locator('#ctbar [data-ctra="up"]').click();
  await expect.poll(() => page.evaluate(() => { const R = ctRows('_'); return R[R.findIndex(r => r.name === 'Curado de losa') + 2].name; })).toBe('Instalaciones en losa');
  page.once('dialog', d => d.accept());
  await page.locator('#ctbar [data-ctra="del"]').click();
  await expect.poll(() => page.evaluate(() => ctRows('_').some(r => r.name === 'Curado de losa'))).toBe(false);
  expect(nAV).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('casco: Proyectar continúa la serie de cada fila (S1 en diagonal → todo el tren) y la esquina rellena en serie', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  /* como el dueño: se archiva todo y se programa solo el S1 del techo 1 en diagonal (cada fila un día después) */
  const sc = await page.evaluate(() => { const ops = []; for (const x of S.act.values()) if (!x.arch) ops.push(arc('acts', x.id)); apply(ops, 'test');
    const R = ctRows('_').filter(r => ctGrpOf(r) === 'E').slice(0, 4); const s1 = ctSecs('n1', 'E', '_')[0]; const d = wshift(todayIso(), 2); const add = [];
    R.forEach((r, i) => add.push(op('acts', uid('a'), { ambId: s1.id, name: r.name, sc: r.sc || '', und: '', days: [wshift(d, i)], order: i }))); apply(add, 'test');
    U.tab = 'look'; U.lkV = 'tren'; U.week = weekOf(d); render();
    const nS = p => ctSecs(p, 'E', '_').length; return { names: R.map(r => r.name), d, n1: nS('n1'), n2: nS('n2'), n3: nS('n3') }; });
  /* la esquina ■: la fila 2 se rellena en serie 2 días a la derecha */
  const d1 = await page.evaluate(d => wshift(d, 1), sc.d);
  await page.locator(cellSel(sc.names[1], d1)).click();
  const to = await page.evaluate(d => wshift(d, 2), d1);
  const fh = await page.locator('.ctfh').boundingBox(); const tb = await page.locator(cellSel(sc.names[1], to)).boundingBox();
  await page.mouse.move(fh.x + 4, fh.y + 4); await page.mouse.down(); await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 6 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(([n, d]) => [...S.act.values()].filter(y => !y.arch && y.name === n).flatMap(y => y.days).sort().join(), [sc.names[1], d1])).toBe(await page.evaluate(d => [d, wshift(d, 1), wshift(d, 2)].join(), d1));
  await page.evaluate(() => undo());
  /* Proyectar hasta el techo 3, tren continuo (0 días entre niveles) */
  await page.locator('[data-ctfm="_"]').click();
  await page.locator('#pop button[data-do="pj"]').click();
  await page.locator('#ctp_m').selectOption('n1');
  await page.locator('#ctp_to').selectOption('n3');
  await expect(page.locator('#ctp_prev')).toContainText('Se agregan');
  if (SHOT) await page.screenshot({ path: SHOT + '/proyectar.png' });
  await page.locator('#ctpm [data-ctp2="ok"]').click();
  /* cada fila: días hábiles seguidos desde su S1 hasta el último sector del techo 3 */
  const N = sc.n1 + sc.n2 + sc.n3;
  for (let i = 0; i < sc.names.length; i++) {
    const exp = await page.evaluate(([d, i, N]) => { const s = wshift(d, i); const o = []; for (let k = 0; k < N; k++)o.push(wshift(s, k)); return o.join(); }, [sc.d, i, N]);
    await expect.poll(() => page.evaluate(n => [...S.act.values()].filter(y => !y.arch && y.name === n).flatMap(y => y.days).sort().join(), sc.names[i])).toBe(exp);
  }
  /* el orden de sectores: el día siguiente al último sector del techo 1 es el S1 del techo 2 */
  const t2 = await page.evaluate(([n, d, k]) => { const day = wshift(d, k); const y = [...S.act.values()].find(y => !y.arch && y.name === n && y.days.includes(day)); const s = csSecOf(S.amb.get(y.ambId)); return s.pisoId + '|' + csAmbIdx(S.amb.get(y.ambId)); }, [sc.names[0], sc.d, sc.n1]);
  expect(t2).toBe('n2|0');
  /* proyectar otra vez no cambia nada */
  expect(await page.evaluate(() => ctProjPlan('_', { model: 'n1', to: 'n3', gap: 0, rep: true }).ops.length)).toBe(0);
  /* con 2 días entre niveles se reemplaza lo de los techos 2 y 3 (y nunca hoy ni lo pasado) */
  const pl = await page.evaluate(() => { const p = ctProjPlan('_', { model: 'n1', to: 'n3', gap: 2, rep: true }); return { rem: p.rem, add: p.add }; });
  expect(pl.rem).toBeGreaterThan(0); expect(pl.add).toBe(pl.rem);
  await page.evaluate(() => undo());
  await expect.poll(() => page.evaluate(n => [...S.act.values()].filter(y => !y.arch && y.name === n).flatMap(y => y.days).length, sc.names[0])).toBe(1);
  expect(errors).toEqual([]);
});

test('casco: publica las entregas como hitos del piso en Last Planner', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  await expect.poll(() => page.locator('[data-cs="lp"][data-id="n1"] option').count()).toBeGreaterThan(1);
  await page.locator('[data-cs="lp"][data-id="n1"]').selectOption('p1');
  await expect.poll(() => page.evaluate(() => S.pis.get('n1').lp)).toBe('p1');
  await page.locator('[data-cs="entpub"]').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('hitos')).filter(h => h.cs).length)).toBe(3);
  const h = await page.evaluate(() => Object.values(window.__dbAll('hitos')).find(x => x.cs));
  expect(h.piso).toBe('p1'); expect(h.tipo).toBe('ini');
  expect(Object.keys(await page.evaluate(() => window.__dbAll('cs_hitos'))).length).toBe(0);
  expect(errors).toEqual([]);
});

test('casco: el selector de módulos cambia entre Last Planner y Casco y cada uno ve sus datos', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin' });
  await expect(page.locator('#modsel [data-mod="cas"]')).toBeVisible();
  const lpPisos = await page.evaluate(() => S.pis.size);
  await page.locator('#modsel [data-mod="cas"]').click();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15000 });
  await expect.poll(() => page.evaluate(() => CS())).toBe(true);
  expect(await page.evaluate(() => S.pis.size)).toBe(0);
  await expect(page.locator('#modsel [data-mod="cas"]')).toHaveClass(/on/);
  await page.locator('#modsel [data-mod="lps"]').click();
  await expect.poll(() => page.evaluate(() => typeof CS === 'function' && !CS() && S.pis.size)).toBe(lpPisos);
  expect(errors).toEqual([]);
});

test('casco: el editor no ve Casco mientras la obra no lo tenga', async ({ page }) => {
  await openApp(page, { as: 'editor' });
  await expect(page.locator('#modsel [data-mod="lps"]')).toBeVisible();
  await expect(page.locator('#modsel [data-mod="cas"]')).toHaveCount(0);
});

test('casco: todas las pestañas se dibujan sin errores con la obra de ejemplo (modo oscuro)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const errors = await casco(page);
  await cargarEjemplo(page);
  for (const t of ['hoy', 'dash', 'look', 'restr', 'plan', 'mapa', 'campo', 'lib', 'ind', 'prod', 'planos', 'cfg', 'team']) {
    await page.evaluate(tab => { U.tab = tab; render(); }, t);
    await expect(page.getByText('No se pudo mostrar')).toHaveCount(0);
  }
  expect(await page.evaluate(() => tabAllowed('mat') || tabAllowed('cli'))).toBe(false);
  await page.evaluate(() => { U.tab = 'look'; U.lkV = 'tren'; render(); });
  if (SHOT) await page.screenshot({ path: SHOT + '/tren-oscuro.png' });
  expect(errors).toEqual([]);
});

test('casco: niveles en Configuración: editar códigos, agregar antes y después, reordenar y eliminar (archiva, con Deshacer)', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  /* el código arrastra el techo y el piso (ya no se escriben aparte) */
  const c3 = page.locator('[data-cslv="code"][data-id="n3"]');
  await c3.fill('N33'); await c3.blur();
  await expect.poll(() => page.evaluate(() => S.pis.get('n3').tc + ' ' + S.pis.get('n3').pc)).toBe('T33 P33');
  await page.evaluate(() => undo());
  await expect.poll(() => page.evaluate(() => S.pis.get('n3').code)).toBe('N3');
  expect(await page.locator('[data-cslv="tc"]').count()).toBe(0);
  page.once('dialog', d => d.accept('Sótano 2'));
  await page.locator('[data-cs="lvadd"][data-id="n0"][data-d="0"]').click();
  await expect.poll(() => page.evaluate(() => pisos()[0].name)).toBe('Sótano 2');
  expect(await page.evaluate(() => pisos().map(p => p.order).join())).toBe([...Array(10).keys()].join());
  expect(await page.evaluate(() => csAmbs(pisos()[0].id, 'S').length)).toBe(1);
  page.once('dialog', d => d.accept('Azotea'));
  await page.locator('[data-cs="lvadd"][data-id="n8"][data-d="1"]').click();
  await expect.poll(() => page.evaluate(() => pisos().at(-1).name)).toBe('Azotea');
  await page.locator('[data-cs="lvmv"][data-id="n2"][data-d="-1"]').click();
  await expect.poll(() => page.evaluate(() => pisos().findIndex(p => p.id === 'n2') < pisos().findIndex(p => p.id === 'n1'))).toBe(true);
  const n5acts = await page.evaluate(() => [...S.act.values()].filter(x => csAmbs('n5', 'E').some(a => a.id === x.ambId)).length);
  expect(n5acts).toBeGreaterThan(0);
  page.once('dialog', d => d.accept());
  await page.locator('[data-cs="lvdel"][data-id="n5"]').click();
  await expect.poll(() => page.evaluate(() => S.pis.has('n5'))).toBe(false);
  expect(await page.evaluate(() => !!(window.__dbGet('cs_pisos', 'n5') || {}).arch)).toBe(true);
  await page.evaluate(() => undo());
  await expect.poll(() => page.evaluate(() => S.pis.has('n5') && csAmbs('n5', 'E').length)).toBe(3);
  expect(errors).toEqual([]);
});


test('casco: niveles del edificio: una sola lista para Planos y Last Planner (sugerencia, «No tiene», sin repetir, aviso)', async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const P = (cod, disc, x) => ['plb', disc + '_' + cod, { cod, disc, tit: 'Planta', tipo: 'Planta', rev: 1, base: 'planos/' + cod + '/r1', W: 4000, H: 3000, Z: 1, revs: [], ...x }];
  const errors = await openApp(page, { as: 'admin', extra: [P('E-01', 'EST', { niv: 'CIM' }), P('A-01', 'ARQ', { pisoId: 'p1' }), P('E-09', 'EST', { niv: '' })] });
  await cargarEjemplo(page);
  /* clave de un nivel por su nombre o código */
  expect(await page.evaluate(() => [{ name: 'Primer piso', code: 'P1' }, { name: 'Sótano', code: 'S' }, { name: 'Piso técnico', code: 'PT' }, { name: 'Azotea' }, { name: 'Cimentación', code: 'C' }, { name: 'Nivel 3', code: 'N3' }, { name: 'Piso 2', code: 'P2' }].map(plNivKey).join())).toBe('P1,S1,PT,AZ,CIM,P3,P2');
  /* techo y piso de un código nuevo, como los lleva el nivel de referencia */
  expect(await page.evaluate(() => [csLvTags({ code: 'P1', tc: 'TP1', pc: 'PP1' }, 'P7'), csLvTags({ code: 'N3', tc: 'T3', pc: 'P3' }, 'N9')].map(x => x.join(' ')).join())).toBe('TP7 PP7,T9 P9');
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  await expect.poll(() => page.locator('[data-cs="lp"][data-id="n1"] option').count()).toBeGreaterThan(2);
  /* sugerencia por el nombre: Nivel 1 ↔ Primer piso */
  await expect(page.locator('[data-cs="lpok"][data-id="n1"]')).toHaveAttribute('data-lp', 'p1');
  /* un piso mal elegido: aviso, y ya no se ofrece en otro nivel */
  await page.locator('[data-cs="lp"][data-id="n2"]').selectOption('p1');
  await expect.poll(() => page.evaluate(() => S.pis.get('n2').lp)).toBe('p1');
  await expect(page.locator('tr:has([data-cs="lp"][data-id="n2"]) .csbal.warn')).toBeVisible();
  await expect(page.locator('[data-cs="lp"][data-id="n1"] option[value="p1"]')).toHaveCount(0);
  expect(await page.evaluate(() => plLvOf(PLB.get('ARQ_A-01')))).toBe('n2');/* plano de antes: se ubica por su piso de Last Planner */
  expect(await page.evaluate(() => { csLpSet('n3', 'p1'); return S.pis.get('n3').lp || ''; })).toBe('');/* nunca dos niveles con el mismo piso */
  /* «No tiene» es distinto de «falta elegir» */
  await page.locator('[data-cs="lp"][data-id="n0"]').selectOption('-');
  await expect.poll(() => page.evaluate(() => S.pis.get('n0').lp)).toBe('-');
  /* se corrige: el plano sigue al nivel */
  await page.locator('[data-cs="lp"][data-id="n2"]').selectOption('p2');
  await page.locator('[data-cs="lpok"][data-id="n1"]').click();
  await expect.poll(() => page.evaluate(() => S.pis.get('n1').lp)).toBe('p1');
  await expect(page.locator('.cslp .csbal.warn')).toHaveCount(0);
  expect(await page.evaluate(() => plLvOf(PLB.get('ARQ_A-01')))).toBe('n1');
  await expect(page.locator('[data-cs="lvok"][data-id="n1"][data-disc="ARQ"]')).toHaveAttribute('data-plb', 'ARQ_A-01');
  /* en Planos se elige el nivel del edificio: guarda el nivel y el piso de Last Planner de ese nivel; un nivel sin Last Planner, solo el nivel */
  expect(await page.evaluate(() => plLvList().map(x => x.id).slice(0, 3).join())).toBe('n0,n1,n2');
  expect(await page.evaluate(() => [plLvDoc('n1'), plLvDoc('n0')])).toEqual([{ nv: 'n1', pisoId: 'p1' }, { nv: 'n0', pisoId: '' }]);
  await page.evaluate(() => plCol(PLB.get('EST_E-09')).doc('EST_E-09').update(plLvDoc('n0')));
  await expect.poll(() => page.evaluate(() => plLvOf(PLB.get('EST_E-09')))).toBe('n0');
  expect(await page.evaluate(() => plLvOf(PLB.get('EST_E-01')))).toBe('');/* sin cimentación en la lista: sin nivel */
  /* «General» se respeta: no vuelve a adivinarse por el código del nombre */
  await page.evaluate(() => plCol(PLB.get('ARQ_A-01')).doc('ARQ_A-01').update({ niv: 'P1', ...plLvDoc('') }));
  await expect.poll(() => page.evaluate(() => plLvOf(PLB.get('ARQ_A-01')))).toBe('');
  expect(errors).toEqual([]);
});

test('casco: Niveles sugiere y vincula el encofrado (EST) y la arquitectura (ARQ) de cada nivel desde el módulo Planos', async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const P = (cod, disc, niv, tit) => [disc + '_' + cod, { cod, disc, niv, tit, tipo: 'Planta', rev: 1, base: 'planos/' + cod + '/r1', W: 4000, H: 3000, Z: 1, mm: [1200, 900], crop: { x0: 40, y0: 40, x1: 1151, y1: 802 }, revs: [] }];
  const extra = [P('E-03', 'EST', 'P3', 'Encofrado techo 3'), P('E-03B', 'EST', 'P3', 'Cortes'), P('A-03', 'ARQ', 'P3', 'Planta de distribución piso 3'), P('E-04', 'EST', 'P4', 'Encofrado techo 4')].map(([id, d]) => ['plb', id, d]);
  const errors = await openApp(page, { as: 'admin', extra });
  await page.route(/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@[^/]+\/build\/(pdf(\.worker)?\.min\.js)/, r => { const f = r.request().url().match(/(pdf(\.worker)?\.min\.js)/)[1]; return r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(NM, f)) }); });
  await cargarEjemplo(page);
  const W = 1191, H = 842, c = '2 w 40 40 1111 762 re S', pdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length ${c.length} >>\nstream\n${c}\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
  await page.evaluate(t => { window.plGet = async () => new Blob([t], { type: 'application/pdf' }); U.tab = 'cfg'; U.cfgV = 'cas'; render(); }, pdf);
  await expect(page.locator('[data-cs="lvok"][data-id="n3"][data-disc="EST"]')).toHaveAttribute('data-plb', 'EST_E-03', { timeout: 15000 });
  await expect(page.locator('[data-cs="lvok"][data-id="n3"][data-disc="ARQ"]')).toHaveAttribute('data-plb', 'ARQ_A-03');
  await expect(page.locator('[data-cs="lvsug"]')).toContainText('(3)');
  await page.locator('[data-cs="lvsug"]').click();
  await expect.poll(() => page.evaluate(() => [...window.__plano.LAM.values()].filter(l => l.plb).map(l => l.pisoId + ':' + l.plb.disc).sort().join()), { timeout: 60000 }).toBe('n3:ARQ,n3:EST,n4:EST');
  await expect(page.locator('.cslam .mono').first()).toBeVisible();
  expect(await page.locator('[data-cs="lvsug"]').count()).toBe(0);
  expect(errors.filter(e => !/Failed to load resource/.test(e))).toEqual([]);
});

test('casco: Vaciar Casco borra niveles y todo lo de Casco, conserva configuración, catálogo y Last Planner', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  /* una entrega publicada en Last Planner también debe irse */
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  await expect.poll(() => page.locator('[data-cs="lp"][data-id="n1"] option').count()).toBeGreaterThan(1);
  await page.locator('[data-cs="lp"][data-id="n1"]').selectOption('p1');
  await expect.poll(() => page.evaluate(() => S.pis.get('n1').lp)).toBe('p1');
  await page.locator('[data-cs="entpub"]').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('hitos')).filter(h => h.cs).length)).toBe(3);
  const lp0 = await page.evaluate(() => ({ acts: Object.keys(window.__dbAll('acts')).length, pis: Object.keys(window.__dbAll('pisos')).length, hit: Object.values(window.__dbAll('hitos')).filter(h => !h.cs).length }));
  await page.evaluate(() => { window.__e2eNoReload = true; });
  /* escribir mal la palabra no borra nada */
  page.once('dialog', d => d.accept('borra'));
  await page.locator('[data-cs="vaciar"]').click();
  await page.waitForTimeout(300);
  expect(Object.keys(await page.evaluate(() => window.__dbAll('cs_pisos'))).length).toBe(9);
  /* BORRAR + aviso final */
  page.on('dialog', d => d.type() === 'prompt' ? d.accept('BORRAR') : d.accept());
  await page.locator('[data-cs="vaciar"]').click();
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('cs_acts')).length), { timeout: 20000 }).toBe(0);
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('cs_contractors')).length), { timeout: 20000 }).toBe(0);
  const r = await page.evaluate(() => ({
    pis: Object.keys(window.__dbAll('cs_pisos')).length, sec: Object.keys(window.__dbAll('cs_sectors')).length, amb: Object.keys(window.__dbAll('cs_ambientes')).length,
    ksec: Object.keys(window.__dbAll('cs_ksec')).length, meta: !!window.__dbAll('cs_meta').project,
    cat: Object.values(window.__dbAll('cs_mcat')).filter(c => !c.arch).length,
    lpActs: Object.keys(window.__dbAll('acts')).length, lpPis: Object.keys(window.__dbAll('pisos')).length,
    hitCs: Object.values(window.__dbAll('hitos')).filter(h => h.cs).length, hitLp: Object.values(window.__dbAll('hitos')).filter(h => !h.cs).length }));
  expect(r).toEqual({ pis: 0, sec: 0, amb: 0, ksec: 0, meta: true, cat: 20, lpActs: lp0.acts, lpPis: lp0.pis, hitCs: 0, hitLp: lp0.hit });
  expect(errors).toEqual([]);
});

test('casco: «+ Agregar niveles arriba» acepta un nombre o una cantidad', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  page.once('dialog', d => d.accept('Azotea'));
  await page.locator('[data-cs="lvnew"]').click();
  await expect.poll(() => page.evaluate(() => pisos().at(-1).name)).toBe('Azotea');
  expect(await page.evaluate(() => pisos().at(-1).code)).toBe('AZ');
  page.once('dialog', d => d.accept('2'));
  await page.locator('[data-cs="lvnew"]').click();
  await expect.poll(() => page.evaluate(() => pisos().length)).toBe(12);
  expect(await page.evaluate(() => pisos().at(-1).name)).toBe('Nivel 10');
  expect(errors).toEqual([]);
});

test('casco: vincular arma la lámina con los mosaicos del módulo Planos (sin bajar el PDF) y no cambia el nivel elegido', async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const P = (cod, disc, niv, tit) => [disc + '_' + cod, { cod, disc, niv, tit, tipo: 'Planta', rev: 1, base: 'planos/' + cod + '/r1', W: 2500, H: 1800, Z: 2, T: 1024, mm: [1200, 900], revs: [] }];
  const extra = [P('E-03', 'EST', 'P3', 'Encofrado techo 3'), P('E-04', 'EST', 'P4', 'Encofrado techo 4')].map(([id, d]) => ['plb', id, d]);
  const errors = await openApp(page, { as: 'admin', extra });
  await cargarEjemplo(page);
  await page.evaluate(() => {
    window.__plGets = [];
    window.plGet = async p => { window.__plGets.push(p); if (/orig\.pdf$/.test(p)) throw new Error('no debería bajar el PDF');
      const c = new OffscreenCanvas(1024, 1024); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1024, 1024); g.fillStyle = '#000'; g.fillRect(10, 10, 100, 100); return c.convertToBlob({ type: 'image/png' }); };
    U.piso = 'n1'; saveUI(); U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  await expect(page.locator('[data-cs="lvsug"]')).toContainText('(2)', { timeout: 15000 });
  await page.locator('[data-cs="lvsug"]').click();
  await expect.poll(() => page.evaluate(() => [...window.__plano.LAM.values()].filter(l => l.plb).map(l => l.pisoId + ':' + l.w).sort().join()), { timeout: 30000 }).toBe('n3:2500,n4:2500');
  const g = await page.evaluate(() => window.__plGets);
  expect(g.some(p => /orig\.pdf$/.test(p))).toBe(false);
  expect(g.filter(p => p.startsWith('planos/E-03/r1/0/')).length).toBe(6);/* nivel 0: 3 × 2 mosaicos de 1024 */
  expect(await page.evaluate(() => U.piso)).toBe('n1');
  await expect(page.locator('#cslamst')).toBeHidden();
  expect(errors.filter(e => !/Failed to load resource/.test(e))).toEqual([]);
});

/* Sectorización de Casco (casco-sz.js): frentes de trabajo y asistente con juntas, semáforo y aplicar a niveles */
test('casco: frente con contorno y cuadrillas, alternativa con juntas, semáforo, deshacer y aplicar a los niveles', async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const extra = [['plb', 'EST_E03', { cod: 'E-03', disc: 'EST', niv: 'P3', tit: 'Encofrado', tipo: 'Planta', rev: 1, base: 'planos/E-03/r1', W: 4000, H: 3000, Z: 1, mm: [1200, 900], revs: [], cal: { mpp: 0.005, rev: 1 } }]];
  const errors = await openApp(page, { as: 'admin', extra });
  await cargarEjemplo(page);
  await page.evaluate(async () => {
    const L = (id, pid) => fcol('laminas').doc(id).set({ pisoId: pid, base: true, esp: 'Estructuras', name: 'Encofrado', w: 2000, h: 1500, lw: 1000, lh: 750, fmt: 'image/webp', nf: 0, nl: 0, rev: 1, T: { a: 1, b: 0, e: 0, f: 0 }, aligned: true, plb: { id: 'EST_E03', cod: 'E-03', disc: 'EST', rev: 1, mpp: 0.0065 }, order: 1, ts: 1 });
    await L('lamT3', 'n3'); await L('lamT4', 'n4');
    U.tab = 'planos'; U.csSzV = 'fr'; render();
  });
  await page.locator('[data-csz="frnew"]').first().click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('cs_kfr')).length)).toBe(1);
  await expect(page.locator('#csszmap .pvs')).toHaveCount(1, { timeout: 15000 });
  await expect(page.locator('#csszsc')).toContainText('calibrada');/* la escala sale de la calibración del plano en Planos, no de la copia de la lámina */
  const bx = await page.locator('#csszmap').boundingBox();
  const drag = async (x0, y0, x1, y1) => { await page.mouse.move(bx.x + x0, bx.y + y0); await page.mouse.down(); await page.mouse.move(bx.x + (x0 + x1) / 2, bx.y + (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(bx.x + x1, bx.y + y1, { steps: 4 }); await page.mouse.up(); };
  await drag(80, 80, 480, 320);
  await expect.poll(() => page.evaluate(() => ((Object.values(window.__dbAll('cs_kfr'))[0].cE || {}).pts || []).length)).toBe(8);
  await page.locator('[data-csfc="k-AV"]').fill('6'); await page.locator('[data-csfc="k-AV"]').dispatchEvent('change');
  await page.locator('[data-csfr="vac"]').fill('60'); await page.locator('[data-csfr="vac"]').dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => { const f = Object.values(window.__dbAll('cs_kfr'))[0]; return f.cua['k-AV'] + '|' + f.vac; })).toBe('6|60');
  /* Sectores: primera alternativa, dividir en 4 con cortes verticales */
  await page.locator('#csszn [data-cszv="sec"]').click();
  await page.locator('[data-csz="altnew"]').first().click();
  await page.locator('[data-csz="div"]').click();
  await page.locator('#pop [data-do="d"][data-n="4"][data-dir="v"]').click();
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(4);
  await expect(page.locator('#csszside .cssem tbody tr').first().locator('.csszd')).toHaveClass(/good/);/* 4 de igual área: carga pareja */
  await expect(page.locator('#csszside .csszrec')).toContainText('sector');
  if (SHOT) await page.screenshot({ path: SHOT + '/sectorizacion.png' });
  /* una junta más parte el primer sector: 5; Deshacer vuelve a 4 */
  await page.locator('[data-cszt="jun"]').click();
  await page.mouse.click(bx.x + 120, bx.y + 150); await page.mouse.click(bx.x + 120, bx.y + 250);
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(5);
  await expect(page.locator('#csszside .cssem tbody tr').first().locator('.csszd')).not.toHaveClass(/good/);
  await page.locator('[data-csz="undo"]').click();
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(4);
  await expect.poll(() => page.evaluate(() => ((Object.values(window.__dbAll('cs_ksec')).find(v => v.fr) || {}).jun || []).length), { timeout: 5000 }).toBe(3);
  /* aplicar: el frente único adopta los sectores de estructura de cada nivel y los nombra A1…A4 */
  page.once('dialog', d => d.accept());
  await page.locator('[data-csz="apply"]').click();
  await expect.poll(() => page.evaluate(() => csAmbs('n3', 'E').map(a => a.code).join())).toBe('A1,A2,A3,A4');
  expect(await page.evaluate(() => csAmbs('n8', 'E').map(a => a.code).join())).toBe('A1,A2,A3,A4');
  expect(await page.evaluate(() => !!(S.amb.get(csAmbs('n3', 'E')[0].id).geo || {}).lamT3)).toBe(true);
  await expect.poll(() => page.evaluate(() => !!(Object.values(window.__dbAll('cs_ksec')).find(v => v.fr) || {}).ap)).toBe(true);
  expect(errors.filter(e => !/Failed to load resource|Falta una parte|imagen/i.test(e))).toEqual([]);
});

test('casco: geometría del asistente: juntas que se prolongan hasta el borde y dividir en N partes de igual área', async ({ page }) => {
  const errors = await casco(page);
  const r = await page.evaluate(() => {
    const C = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 200 }, { x: 0, y: 200 }];
    const j = csgSnap(C, [], { x: 100, y: 50 }, { x: 102, y: 150 });/* casi vertical: se endereza y llega a los bordes */
    const P = csgPieces(C, [j]).map(p => Math.round(csPolyA(p)));
    const J = csgDivide(C, 4, 'v');const Q = csgPieces(C, J).map(p => Math.round(csPolyA(p)));
    const t = csgSnap(C, [j], { x: 20, y: 100 }, { x: 60, y: 100 });/* horizontal a la izquierda de la junta: termina en ella */
    return { j, P, Q, t };
  });
  expect(r.j).toEqual([101, 0, 101, 200]);
  expect(r.P.sort((a, b) => a - b)).toEqual([20200, 59800]);
  expect(r.Q).toEqual([20000, 20000, 20000, 20000]);
  expect(r.t).toEqual([0, 100, 101, 100]);
  expect(errors).toEqual([]);
});


test('casco: «Completar ratios por defecto» no escribe valores vacíos (Firestore rechazaba el lote entero)', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  await page.evaluate(async () => { const b = db.batch(); for (const c of MX.cat.values()) b.set(fcol('mcat').doc(c.id), { rat: null }, { merge: true }); await b.commit(); });
  await page.evaluate(() => csRatDef());
  await expect.poll(() => page.evaluate(() => (window.__dbGet('cs_mcat', 'k-AV') || {}).rat)).toBe(12);
  const r = await page.evaluate(() => Object.values(window.__dbAll('cs_mcat')).filter(c => 'rat' in c && c.rat === undefined).length);
  expect(r).toBe(0);
  expect(await page.evaluate(() => window.__dbGet('cs_mcat', 'k-E1').rat)).toBeNull();
  expect(errors).toEqual([]);
});

test('casco: catálogo con incidencia, rendimiento en und/día o HH/und y jornada configurable', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  await expect(page.locator('.cscat thead')).toContainText('Vaciado');
  await expect(page.locator('.cscat thead')).not.toContainText('Incidencia');
  await expect(page.locator('.cscat thead')).not.toContainText('Desfase');
  const hh = page.locator('[data-csc="k-AV"] [data-csf="hh"]');
  await hh.fill('0.0425'); await hh.dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => window.__dbGet('cs_mcat', 'k-AV').rend)).toBe(200);/* 8,5 h ÷ 0,0425 HH/kg */
  await expect.poll(() => page.locator('[data-csc="k-AV"] [data-csf="hh"]').inputValue()).toBe('0.0425');
  const jor = page.locator('[data-cs="jor"]');
  await jor.fill('10'); await jor.press('Tab');
  await expect.poll(() => page.evaluate(() => window.__dbGet('cs_meta', 'project').jorH)).toBe(10);
  await expect.poll(() => page.locator('[data-csc="k-AV"] [data-csf="hh"]').inputValue()).toBe('0.05');/* 10 h ÷ 200 */
  expect(errors).toEqual([]);
});

test('casco: Sectores reordena el tren, elimina alternativas y edita la incidencia; ya no hay Tren en Sectorización', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  await page.evaluate(async () => {
    await fcol('laminas').doc('lamT3').set({ pisoId: 'n3', base: true, esp: 'Estructuras', name: 'Encofrado', w: 2000, h: 1500, lw: 1000, lh: 750, fmt: 'image/webp', nf: 0, nl: 0, rev: 1, T: { a: 1, b: 0, e: 0, f: 0 }, aligned: true, plb: { id: 'EST_E03', cod: 'E-03', disc: 'EST', rev: 1, mpp: 0.01 }, order: 1, ts: 1 });
    const C = [200, 200, 1400, 200, 1400, 1000, 200, 1000];
    await fcol('kfr').doc('frA').set({ name: 'Frente A', code: 'A', color: '#1D9E75', from: 'n3', to: 'n8', order: 0, cua: { 'k-AV': 6 }, vac: 60, cE: { ref: 'n3', vista: 'lamT3', pts: C } });
    const J = csgDivide(csUnflat(C), 4, 'v').map(p => ({ p }));
    await fcol('ksec').doc('va').set({ n: 'Alternativa 1', fr: 'frA', grp: 'E', mode: 'j', jun: J, shp: [], met: {}, ritmo: 1, t0: 1, ap: { t: 1 } });
    await fcol('ksec').doc('vb').set({ n: 'Alternativa 2', fr: 'frA', grp: 'E', mode: 'j', jun: J, shp: [], met: {}, ritmo: 1, t0: 2 });
    U.tab = 'planos'; U.csSzV = 'sec'; render();
  });
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(4, { timeout: 15000 });
  /* A1 pasa a segundo lugar */
  await page.locator('[data-cszmv="0"][data-d="1"]').click();
  await expect.poll(() => page.evaluate(() => (window.__dbGet('cs_ksec', 'va').ord || []).join())).toBe('1,0,2,3');
  await page.locator('[data-csz="ordauto"]').click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('cs_ksec', 'va').ord)).toBeNull();
  /* eliminar la alternativa 2 (se archiva) */
  await page.locator('[data-csz="alt"]').selectOption('vb');
  page.once('dialog', d => d.accept());
  await page.locator('[data-csz="altdel"]').click();
  await expect.poll(() => page.evaluate(() => !!window.__dbGet('cs_ksec', 'vb').arch)).toBe(true);
  await expect(page.locator('[data-csz="alt"] option')).toHaveCount(1);
  /* la incidencia se edita en «Por partida» del asistente */
  await page.locator('[data-cszo="met"] summary').click();
  const inc = page.locator('[data-cszrat="k-AV"]');
  await inc.fill('14'); await inc.dispatchEvent('change');
  await expect.poll(() => page.evaluate(() => window.__dbGet('cs_mcat', 'k-AV').rat)).toBe(14);
  await expect(page.locator('#csszn [data-cszv="tren"]')).toHaveCount(0);
  expect(errors.filter(e => !/Failed to load resource|Falta una parte|imagen/i.test(e))).toEqual([]);
});

test('casco: «Actualizar a la secuencia típica» pasa un catálogo antiguo a la secuencia de horizontales sin tocar lo programado', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  const nAct = await page.evaluate(() => S.act.size);
  /* catálogo antiguo: encofrado y acero de vigas y losa en una sola partida */
  await page.evaluate(async () => {
    const b = db.batch();
    b.set(fcol('mcat').doc('k-EL'), { ref: 'k-EL', name: 'Encofrado de vigas y losa', grp: 'E', sc: 'cs-ramos', und: 'm²', off: 4, dur: 1, tr: 5, cl: 't', al: [] });
    b.set(fcol('mcat').doc('k-AL'), { ref: 'k-AL', name: 'Acero de vigas y losa', grp: 'E', sc: 'cs-aceros', und: 'kg', off: 5, dur: 1, tr: 6, cl: 't', al: [] });
    for (const k of ['EF1', 'AVG', 'EF2', 'ALO']) b.set(fcol('mcat').doc('k-' + k), { arch: { t: 1, by: 'x', n: 'x' } }, { merge: true });
    b.set(fcol('mcat').doc('k-VL'), { off: 7 }, { merge: true });
    await b.commit();
  });
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  /* las archivadas a mano no se reponen solas: solo vuelven si faltan del todo */
  await page.evaluate(async () => { for (const k of ['EF1', 'AVG', 'EF2', 'ALO']) await fcol('mcat').doc('k-' + k).delete(); });
  await expect(page.locator('[data-cs="seqtip"]')).toBeVisible();
  page.once('dialog', d => d.accept());
  await page.locator('[data-cs="seqtip"]').click();
  await expect.poll(() => page.evaluate(() => csCats('E').map(c => c.name + ':' + c.off).join(' | '))).toBe(
    'Acero de verticales:0 | Encofrado de verticales:1 | Concreto de verticales:2 | Desencofrado de verticales:3 | Encofrado de fondo y 1.er costado de viga:4 | Acero de vigas:5 | Encofrado de 2.º costado de viga y fondo de losa:6 | Acero de losa:7 | Instalaciones en losa:7 | Concreto de losa y vigas:8');
  expect(await page.evaluate(() => [MX.cat.get('k-EF1').sc, MX.cat.get('k-ALO').sc].join())).toBe('cs-ramos,cs-aceros');
  expect(await page.evaluate(() => S.act.size)).toBe(nAct);
  await expect(page.locator('[data-cs="seqtip"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

/* Sectorización › Niveles (casco-niv.js): partir, juntar, mover una cara con el vecino y copiar a un nivel con otra lámina */
test('casco: Niveles: partir y juntar sectores (lo programado se queda o pasa al vecino), mover una cara y copiar a otra lámina con dos puntos', async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const P = (id, cod, niv, mpp) => ['plb', id, { cod, disc: 'EST', niv, tit: 'Encofrado', tipo: 'Planta', rev: 1, base: 'planos/' + cod + '/r1', W: 4000, H: 3000, Z: 1, mm: [1200, 900], revs: [], cal: { mpp, rev: 1 } }];
  const errors = await openApp(page, { as: 'admin', extra: [P('EST_E03', 'E-03', 'P3', 0.005), P('EST_E05', 'E-05', 'P5', 0.005)] });
  await cargarEjemplo(page);
  await page.evaluate(async () => {
    const L = (id, pid, plb, w) => fcol('laminas').doc(id).set({ pisoId: pid, base: true, esp: 'Estructuras', name: 'Encofrado', w, h: w * 0.75, lw: w / 2, lh: w * 0.375, fmt: 'image/webp', nf: 0, nl: 0, rev: 1, T: { a: 1, b: 0, e: 0, f: 0 }, aligned: true, plb: { id: plb, cod: plb, disc: 'EST', rev: 1, mpp: 0.01 }, order: 1, ts: 1 });
    await L('lamT3', 'n3', 'EST_E03', 2000); await L('lamT5', 'n5', 'EST_E05', 1600);
  });
  await expect.poll(() => page.evaluate(() => !!(window.__plano && window.__plano.LAM && window.__plano.LAM.get('lamT3')))).toBe(true);
  /* T3: cuatro franjas verticales de 400 × 800 px */
  const ids = await page.evaluate(() => { const A = [...S.amb.values()].filter(a => a.sectorId === 'n3-e').sort(byOrder); const ops = A.map((a, i) => { const x = 200 + i * 400; return op('ambientes', a.id, { ...a, id: undefined, geo: { lamT3: [x, 300, x + 400, 300, x + 400, 1100, x, 1100] } }); }); ops.forEach(o => delete o.after.id); apply(ops, 'test');
    U.tab = 'planos'; U.csSzV = 'niv'; CNV.pid = 'n3'; render(); return A.map(a => a.id); });
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(4, { timeout: 15000 });
  const progOf = id => page.evaluate(i => cnvProg(i) + [...S.act.values()].filter(x => !x.arch && x.ambId === i).length, id);
  const p2 = await progOf(ids[1]);
  /* Partir S2 con una línea horizontal (herramienta y dos toques sobre el plano) */
  const scr = (x, y) => page.evaluate(([x, y]) => { const h = document.getElementById('csszmap'); const v = h._v; const r = h.getBoundingClientRect(); return { x: r.left + v.x + x * v.z, y: r.top + v.y + y * v.z }; }, [x, y]);
  await page.locator('[data-cnvt="cut"]').click();
  let q = await scr(620, 700); await page.mouse.click(q.x, q.y); q = await scr(780, 700); await page.mouse.click(q.x, q.y);
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(5);
  const r1 = await page.evaluate(() => { const A = [...S.amb.values()].filter(a => a.sectorId === 'n3-e' && !a.arch).sort(byOrder); return { codes: A.map(a => a.code).join(), hand: !!S.sec.get('n3-e').hand, newProg: cnvProg(A[2].id), id2: A[1].id, id3: A[2].id, a2: csPolyA(csUnflat(A[1].geo.lamT3)), a3: csPolyA(csUnflat(A[2].geo.lamT3)) }; });
  expect(r1.codes).toBe('S1,S2,S3,S4,S5'); expect(r1.hand).toBe(true); expect(r1.id2).toBe(ids[1]); expect(r1.newProg).toBe(0);
  expect(Math.round(r1.a2 + r1.a3)).toBe(320000);
  expect(await progOf(ids[1])).toBe(p2);/* el original conserva su programación */
  /* Juntar S4 y S5: los días programados de S5 desde mañana pasan a S4 */
  const fut5 = await page.evaluate(i => cnvProg(i), ids[3]);
  page.once('dialog', d => d.accept());
  await page.evaluate(([a, b]) => cnvJoin(cnvCtx(), a, b), [ids[2], ids[3]]);
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(4);
  const r2 = await page.evaluate(([k, g]) => ({ codes: [...S.amb.values()].filter(a => a.sectorId === 'n3-e' && !a.arch && !a.fus).sort(byOrder).map(a => a.code).join(), gone: cnvProg(g), area: Math.round(csPolyA(csUnflat(S.amb.get(k).geo.lamT3))) }), [ids[2], ids[3]]);
  expect(r2.codes).toBe('S1,S2,S3,S4'); expect(r2.gone).toBe(0); expect(r2.area).toBe(640000);
  expect(await page.evaluate(i => cnvProg(i), ids[2])).toBeGreaterThanOrEqual(fut5);
  /* Ajustar: mover la cara derecha de S1 100 px; el vecino S2 se ajusta con él */
  await page.evaluate(i => { CNV.tool = ''; CNV.sel = i; csNivDraw(); }, ids[0]);
  const hi = await page.evaluate(() => { const v = document.getElementById('csszmap')._v; return v.handles.findIndex(h => h.face && Math.abs(h.x - 600) < 1); });
  expect(hi).toBeGreaterThanOrEqual(0);
  const hb = await page.locator(`#csszmap .pvh[data-h="${hi}"]`).boundingBox();
  q = await scr(700, 700);
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down(); await page.mouse.move(q.x, q.y, { steps: 6 }); await page.mouse.up();
  const ar = i => page.evaluate(i => Math.round(csPolyA(csUnflat(S.amb.get(i).geo.lamT3))), i);
  await expect.poll(() => ar(ids[0])).toBeGreaterThan(385000);/* ~100 px más ancho (según el zoom de la pantalla) */
  /* S2 y S3 (las dos mitades del S2 partido) comparten esa cara: se achican lo mismo que crece S1 */
  expect((await ar(ids[0])) + (await ar(r1.id2)) + (await ar(r1.id3))).toBe(640000);
  expect(await ar(r1.id2)).toBeLessThan(160000);
  /* Copiar a T5 (otra lámina, escala 0,8): dos puntos en cada plano */
  await page.evaluate(() => { CNV.pid = 'n5'; CNV.sel = ''; csNivDraw(); });
  await page.locator('[data-cnv="copy"]').first().click();
  await expect(page.locator('#cnvcp')).toBeVisible();
  await page.evaluate(() => { CNV.cp.src = 'n3'; CNV.cp.s = [{ x: 200, y: 300 }, { x: 1800, y: 1100 }]; CNV.cp.t = [{ x: 100, y: 200 }, { x: 1380, y: 840 }]; cnvCpDraw(); });
  await expect(page.locator('#cnvcpf')).toContainText('0.800');
  await page.locator('[data-cnv="cpok"]').click();
  await expect.poll(() => page.evaluate(() => [...S.amb.values()].filter(a => a.sectorId === 'n5-e' && !a.arch).sort(byOrder).filter(a => a.geo && a.geo.lamT5).length)).toBe(4);
  const g5 = await page.evaluate(() => [...S.amb.values()].filter(a => a.sectorId === 'n5-e' && !a.arch).sort(byOrder)[0].geo.lamT5.slice(0, 2));
  expect(g5).toEqual([100, 200]);
  /* el panel de datos se ensancha con el tirador */
  const w0 = await page.locator('#csszside').boundingBox();
  const gb = await page.locator('#csszgrip').boundingBox();
  await page.mouse.move(gb.x + 3, gb.y + 100); await page.mouse.down(); await page.mouse.move(gb.x - 150, gb.y + 100, { steps: 5 }); await page.mouse.up();
  expect((await page.locator('#csszside').boundingBox()).width).toBeGreaterThan(w0.width + 100);
  expect(errors).toEqual([]);
});

/* Niveles con ejes, tercios, alineación de láminas, sectores nuevos y eliminar (28-10-2026) */
test('casco: Niveles: ejes y tercios (la junta se pega al tercio), alinear otra lámina, copiar sin puntos, nuevo y eliminar sector, menú de vértices', async ({ page }) => {
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('e2e.ns')) { localStorage.setItem('lps.ns', 'cs'); sessionStorage.setItem('e2e.ns', '1'); } } catch (e) {} });
  const P = (id, cod, niv) => ['plb', id, { cod, disc: 'EST', niv, tit: 'Encofrado', tipo: 'Planta', rev: 1, base: 'planos/' + cod + '/r1', W: 4000, H: 3000, Z: 1, mm: [1200, 900], revs: [], cal: { mpp: 0.005, rev: 1 } }];
  const errors = await openApp(page, { as: 'admin', extra: [P('EST_E03', 'E-03', 'P3'), P('EST_E05', 'E-05', 'P5')] });
  await cargarEjemplo(page);
  await page.evaluate(async () => {
    const L = (id, pid, plb, w) => fcol('laminas').doc(id).set({ pisoId: pid, base: true, esp: 'Estructuras', name: 'Encofrado', w, h: w * 0.75, lw: w / 2, lh: w * 0.375, fmt: 'image/webp', nf: 0, nl: 0, rev: 1, T: { a: 1, b: 0, e: 0, f: 0 }, aligned: true, plb: { id: plb, cod: plb, disc: 'EST', rev: 1, mpp: 0.01 }, order: 1, ts: 1 });
    await L('lamT3', 'n3', 'EST_E03', 2000); await L('lamT5', 'n5', 'EST_E05', 1600);
  });
  await expect.poll(() => page.evaluate(() => !!(window.__plano && window.__plano.LAM && window.__plano.LAM.get('lamT5')))).toBe(true);
  const ids = await page.evaluate(() => { const A = [...S.amb.values()].filter(a => a.sectorId === 'n3-e').sort(byOrder); const ops = A.map((a, i) => { const x = 200 + i * 400; const o = { ...a, geo: { lamT3: [x, 300, x + 400, 300, x + 400, 1100, x, 1100] } }; delete o.id; return op('ambientes', a.id, o); }); apply(ops, 'test');
    U.tab = 'planos'; U.csSzV = 'niv'; CNV.pid = 'n3'; render(); return A.map(a => a.id); });
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(4, { timeout: 15000 });
  const scr = (x, y) => page.evaluate(([x, y]) => { const h = document.getElementById('csszmap'); const v = h._v; const M = h._o.M || { a: 1, b: 0, e: 0, f: 0 }; const q = { x: M.a * x - M.b * y + M.e, y: M.b * x + M.a * y + M.f }; const r = h.getBoundingClientRect(); return { x: r.left + v.x + q.x * v.z, y: r.top + v.y + q.y * v.z }; }, [x, y]);
  /* ＃ Ejes: un eje con dos clics (ortogonal: queda vertical) */
  await page.locator('[data-cnvt="ejes"]').click();
  let q = await scr(200, 250); await page.mouse.click(q.x, q.y); q = await scr(210, 1150); await page.mouse.click(q.x, q.y);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.__plano.LAM.get('lamT3').ejes))).toBe(JSON.stringify([{ n: 'A', p: [200, 250, 200, 1150] }]));
  /* el resto de los ejes y sus tercios */
  await page.evaluate(() => { const l = window.__plano.LAM.get('lamT3'); csLamSet(l, { ejes: [...[200, 600, 1000, 1400, 1800].map((x, i) => ({ n: 'ABCDE'[i], p: [x, 250, x, 1150] })), { n: '1', p: [150, 300, 1850, 300] }, { n: '2', p: [150, 1100, 1850, 1100] }] }); CNV.tool = ''; csNivDraw(); });
  expect(await page.evaluate(() => csThirds(window.__plano.LAM.get('lamT3')).length)).toBe(10);
  /* Partir: la línea se pega al tercio C–D (x = 1133,3) */
  await page.locator('[data-cnvt="cut"]').click();
  q = await scr(1138, 600); await page.mouse.move(q.x, q.y); await page.mouse.click(q.x, q.y); q = await scr(1150, 900); await page.mouse.move(q.x, q.y); await page.mouse.click(q.x, q.y);
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(5);
  const xs = await page.evaluate(i => S.amb.get(i).geo.lamT3.filter((_, k) => k % 2 === 0), ids[2]);
  expect(xs.some(x => Math.abs(x - 1133.3) < 0.2)).toBe(true);
  await page.evaluate(() => undo());
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(4);
  /* clic derecho en una esquina: agregar un vértice hacia la siguiente */
  await page.evaluate(i => { CNV.tool = ''; CNV.sel = i; csNivDraw(); }, ids[0]);
  await page.locator('#csszmap .pvh').first().click({ button: 'right' });
  await page.locator('#pop button[data-do="nx"]').click();
  await expect.poll(() => page.evaluate(i => S.amb.get(i).geo.lamT3.length, ids[0])).toBe(10);
  /* Alinear T5 (otra lámina, escala 0,8) y copiar sin marcar puntos */
  await page.evaluate(() => { CNV.pid = 'n5'; CNV.sel = ''; csNivDraw(); });
  await expect(page.locator('#csszhint')).toContainText('no está alineado');
  await page.evaluate(() => { CNV.al = { pid: 'n5', s: [{ x: 200, y: 300 }, { x: 1800, y: 1100 }], t: [{ x: 100, y: 200 }, { x: 1380, y: 840 }], str: true }; csNivDraw(); });
  await expect(page.locator('#cnvcpf')).toContainText('0.800');
  await page.locator('[data-cnv="alok"]').click();
  await expect.poll(() => page.evaluate(() => { const m = csMap(window.__plano.LAM.get('lamT3'), window.__plano.LAM.get('lamT5')); return m ? [+m.a.toFixed(3), +m.e.toFixed(1), +m.f.toFixed(1)].join() : ''; })).toBe('0.8,-60,-40');
  await page.evaluate(() => { CNV.al = null; csNivDraw(); });
  await expect.poll(() => page.evaluate(() => !!document.getElementById('csszmap')._o.M)).toBe(true);/* T5 se ve enderezado en el marco de T3 */
  await page.locator('[data-cnv="copy"]').first().click();
  await expect(page.locator('#cnvcpf')).toContainText('alineados');
  await page.locator('[data-cnv="cpok"]').click();
  await expect.poll(() => page.evaluate(() => { const a = [...S.amb.values()].filter(a => a.sectorId === 'n5-e' && !a.arch).sort(byOrder)[0]; return a && a.geo && a.geo.lamT5 ? a.geo.lamT5.slice(0, 2).join() : ''; })).toBe('100,200');
  /* ▭ Nuevo: un sector al final del tren */
  const n0 = await page.evaluate(() => [...S.amb.values()].filter(a => a.sectorId === 'n5-e' && !a.arch).length);
  await page.locator('[data-cnvt="nr"]').click();
  const a1 = await scr(150, 1150), a2 = await scr(600, 1350);
  await page.mouse.move(a1.x, a1.y); await page.mouse.down(); await page.mouse.move(a2.x, a2.y, { steps: 5 }); await page.mouse.up();
  await expect.poll(() => page.evaluate(() => [...S.amb.values()].filter(a => a.sectorId === 'n5-e' && !a.arch).length)).toBe(n0 + 1);
  /* Eliminar en T3 un sector con días programados: pasan al anterior */
  await page.evaluate(i => { CNV.pid = 'n3'; CNV.tool = ''; CNV.sel = i; csNivDraw(); }, ids[1]);
  const before = await page.evaluate(([a, b]) => cnvProg(a) + cnvProg(b), [ids[0], ids[1]]);
  page.once('dialog', d => d.accept());
  await page.locator('[data-cnv="del"]').click();
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(3);
  expect(await page.evaluate(i => cnvProg(i), ids[0])).toBeGreaterThanOrEqual(before - 0);
  expect(await page.evaluate(i => cnvProg(i), ids[1])).toBe(0);
  expect(errors).toEqual([]);
});

test('formularios: seleccionar texto y soltar el mouse fuera no cierra la ventana', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin' });
  await page.evaluate(() => lqModal('<label>Nombre<input id="zzin" value="texto para seleccionar"></label>'));
  const b = await page.locator('#zzin').boundingBox();
  await page.mouse.move(b.x + b.width - 4, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(5, b.y + b.height / 2, { steps: 6 }); await page.mouse.up();
  await expect(page.locator('#lqm')).toBeVisible();
  await page.mouse.click(5, 5);/* un clic de verdad en el fondo sí la cierra */
  await expect(page.locator('#lqm')).toHaveCount(0);
  expect(errors).toEqual([]);
});
