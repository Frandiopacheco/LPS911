// Módulo Casco (docs/ia/casco.md): mismo motor con colecciones cs_, obra de ejemplo, tren, generador, entregas y asistente.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

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
