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
  expect(r.cat).toBe(18);
  expect(r.cs).toBeGreaterThan(200);
  await expect(page.locator('#trw table.cstr')).toBeVisible();
  await expect(page.locator('#trw .csk').first()).toBeVisible();
  if (SHOT) await page.screenshot({ path: SHOT + '/tren.png' });
  expect(errors).toEqual([]);
});

test('casco: ficha de una celda, correr un día y Deshacer', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  const id = await page.evaluate(() => { const t = todayIso(); const x = [...S.act.values()].find(a => (a.days || []).length && a.days[0] > addD(t, 3) && a.name === 'Encofrado de vigas y losa'); return x.id; });
  const d0 = await page.evaluate(i => S.act.get(i).days.slice(), id);
  await page.evaluate(i => { const x = S.act.get(i); U.week = weekOf(x.days[0]); render(); }, id);
  await page.locator(`#trw [data-csa="${id}"]`).first().click();
  await expect(page.locator('#pop .cspop')).toBeVisible();
  if (SHOT) await page.screenshot({ path: SHOT + '/ficha.png' });
  await page.locator('#pop button[data-do="r"]').click();
  await expect.poll(() => page.evaluate(i => S.act.get(i).days[0], id)).not.toBe(d0[0]);
  await page.evaluate(() => undo());
  await expect.poll(() => page.evaluate(i => S.act.get(i).days.join(), id)).toBe(d0.join());
  expect(errors).toEqual([]);
});

test('casco: el generador no programa hoy ni días pasados y se puede deshacer', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  const n0 = await page.evaluate(() => S.act.size);
  /* quitar todo lo del techo 6 en adelante y volver a generarlo desde el techo 6 */
  const plan = await page.evaluate(() => { const p = csGenPlan({ from: 'n6', to: 'n8', start: addD(todayIso(), -10), pace: 1, gap: 1, albK: 2, grp: { E: 1, S: 1, A: 1 } }); return { n: p.ops.length, past: p.ops.some(o => (o.after.days || []).some(d => d <= todayIso()) && !o.before) }; });
  expect(plan.past).toBe(false);
  await page.evaluate(() => { U.tab = 'look'; U.lkV = 'tren'; render(); });
  await page.locator('[data-cs="gen"]').click();
  await expect(page.locator('#csgm')).toBeVisible();
  await expect(page.locator('#csg_prev')).toContainText('sin cambios');
  if (SHOT) await page.screenshot({ path: SHOT + '/generador.png' });
  await page.locator('#csg_pace').selectOption('2');
  await page.locator('#csgm [data-csg="ok"]').click();
  await expect(page.locator('#csgm')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => S.act.size)).toBeGreaterThanOrEqual(n0);
  expect(errors).toEqual([]);
});

test('casco: asistente de sectorización muestra el balance y aplica una versión', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  await expect(page.locator('.cscat tbody tr')).toHaveCount(18);
  await expect(page.locator('[data-cs="secv"]')).toHaveCount(3);
  if (SHOT) await page.screenshot({ path: SHOT + '/config.png', fullPage: true });
  await page.locator('[data-cs="secv"][data-id="v1"]').click();
  await expect(page.locator('#cssm .csmet')).toBeVisible();
  await expect(page.locator('#cssm tr.cssum .csbal').first()).toBeVisible();
  if (SHOT) await page.screenshot({ path: SHOT + '/asistente.png' });
  /* 5 sectores desde el sótano al techo 1: los sectores que no existen se crean */
  await page.locator('#css_to').selectOption('n1');
  await page.locator('#css_k').fill('5'); await page.locator('#css_k').dispatchEvent('change');
  await page.locator('#cssm [data-css="apply"]').click();
  await expect.poll(() => page.evaluate(() => csAmbs('n1', 'E').length)).toBe(5);
  expect(await page.evaluate(() => csAmbs('n2', 'E').length)).toBe(4);
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

test('casco: el asistente dibuja un sector sobre la lámina, da su área con la escala del módulo Planos y calcula metrados con los ratios', async ({ page }) => {
  const errors = await casco(page);
  await cargarEjemplo(page);
  await page.evaluate(async () => {
    const L = (id, pid) => fcol('laminas').doc(id).set({ pisoId: pid, base: true, esp: 'Estructura', name: 'Encofrado techo típico', w: 2000, h: 1500, lw: 1000, lh: 750, fmt: 'image/webp', nf: 0, nl: 0, rev: 1, T: { a: 1, b: 0, e: 0, f: 0 }, aligned: true, plb: { id: 'EST_E03', cod: 'E-03', rev: 1, mpp: 0.01 }, order: 1, ts: 1 });
    await L('lamT3', 'n3'); await L('lamT4', 'n4');
  });
  await page.evaluate(() => { U.tab = 'cfg'; U.cfgV = 'cas'; render(); });
  await page.locator('[data-cs="secv"][data-id="v1"]').click();
  await page.locator('#css_ref').selectOption('n3');
  await expect(page.locator('#cssmap .pvs')).toHaveCount(1, { timeout: 15000 });
  await page.locator('[data-csst="0"]').click();
  await page.locator('[data-cstool="rect"]').click();
  const bx = await page.locator('#cssmap').boundingBox();
  await page.mouse.move(bx.x + 60, bx.y + 60); await page.mouse.down();
  await page.mouse.move(bx.x + 160, bx.y + 120, { steps: 5 }); await page.mouse.move(bx.x + 220, bx.y + 180, { steps: 5 }); await page.mouse.up();
  await expect(page.locator('[data-csst="0"] b')).toContainText('m²');
  const r = await page.evaluate(() => { const a = +document.querySelector('[data-csst="0"] b').textContent.replace(/[^\d.]/g, ''); const vl = +document.querySelector('[data-cssm="k-VL:0"]').value; return { a, vl }; });
  expect(r.a).toBeGreaterThan(0);
  expect(r.vl).toBeCloseTo(Math.round(r.a * 0.2 * 10) / 10, 1);
  if (SHOT) await page.screenshot({ path: SHOT + '/asistente-plano.png' });
  await page.locator('#cssm [data-css="apply"]').click();
  await expect.poll(() => page.evaluate(() => !!(S.amb.get('n3-e1').geo || {}).lamT3)).toBe(true);
  expect(await page.evaluate(() => !!(S.amb.get('n4-e1').geo || {}).lamT4)).toBe(true);
  expect(await page.evaluate(() => (S.amb.get('n3-e1').geo || {}).lamT4)).toBeUndefined();
  expect(errors.filter(e => !/Failed to load resource|Falta una parte|imagen/i.test(e))).toEqual([]);
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
  await expect.poll(() => page.evaluate(() => [...window.__plano.LAM.values()].filter(l => l.plb).map(l => l.pisoId + ':' + l.plb.disc).sort().join()), { timeout: 30000 }).toBe('n3:ARQ,n3:EST,n4:EST');
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
  expect(r).toEqual({ pis: 0, sec: 0, amb: 0, ksec: 0, meta: true, cat: 18, lpActs: lp0.acts, lpPis: lp0.pis, hitCs: 0, hitLp: lp0.hit });
  expect(errors).toEqual([]);
});
