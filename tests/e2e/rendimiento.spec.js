// Velocidad con una obra grande (2400 actividades, 25 subcontratistas). Mide estilo, diseño y código del navegador
// al entrar a las pestañas. Los límites son amplios (las máquinas de GitHub varían) y avisan si algo se vuelve lento.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
import { obraGrande } from './obra-grande.js';

test('entrar y volver al Lookahead con una obra grande', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page, { extra: obraGrande() });
  const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
  const M = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const res = {};
  for (const [i, tab] of ['look', 'restr', 'look', 'campo', 'look'].entries()) {
    const a = await M(); const t0 = Date.now();
    await page.evaluate(t => { goTab(t); document.body.offsetHeight; return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, tab);
    const b = await M();
    res[i + '_' + tab] = { ms: Date.now() - t0, estilo: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), diseno: Math.round((b.LayoutDuration - a.LayoutDuration) * 1000), codigo: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000) };
  }
  res.nodos = await page.evaluate(() => document.querySelectorAll('*').length);
  // editar una actividad con el Lookahead abierto (cada cambio vuelve a dibujar)
  { const a = await M(); const t0 = Date.now();
    await page.evaluate(() => window.firebase.firestore().collection('acts').doc('xx5').update({ name: 'Cambio' }).then(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 30))));
    const b = await M(); res.editar = { ms: Date.now() - t0, estilo: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), codigo: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000) }; }
  console.log('RENDIMIENTO ' + JSON.stringify(res));
  expect(res['0_look'].ms, 'primera entrada al Lookahead').toBeLessThan(8000);
  expect(res['2_look'].ms, 'volver al Lookahead').toBeLessThan(2500);
  expect(res.editar.ms, 'redibujar tras un cambio').toBeLessThan(1500);
});

test('Lookahead grande: se dibuja lo que se ve y al bajar aparece lo demás', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { extra: obraGrande(), tab: 'look' });
  const filas = () => page.locator('#grid tr[data-a]').count();
  expect(await filas(), 'no dibuja las 2400 filas de golpe').toBeLessThan(400);
  // bajar hasta el final: aparece la última actividad del último ambiente
  await page.evaluate(() => { const g = document.getElementById('gw'); g.scrollTop = g.scrollHeight; });
  await expect(page.locator('#grid tr[data-a="xx2399"]')).toHaveCount(1);
  expect(await filas()).toBeLessThan(400);
  // editar una actividad lejana
  const inp = page.locator('input[data-a="xx2399"][data-f="name"]');
  await inp.fill('Última editada'); await inp.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 'xx2399').name)).toBe('Última editada');
  // volver arriba y desde Restricciones ir a una actividad que no está dibujada
  await page.evaluate(() => { document.getElementById('gw').scrollTop = 0; });
  await page.evaluate(() => gotoAct('xx1800'));
  await expect(page.locator('#grid tr[data-a="xx1800"]')).toBeVisible();
  // el subcontratista de la fila se elige de la lista completa
  const sel = page.locator('select[data-a="xx1800"][data-f="sc"]');
  await sel.focus();
  expect(await sel.locator('option').count()).toBe(25);
  noErrors(errors, 'lookahead grande');
});

// (auditoría de código 08/10, L2/L10) el HTML de cada fila se arma solo cuando se pinta; al desplazarse se arman las nuevas
test('Lookahead grande: solo se arma el HTML de las filas que se pintan', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { extra: obraGrande(), tab: 'look' });
  const st = () => page.evaluate(() => ({ n: LKHB, total: GV.rows.length, armadas: GV.rows.filter(r => r.s !== null).length, tramo: GV.r1 - GV.r0,
    tramoArmado: GV.rows.slice(GV.r0, GV.r1).every(r => r.s !== null) }));
  // redibujar (como cuando llega un cambio): solo se arma el tramo visible
  await page.evaluate(() => { LKHB = 0; render(); });
  const a = await st();
  expect(a.total, 'obra grande').toBeGreaterThan(2000);
  expect(a.n, 'filas armadas al redibujar').toBe(a.tramo);
  expect(a.armadas).toBe(a.tramo);
  expect(a.n).toBeLessThan(400);
  // la tabla conserva el encabezado al desplazarse; se arman solo las filas que entran
  const b = await page.evaluate(() => { const th = document.querySelector('#grid thead'); LKHB = 0; const r0 = GV.r0, r1 = GV.r1;
    const gw = document.getElementById('gw'); gw.scrollTop += 900; virtPaint(false); markPeers();
    return { n: LKHB, nuevas: Math.max(0, GV.r1 - r1) + Math.max(0, r0 - GV.r0), mismoTh: document.querySelector('#grid thead') === th }; });
  expect(b.n, 'al desplazarse se arman solo las filas nuevas').toBe(b.nuevas);
  expect(b.n).toBeGreaterThan(0);
  expect(b.mismoTh, 'no rehace el encabezado').toBe(true);
  const c = await st();
  expect(c.tramoArmado).toBe(true);
  expect(c.armadas).toBeLessThan(c.total / 4);
  // gridReveal (Ver en el lookahead) encuentra una fila lejana que aún no se armó
  expect(await page.evaluate(() => GV.rows.find(r => r.k.startsWith('x:xx2399')).s)).toBeNull();
  await page.evaluate(() => gotoAct('xx2399'));
  await expect(page.locator('#grid tr[data-a="xx2399"]')).toBeVisible();
  noErrors(errors, 'filas perezosas');
});

// las filas que se arman al desplazarse respetan el modo con que se dibujó la grilla (aquí, el modo consulta: sin editar)
test('Lookahead grande en modo consulta: las filas que aparecen al bajar siguen sin poder editarse', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { extra: obraGrande(), tab: 'look', editar: false });
  // se revisa en el mismo instante en que se pintan (antes de que otro dibujo completo las rehaga)
  const ro = await page.evaluate(() => { const g = document.getElementById('gw'); g.scrollTop = g.scrollHeight; virtPaint(false); markPeers();
    const i = document.querySelector('#grid input[data-a="xx2399"][data-f="name"]'); return i ? i.readOnly : 'no está'; });
  expect(ro, 'fila armada al desplazarse: solo lectura').toBe(true);
  const inp = page.locator('input[data-a="xx2399"][data-f="name"]');
  await expect(inp).toHaveCount(1);
  await expect(inp).toHaveAttribute('readonly', '');
  expect(await page.locator('#grid button[data-actmenu]').count(), 'sin menú de actividad en modo consulta').toBe(0);
  noErrors(errors, 'modo consulta grande');
});

test('Restricciones con muchas restricciones y una obra grande abre rápido', async ({ page }) => {
  test.setTimeout(120_000);
  const ex = obraGrande(); const acts = ex.filter(e => e[0] === 'acts').map(e => e[1]);
  for (let i = 0; i < 1500; i++) ex.push(['restr', 'rr' + i, { actId: acts[(i * 7) % acts.length], type: 'Materiales', desc: 'r' + i, resp: '', need: '2026-10-05', freed: '', status: 'pend', created: '2026-09-30' }]);
  const errors = await openApp(page, { extra: ex });
  await page.evaluate(() => { U.piso = ''; });
  const t0 = Date.now();
  await page.evaluate(() => { goTab('restr'); document.body.offsetHeight; return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
  const ms = Date.now() - t0;
  console.log('RESTRICCIONES ' + ms + ' ms');
  expect(ms, 'abrir Restricciones').toBeLessThan(3000);
  // se dibujan por tandas: 150 filas y «Mostrar más»
  expect(await page.locator('#main table.t tbody tr').count()).toBeLessThanOrEqual(151);
  await page.click('#rmore');
  expect(await page.locator('#main table.t tbody tr').count()).toBeGreaterThan(400);
  // el selector de actividad se llena al abrirlo
  const sel = page.locator('#main select[data-f="actId"]').first();
  expect(await sel.locator('option').count()).toBe(1);
  // con la máquina cargada puede llegar un redibujo entre abrir y contar: se vuelve a abrir hasta ver la lista llena
  await expect.poll(async () => { await sel.dispatchEvent('mousedown'); return sel.locator('option').count(); }, { timeout: 15000 }).toBeGreaterThan(100);
  noErrors(errors, 'restricciones grande');
});

test('Plan diario con una obra grande: abrir, recibir cambios de otros y desplazar el plano', async ({ page }) => {
  test.setTimeout(150_000);
  const { LAMINA } = await import('./lamina.js');
  const ex = obraGrande();
  // cada ambiente con su forma en la lámina (rejilla 12 × 10): ~160 actividades por día y muchos cruces
  for (const e of ex) if (e[0] === 'ambientes') { const a = +e[1].slice(2); const cx = (a % 12) * 82 + 10, cy = Math.floor(a / 12) * 58 + 10; e[2].geo = { L1: [cx, cy, cx + 78, cy, cx + 78, cy + 54, cx, cy + 54] }; }
  const errors = await openApp(page, { extra: [...LAMINA, ...ex] });
  const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
  const M = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const res = {};
  let a = await M(); let t0 = Date.now();
  await page.evaluate(() => { goTab('mapa'); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); });
  await page.waitForFunction(() => window.__plano && window.__plano.M.view && window.__plano.M.view.fitted && document.querySelectorAll('#mstage .pvl.nb').length > 50, null, { timeout: 60000 });
  let b = await M(); res.abrir = { ms: Date.now() - t0, codigo: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000) };
  res.zonas = await page.locator('#mstage .pvl.nb').count();
  // otro usuario cambia algo del plan del día (llega por la base y se redibuja)
  a = await M(); t0 = Date.now();
  await page.evaluate(d => window.firebase.firestore().collection('pdz').doc('rem1').set({ date: d, pisoId: 'p1', sc: 'c2', kind: 'texto', pts: [50, 50], t: 'Nota', by: 'otro' }).then(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 30))), await page.evaluate(() => window.__plano.M.date));
  b = await M(); res.cambio = { ms: Date.now() - t0, codigo: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000) };
  // desplazar el plano (30 movimientos)
  const box = await page.locator('#mstage').boundingBox();
  a = await M(); t0 = Date.now();
  await page.mouse.move(box.x + 300, box.y + 300); await page.mouse.down();
  for (let i = 0; i < 30; i++) await page.mouse.move(box.x + 300 + i * 4, box.y + 300 + i * 2);
  await page.mouse.up();
  b = await M(); res.desplazar = { ms: Date.now() - t0, codigo: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000) };
  console.log('PLAN DIARIO ' + JSON.stringify(res));
  expect(res.abrir.ms, 'abrir el Plan diario').toBeLessThan(10000);
  expect(res.cambio.ms, 'redibujar tras un cambio de otro usuario').toBeLessThan(2500);
  expect(res.desplazar.codigo, 'desplazar no vuelve a armar las etiquetas').toBeLessThan(1500);
  noErrors(errors, 'plan diario grande');
});
