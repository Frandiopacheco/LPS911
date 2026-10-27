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

test('casco: Lookahead › Tren editable como Excel: programar un día, mover y quitar celdas, copiar y pegar, ficha', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  const id = await page.evaluate(() => { const t = todayIso(); const x = [...S.act.values()].find(a => (a.days || []).length === 1 && a.days[0] > addD(t, 3) && a.name === 'Encofrado de 2.º costado de viga y fondo de losa'); return x.id; });
  const d0 = await page.evaluate(i => S.act.get(i).days.slice(), id);
  await page.evaluate(i => { const x = S.act.get(i); U.week = weekOf(x.days[0]); render(); }, id);
  await expect(page.locator('tr.ctfrh')).toHaveCount(1);
  /* seleccionar y mover con → (un día hábil), Deshacer */
  await page.locator(`#trw [data-csa="${id}"]`).first().click();
  await expect(page.locator('#ctbar')).toContainText('1 celda');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(i => S.act.get(i).days[0], id)).toBe(await page.evaluate(d => wshift(d, 1), d0[0]));
  await page.evaluate(() => undo());
  await expect.poll(() => page.evaluate(i => S.act.get(i).days.join(), id)).toBe(d0.join());
  /* doble clic: ficha */
  await page.locator(`#trw [data-csa="${id}"]`).first().dblclick();
  await expect(page.locator('#pop .cspop')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => closePop());
  /* copiar la celda y pegarla en un día vacío de la misma fila, en el nivel siguiente */
  await page.evaluate(() => { CT.sel.clear(); });
  await page.locator(`#trw [data-csa="${id}"]`).first().click();
  await page.keyboard.press('Control+c');
  const tgt = await page.evaluate(i => { const x = S.act.get(i); const tr = document.querySelector(`#trw [data-csa="${i}"]`).closest('tr'); const tds = [...tr.querySelectorAll('td.ctc')]; const td = tds.find(td => td.dataset.d > x.days[0] && isWork(td.dataset.d) && !td.querySelector('.csk')); return td.dataset.d; }, id);
  const n0 = await page.evaluate(() => S.act.size);
  await page.locator(`#trw tr:has([data-csa="${id}"]) td.ctc[data-d="${tgt}"]`).click();
  await page.locator('#pop button[data-do="paste1"]').click();
  /* va al mismo sector del nivel siguiente (se suma a su actividad si ya existía) */
  await expect.poll(() => page.evaluate(([i, d]) => { const x = S.act.get(i); const amb = ctMapAmb(x.ambId, 1, '_'); return [...S.act.values()].some(y => y.ambId === amb && y.name === x.name && (y.days || []).includes(d)); }, [id, tgt])).toBe(true);
  expect(await page.evaluate(() => S.act.size)).toBeGreaterThanOrEqual(n0);
  /* programar un sector en un día vacío (sugerencia: el siguiente sector de la fila) */
  const free = await page.evaluate(i => { const tr = document.querySelector(`#trw [data-csa="${i}"]`).closest('tr'); const td = [...tr.querySelectorAll('td.ctc')].reverse().find(td => isWork(td.dataset.d) && !td.querySelector('.csk') && td.dataset.d > todayIso()); return td.dataset.d; }, id);
  await page.locator(`#trw tr:has([data-csa="${id}"]) td.ctc[data-d="${free}"]`).click();
  await page.locator('#pop button[data-do="add"]').first().click();
  await expect.poll(() => page.evaluate(d => [...S.act.values()].some(y => y.name === 'Encofrado de 2.º costado de viga y fondo de losa' && (y.days || []).includes(d)), free)).toBe(true);
  /* quitar con Supr */
  await page.locator(`#trw tr:has([data-csa="${id}"]) td.ctc[data-d="${free}"] .csk`).first().click();
  await page.keyboard.press('Delete');
  await expect.poll(() => page.evaluate(d => [...S.act.values()].some(y => y.name === 'Encofrado de 2.º costado de viga y fondo de losa' && (y.days || []).includes(d)), free)).toBe(false);
  if (SHOT) await page.screenshot({ path: SHOT + '/tren-editable.png' });
  expect(errors).toEqual([]);
});

test('casco: Tren: filas por frente: insertar, copiar y pegar debajo, ordenar y eliminar', async ({ page }) => {
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
  /* la copia queda justo debajo */
  expect(await page.evaluate(() => { const R = ctRows('_'); const i = R.findIndex(r => r.name === 'Acero de vigas'); return R[i + 1].name; })).toBe('Acero de vigas');
  /* insertar una fila nueva (otra partida) */
  await lab('Acero de losa').click();
  await page.locator('#ctbar [data-ctra="ins"]').click();
  await page.locator('#pop button[data-do="cat"]', { hasText: 'Curado' }).count();
  page.once('dialog', d => d.accept('Curado de losa'));
  await page.locator('#pop button[data-do="other"]').click();
  await expect.poll(() => page.evaluate(() => ctRows('_').some(r => r.name === 'Curado de losa'))).toBe(true);
  expect(await page.evaluate(() => { const R = ctRows('_'); return R[R.findIndex(r => r.name === 'Acero de losa') + 1].name; })).toBe('Curado de losa');
  /* subir la fila nueva y eliminarla */
  await lab('Curado de losa').click();
  await page.locator('#ctbar [data-ctra="up"]').click();
  await expect.poll(() => page.evaluate(() => { const R = ctRows('_'); return R[R.findIndex(r => r.name === 'Curado de losa') + 1].name; })).toBe('Acero de losa');
  page.once('dialog', d => d.accept());
  await page.locator('#ctbar [data-ctra="del"]').click();
  await expect.poll(() => page.evaluate(() => ctRows('_').some(r => r.name === 'Curado de losa'))).toBe(false);
  expect(nAV).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('casco: Proyectar copia el tren del techo modelo a los niveles siguientes sin tocar lo programado ni el pasado', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  /* dejar programado solo el techo 4 (y lo de albañilería de pisos bajos) */
  await page.evaluate(() => { const ops = []; for (const x of S.act.values()) { const s = csSecOf(S.amb.get(x.ambId)); if (s && ['n5', 'n6', 'n7', 'n8'].includes(s.pisoId)) ops.push(arc('acts', x.id)); } apply(ops, 'test'); U.tab = 'look'; U.lkV = 'tren'; render(); });
  const n0 = await page.evaluate(() => S.act.size);
  const m4 = await page.evaluate(() => [...S.act.values()].filter(x => (csSecOf(S.amb.get(x.ambId)) || {}).pisoId === 'n4').length);
  await page.locator('[data-ctp="_"]').click();
  await page.locator('#ctp_m').selectOption('n4');
  await page.locator('#ctp_to').selectOption('n6');
  await expect(page.locator('#ctp_prev')).toContainText('2 nivel');
  if (SHOT) await page.screenshot({ path: SHOT + '/proyectar.png' });
  await page.locator('#ctpm [data-ctp2="ok"]').click();
  await expect.poll(() => page.evaluate(() => S.act.size)).toBeGreaterThan(n0);
  const r = await page.evaluate(() => { const t = todayIso(); const L = [...S.act.values()].filter(x => ['n5', 'n6'].includes((csSecOf(S.amb.get(x.ambId)) || {}).pisoId)); return { n5: L.filter(x => csSecOf(S.amb.get(x.ambId)).pisoId === 'n5').length, past: L.some(x => x.days.some(d => d <= t)), n7: [...S.act.values()].filter(x => (csSecOf(S.amb.get(x.ambId)) || {}).pisoId === 'n7').length }; });
  /* el techo 5 tiene 3 sectores (versión 2): menos actividades que el modelo de 4 sectores */
  expect(r.n5).toBeGreaterThan(0); expect(r.n5).toBeLessThan(m4 + 1); expect(r.past).toBe(false); expect(r.n7).toBe(0);
  /* proyectar otra vez no duplica: los sectores ya programados se respetan */
  const n1 = await page.evaluate(() => S.act.size);
  const again = await page.evaluate(() => ctProjPlan('_', { model: 'n4', to: 'n6', mode: 'fin' }));
  expect(again.add).toBe(0); expect(again.skip).toBeGreaterThan(0);
  await page.evaluate(() => undo());
  await expect.poll(() => page.evaluate(() => S.act.size)).toBe(n0);
  expect(n1).toBeGreaterThan(n0);
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
  const t3 = page.locator('[data-cslv="tc"][data-id="n3"]');
  await t3.fill('T-3'); await t3.blur();
  await expect.poll(() => page.evaluate(() => S.pis.get('n3').tc)).toBe('T-3');
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
  expect(await page.evaluate(() => pisos().at(-1).code)).toBe('A');
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
  await expect(page.locator('#csszside .csszi li').first().locator('.csszd')).toHaveClass(/good/);/* 4 de igual área: carga pareja */
  await expect(page.locator('#csszside .csszrec')).toContainText('sector');
  if (SHOT) await page.screenshot({ path: SHOT + '/sectorizacion.png' });
  /* una junta más parte el primer sector: 5; Deshacer vuelve a 4 */
  await page.locator('[data-cszt="jun"]').click();
  await page.mouse.click(bx.x + 120, bx.y + 150); await page.mouse.click(bx.x + 120, bx.y + 250);
  await expect(page.locator('#csszside .csfst tbody tr')).toHaveCount(5);
  await expect(page.locator('#csszside .csszi li').first().locator('.csszd')).not.toHaveClass(/good/);
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
