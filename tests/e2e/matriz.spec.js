// Matriz de ambientes (js/matriz.js): carga del catálogo, estados por celda, selección en bloque, nombres sin catálogo y foto semanal.
import { test, expect } from '@playwright/test';
/* filtro de SC de la matriz: menú «Subcontratistas ▾» (clic = solo ese, Ctrl+clic = sumar) */
const pickSc = async (page, id, add) => { if (!(await page.locator('#pop:not([hidden]) [data-mxsk]').count())) await page.click('#mxscdd'); await page.click(`#pop [data-mxsk="${id}"]`, add ? { modifiers: ['Control'] } : {}); };
import { openApp, noErrors } from './helpers.js';
/* estas pruebas ubican las celdas por posición: columnas en orden alfabético (el orden por programación se prueba aparte) */
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { const k = 'lps911.ui'; const u = JSON.parse(localStorage.getItem(k) || '{}'); if (!u.mxOrd) { u.mxOrd = 'az'; localStorage.setItem(k, JSON.stringify(u)); } } catch (e) {} }); });

/* catálogo de prueba: «Redes empotradas» (SC c1) y «Tarrajeo de muros» (SC c3); el tipo «Dpto» trae las dos */
const CAT = [
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  ['mtipo', 'tp1', { name: 'Dpto', acts: ['k1', 'k2'], order: 10 }],
  ['mamb', 'a1', { tipo: 'tp1', by: 'x', t: 1 }],
];
const cell = (page, amb, i) => page.locator(`#mxt tr[data-amb="${amb}"] td[data-k="${i}"]`);

test('sin catálogo: el administrador lo carga desde el archivo y no reemplaza lo que ya existe', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat' });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'mat');
  await expect(page.locator('#main')).toContainText('Todavía no hay catálogo');
  page.on('dialog', d => d.accept());
  const file = { formato: 'lps911-matriz-v1', fuente: 'prueba', mcat: Object.fromEntries(CAT.filter(c => c[0] === 'mcat').map(c => [c[1], c[2]])),
    mtipo: { tp1: CAT[2][2] }, mamb: { a1: { tipo: 'tp1' }, a2: { tipo: 'tp1' }, zz: { tipo: 'tp1' } } };
  await page.setInputFiles('#mximp', { name: 'm.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await expect(page.locator('#mxt')).toBeVisible();
  expect(await page.evaluate(() => window.__dbGet('mcat', 'k1').name)).toBe('Redes empotradas');
  expect(await page.evaluate(() => window.__dbGet('mamb', 'a2').tipo)).toBe('tp1');
  expect(await page.evaluate(() => window.__dbGet('mamb', 'zz'))).toBeUndefined(); // ambiente que no existe en la obra
  // cargar de nuevo: no cambia lo que ya está
  await page.evaluate(() => fcol('mcat').doc('k1').set({ name: 'Renombrada' }, { merge: true }));
  await page.setInputFiles('#mximp', { name: 'm.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await expect.poll(() => page.evaluate(() => window.__dbGet('mcat', 'k1').name)).toBe('Renombrada');
  noErrors(errors, 'carga del catálogo');
});

test('editor: marca una celda, selecciona una columna y la valida en bloque; Deshacer', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: CAT });
  await expect(page.locator('#mxt')).toBeVisible();
  // abre en consulta: tocar una celda solo muestra la ficha, sin botones para cambiarla
  await cell(page, 'a1', 0).click();
  await expect(page.locator('#pop')).toContainText('Editar');
  await expect(page.locator('#pop button[data-s]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.click('#mxedit');
  // a1 tiene tipo: sus dos actividades salen propuestas (sin validar)
  await expect(cell(page, 'a1', 0)).toHaveClass(/sug/);
  // clic en la celda → ficha → Terminado
  await cell(page, 'a1', 0).click();
  await page.click('#pop button[data-s="t"]');
  await expect.poll(() => page.evaluate(() => (window.__dbGet('mamb', 'a1') || {}).c)).toEqual({ k1: 't' });
  await expect(cell(page, 'a1', 0)).toHaveClass(/s-t/);
  await expect(cell(page, 'a1', 0)).not.toHaveClass(/sug/);
  // la columna de Tarrajeo: seleccionar con el encabezado y validar con Enter
  await page.click('#mxt th[data-mxcol="1"]');
  await expect(page.locator('#mxsb')).toContainText('celda');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__dbGet('mamb', 'a1').c.k2)).toBe('p');
  // fila completa (clic en el ambiente) + tecla 2 = En curso; Deshacer vuelve a lo propuesto
  await page.locator('#mxt tr[data-amb="a2"] th.mxa').click();
  await page.keyboard.press('2');
  await expect.poll(() => page.evaluate(() => (window.__dbGet('mamb', 'a2') || {}).c)).toEqual({ k1: 'c', k2: 'c' });
  await page.click('#toast button');
  // vuelve a lo de antes: k1 sin confirmar y k2 «pendiente» (lo validó la columna)
  await expect.poll(() => page.evaluate(() => (window.__dbGet('mamb', 'a2') || {}).c || {})).toEqual({ k2: 'p' });
  await expect(cell(page, 'a2', 0)).toHaveClass(/sug/);
  // tipo de ambiente
  await page.selectOption('select[data-mxtipo="a2"]', 'tp1');
  await expect.poll(() => page.evaluate(() => (window.__dbGet('mamb', 'a2') || {}).tipo)).toBe('tp1');
  noErrors(errors, 'matriz editor');
});

test('nombres del lookahead sin catálogo: se asignan a una actividad y desde ahí salen en la matriz', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await expect(page.locator('.mxun')).toContainText('1 nombre');
  await page.click('#mxmap');
  await page.selectOption('[data-mxm="0"]', 'k1');
  await page.click('#mxmok');
  await expect.poll(() => page.evaluate(() => window.__dbGet('mcat', 'k1').al)).toEqual(['redes empotradas', 'entubado empotrado']);
  // «Entubado empotrado» es de otro SC (c2) que la actividad elegida (c1): ya no sale como «sin catálogo», sino en el aviso de otro SC (auditoría 08/10, M02)
  await expect(page.locator('.mxun')).toHaveCount(1);
  await expect(page.locator('.mxun')).toContainText('otro subcontratista');
  noErrors(errors, 'nombres sin catálogo');
});

test('foto semanal y comparar: marca lo que cambió desde la foto', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  page.on('dialog', d => d.accept());
  await page.click('#mxedit');
  await page.click('#mxfoto');
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('mver')).length)).toBe(1);
  const f = await page.evaluate(() => Object.values(window.__dbAll('mver'))[0]);
  expect(f.a.a1).toContain('k1:p');
  // al guardar se ve el historial con la foto recién guardada
  await expect(page.locator('#lqm .mxfh.nw')).toContainText('recién guardada');
  await page.click('#lqm [data-lqx].pri');
  await expect(page.locator('#mxcmp')).not.toHaveValue('');
  await cell(page, 'a1', 0).click();
  await page.click('#pop button[data-s="t"]');
  await expect(cell(page, 'a1', 0)).toHaveClass(/chg/);
  noErrors(errors, 'foto semanal');
});

test('subcontratista: ve la matriz; en su partida solo tiene los botones de SC', async ({ page }) => {
  const errors = await openApp(page, { as: 'sc', tab: 'mat', extra: CAT });
  await expect(page.locator('#mxt')).toBeVisible();
  await expect(page.locator('select[data-mxtipo]')).toHaveCount(0);
  await expect(page.locator('#mxfoto')).toHaveCount(0);
  await page.click('#mxedit');
  await cell(page, 'a1', 0).click();
  await expect(page.locator('#pop')).toContainText('Redes empotradas');
  // su partida (c1): solo los botones de SC (cambio directo con constancia), no los del ingeniero
  await expect(page.locator('#pop button[data-do="s"]')).toHaveCount(0);
  await expect(page.locator('#pop button[data-do="scs"]')).toHaveCount(4);
  noErrors(errors, 'matriz SC');
});

test('filtro de varios subcontratistas: solo sus columnas y los ambientes donde tienen algo', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: [...CAT, ['mcat', 'k3', { name: 'Entubado', sc: 'c2', cl: 't', al: ['entubado empotrado'], ord: 30 }]] });
  await expect(page.locator('#mxt th.mxc')).toHaveCount(3);
  await pickSc(page, 'c3');
  await expect(page.locator('#mxt th.mxc')).toHaveCount(1);
  await expect(page.locator('#mxt th.mxc')).toContainText('Tarrajeo');
  // clic solo elige ese SC; Ctrl+clic suma o quita (mismo criterio que el Lookahead y el Tablero)
  await pickSc(page, 'c1');
  expect(await page.evaluate(() => U.mxSc)).toEqual(['c1']);
  await pickSc(page, 'c3', true);
  await expect(page.locator('#mxt th.mxc')).toHaveCount(2);
  expect(await page.evaluate(() => U.mxSc)).toEqual(['c1', 'c3']);
  expect(await page.evaluate(() => U.sc)).toBe(''); // no cambia el filtro del lookahead
  await pickSc(page, 'c3', true);
  await expect(page.locator('#mxt th.mxc')).toHaveCount(1);
  await pickSc(page, '');
  await expect(page.locator('#mxt th.mxc')).toHaveCount(3);
  noErrors(errors, 'filtro SC');
});

test('vista de escritorio: cabecera compacta, tamaño de celda y ayuda en un botón', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mat', extra: CAT });
  await expect(page.locator('.mxstat')).toContainText('Terminado');
  await expect(page.locator('.mxtiles')).toHaveCount(0);
  await expect(page.locator('#mxt')).toHaveClass(/mxz1/);
  await page.click('[data-mxz="1"]');
  await expect(page.locator('#mxt')).toHaveClass(/mxz2/);
  expect(await page.evaluate(() => U.mxZ)).toBe(2);
  await page.click('[data-mxz="-1"]'); await page.click('[data-mxz="-1"]');
  await expect(page.locator('#mxt')).toHaveClass(/mxz0/);
  await page.click('#mxhelp');
  await expect(page.locator('#pop')).toContainText('Cómo se usa la matriz');
  await expect(page.locator('#mxt th[data-mxgo]').first()).toBeVisible();
  noErrors(errors, 'vista escritorio');
});

test('orden por programación: primero el SC con más días programados de hoy a 3 semanas; sin programar al final', async ({ page }) => {
  const X = [['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
    ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
    ['mcat', 'k3', { name: 'Pintura', sc: 'c2', cl: 't', al: ['pintura'], ord: 5 }],
    ['mtipo', 'tp1', { name: 'Dpto', acts: ['k3'], order: 10 }], ['mamb', 'a1', { tipo: 'tp1', by: 'x', t: 1 }]];
  const errors = await openApp(page, { tab: 'mat', extra: X });
  const ids = () => page.evaluate(() => MX.view.cols.map(c => c.id));
  await page.selectOption('#mxord', 'prog');
  // tarrajeo (c3): 2 días × 2 ambientes; redes (c1): solo hoy × 2; pintura (c2): pendiente sin programar → al final
  await expect.poll(ids).toEqual(['k2', 'k1', 'k3']);
  await expect(page.locator('#mxt th.mxc.mxpg')).toHaveCount(2);
  await page.selectOption('#mxord', 'az');
  const az = await page.evaluate(() => [...MX.view.cols].sort((a, b) => conOf(a.sc).name.localeCompare(conOf(b.sc).name)).map(c => c.id));
  expect(await ids()).toEqual(az);
  noErrors(errors, 'orden por programación');
});

test('fotos: el administrador restablece una foto (antes guarda una de respaldo); el editor solo compara', async ({ page }) => {
  const F = ['mver', 'f1', { t: Date.parse('2026-09-24T10:00:00-05:00'), d: '2026-09-24', w: 58, by: 'x', n: 'Elena', v: 2, a: { a1: 'k1:t,k2:p?' } }];
  const X = [...CAT, F, ['mamb', 'a1', { c: { k1: 'c', k2: 'n' }, by: 'x', t: 1 }]];
  const errors = await openApp(page, { tab: 'mat', extra: X });
  page.on('dialog', d => d.accept());
  await page.click('#mxfhist');
  await expect(page.locator('#lqm .mxfh')).toHaveCount(1);
  await page.click('#lqm [data-mxfr="f1"]');
  // k1 vuelve a Terminado; k2 estaba sin validar en la foto → deja de estar confirmado
  await expect.poll(() => page.evaluate(() => __dbGet('mamb', 'a1').c)).toEqual({ k1: 't' });
  expect(await page.evaluate(() => Object.values(__dbAll('mver')).filter(f => f.nota === 'antes de restablecer').length)).toBe(1);
  noErrors(errors, 'restablecer foto');
});

test('fotos: el editor ve el historial pero no puede restablecer', async ({ page }) => {
  const F = ['mver', 'f1', { t: 1, d: '2026-09-24', w: 58, by: 'x', n: 'Elena', v: 2, a: { a1: 'k1:t' } }];
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: [...CAT, F] });
  await page.click('#mxfhist');
  await expect(page.locator('#lqm [data-mxfc="f1"]')).toBeVisible();
  await expect(page.locator('#lqm [data-mxfr]')).toHaveCount(0);
  noErrors(errors, 'historial editor');
});
