// Observaciones de la Matriz (punch list, nov 2026; js/matriz-obs.js): se registran tocando el plano en Matriz › Gráfico ›
// Observaciones, cuelgan de una actividad del ambiente (no crean actividades del catálogo) y llevan número por ambiente.
// Una actividad Terminado con observaciones abiertas vuelve a verse en el Lookahead (fila fantasma «N obs.»; tocar un día
// suma ese día a su fila de siempre) y se oculta otra vez al levantarlas. Registran y levantan el ingeniero de campo y el SC.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';
import zlib from 'node:zlib';

function png(w, h) {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0xe8)])));
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
}
const B64 = png(20, 12).toString('base64');
const ANTES = '2026-09-14', ANTES2 = '2026-09-15'; /* semanas atrás: la fila ya no se ve (vencida) */
/* Dpto 101 (A-1) dibujado en la lámina del piso 1; «Redes empotradas» (SC SANITARIAS) y «Tarrajeo de muros» (SC TARRAJEO) terminadas en la Matriz.
   La fila de Redes empotradas ya no tiene días desde hoy (se oculta como terminada); la de Tarrajeo sigue programada (aviso ⚠). */
const DATOS = [
  ['laminas', 'L1', { pisoId: 'p1', esp: 'ARQ', name: 'Planta P1', base: true, w: 1000, h: 600, lw: 1000, lh: 600, fmt: 'image/png', nf: 1, nl: 1, rev: 1, order: 1 }],
  ['lamimg', 'L1_1_l_0', { d: B64 }], ['lamimg', 'L1_1_f_0', { d: B64 }],
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
  ['acts', 'i0', { ambId: 'a1', sc: 'c1', name: 'Redes empotradas', und: 'pto', metrado: 20, days: [ANTES, ANTES2], order: 10 }],
  ['mcat', 'k1', { name: 'Redes empotradas', sc: 'c1', cl: 't', al: ['redes empotradas'], ord: 10 }],
  ['mcat', 'k2', { name: 'Tarrajeo de muros', sc: 'c3', cl: 't', al: ['tarrajeo de muros'], ord: 20 }],
  ['mamb', 'a1', { c: { k1: 't', k2: 't' }, by: 'x', t: 1 }],
];
const OBS1 = ['mobs', 'ob1', { amb: 'a1', cat: 'k1', sc: 'c1', pid: 'p1', num: 1, desc: 'Corregir sello del registro', pt: { x: 200, y: 150, v: 'L1' }, ph: [], st: 'ab', by: 'campo@obra.pe', n: 'Carlos Campo', t: 1 }];

async function grafico(page) {
  await page.evaluate(() => { U.piso = 'p1'; U.mxV = 'pla'; U.mxPlOb = false; U.mxPlEd = true; MOBTAB = 'act'; render(); });
  await expect(page.locator('#mxplmap .pvs')).toBeVisible();
  await page.waitForFunction(() => { const h = document.querySelector('#mxplmap'); return h && h._v && h._v.z > 0; });
  await page.waitForTimeout(300);
}
/* toca un punto del plano dado en coordenadas de la lámina */
async function tocar(page, x, y) {
  const p = await page.evaluate(([x, y]) => { const h = document.querySelector('#mxplmap'); const v = h._v; const r = h.getBoundingClientRect(); return { x: r.left + v.x + x * v.z, y: r.top + v.y + y * v.z }; }, [x, y]);
  await page.mouse.click(p.x, p.y);
}
const obs = page => page.evaluate(() => Object.values(window.__dbAll('mobs')));
const MOBT_N = 43; /* tipos de la lista preliminar (MOBT_DEF, js/matriz-obt.js) */
const cell = (page, amb, cat) => page.evaluate(([a, c]) => { const o = (mxCells().get(a) || {})[c]; return o ? { s: o.s, ob: o.ob, sp: o.sp } : null; }, [amb, cat]);

test('el ingeniero de campo registra una observación tocando el plano: número por ambiente, pin y la actividad queda por programar', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'mat', extra: DATOS });
  const antes = await page.evaluate(() => MX.cat.size);
  await grafico(page);
  await tocar(page, 200, 200);
  const sh = page.locator('#mobsheet');
  await sh.locator('[data-mobtab="obs"]').click();
  await expect(sh).toContainText('Nueva observación A-1-1');
  await sh.locator('[data-mobc="k1"]').click();
  await sh.locator('#mobdesc').fill('Corregir sello en la ventana');
  await sh.locator('[data-moba="save"]').click();
  await expect.poll(async () => (await obs(page)).length).toBe(1);
  const [o] = await obs(page);
  expect(o).toMatchObject({ amb: 'a1', cat: 'k1', sc: 'c1', pid: 'p1', num: 1, desc: 'Corregir sello en la ventana', st: 'ab', by: 'campo@obra.pe', pt: { v: 'L1' } });
  expect(Math.abs(o.pt.x - 200)).toBeLessThan(3); expect(Math.abs(o.pt.y - 200)).toBeLessThan(3);
  /* la hoja sigue abierta en el mismo ambiente para la siguiente; el catálogo no creció */
  await expect(sh).toContainText('Nueva observación A-1-2');
  await sh.locator('[data-mobx]').first().click();
  expect(await page.evaluate(() => MX.cat.size)).toBe(antes);
  await expect(page.locator('#mxplmap .pvl.mobpin')).toHaveText('1');
  await expect(page.locator('#mxpls')).toContainText('1 abierta');
  /* la Matriz sigue diciendo Terminado (el % no cambia), pero la actividad queda por programar */
  expect(await cell(page, 'a1', 'k1')).toEqual({ s: 't', ob: 1, sp: true });
  noErrors(errors, 'observación desde el plano');
});

test('el SC solo registra en su partida y levanta las suyas; levantada, la actividad vuelve a ocultarse como terminada', async ({ page }) => {
  /* otra partida (SC TARRAJEO) ya tiene la A-1-2: el SC no la ve (SEG-05), pero su número no se repite */
  const OTRA = ['mobs', 'ob9', { amb: 'a1', cat: 'k2', sc: 'c3', pid: 'p1', num: 2, desc: 'Resanar', pt: null, ph: [], st: 'ab', by: 'campo@obra.pe', n: 'Carlos Campo', t: 2 }];
  const errors = await openApp(page, { as: 'sc', tab: 'mat', extra: [...DATOS, OBS1, OTRA] });
  await grafico(page);
  /* el pin abre la observación; el SC (SC SANITARIAS) la levanta */
  await page.locator('#mxplmap .pvl.mobpin').click();
  const sh = page.locator('#mobsheet');
  await expect(sh).toContainText('A-1-1 · Redes empotradas');
  await sh.locator('[data-moba="lev"]').click();
  await expect.poll(async () => (await obs(page))[0].st).toBe('lev');
  expect((await obs(page))[0].lev).toMatchObject({ by: 'sc@obra.pe', sc: true });
  expect(await cell(page, 'a1', 'k1')).toEqual({ s: 't', ob: 0, sp: false });
  expect(await page.evaluate(() => mxDoneSt(S.act.get('i0')))).toBe('ok');
  /* nueva: solo actividades de su partida (no Tarrajeo de muros, que es de otro SC) */
  await tocar(page, 200, 220);
  await sh.locator('[data-mobtab="obs"]').click();
  await expect(sh).toContainText('Nueva observación A-1-3');
  await expect(sh.locator('[data-mobc="k1"]')).toHaveCount(1);
  await expect(sh.locator('[data-mobc="k2"]')).toHaveCount(0);
  await sh.locator('[data-mobc="k1"]').click();
  await sh.locator('#mobdesc').fill('Falta tapa del registro');
  await sh.locator('[data-moba="save"]').click();
  await expect.poll(async () => (await obs(page)).filter(o => o.by === 'sc@obra.pe').map(o => o.num)).toEqual([3]);
  noErrors(errors, 'el SC levanta');
});

test('una terminada con observación abierta no avisa «terminada y aún programada»; la ficha de la celda la lista y registra sin plano', async ({ page }) => {
  const OBS2 = ['mobs', 'ob2', { amb: 'a1', cat: 'k2', sc: 'c3', pid: 'p1', num: 1, desc: 'Resanar esquina', pt: null, ph: [], st: 'ab', by: 'campo@obra.pe', n: 'Carlos Campo', t: 1 }];
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: [...DATOS, OBS2] });
  await page.waitForFunction(() => MX.ld.amb && MX.ld.cat && MX.obs.size > 0);
  /* t0 (Tarrajeo de muros, A-1) sigue programada días después de hoy y la Matriz dice Terminado: con la observación abierta no avisa */
  expect(await page.evaluate(() => mxRowWarn(S.act.get('t0')))).toBe(null);
  expect(await page.evaluate(() => { const L = [...MX.obs.values()]; MX.obs.clear(); MX.v++; const w = mxRowWarn(S.act.get('t0')); L.forEach(n => MX.obs.set(n.id, n)); MX.v++; return w; })).toBe('t');
  /* tabla: la celda muestra el número y su ficha lista la observación y deja registrar otra sin punto */
  await page.evaluate(() => { U.piso = 'p1'; U.mxV = 'mat'; U.mxPlOb = false; U.mxFalta = false; render(); });
  const td = page.locator('tr[data-amb="a1"] td.mc.mxobc');
  await expect(td.locator('.mxob')).toHaveText('1');
  await page.evaluate(() => { const td = document.querySelector('tr[data-amb="a1"] td.mc.mxobc'); mxInfo(td, mxCellAt(td)); });
  await expect(page.locator('#pop')).toContainText('A-1-1');
  await page.locator('#pop [data-do="mobn"]').click();
  const sh = page.locator('#mobsheet');
  await expect(sh).toContainText('Nueva observación A-1-2');
  await sh.locator('[data-mobd="Resanar"]').click();
  await sh.locator('#mobdesc').fill('Resanar junto a la puerta');
  await sh.locator('[data-moba="save"]').click();
  await expect.poll(async () => (await obs(page)).filter(o => o.cat === 'k2' && o.st === 'ab').length).toBe(2);
  expect((await obs(page)).find(o => o.num === 2)).toMatchObject({ pt: null, sc: 'c3', by: 'editor@obra.pe' });
  noErrors(errors, 'ficha de la celda');
});

test('Lookahead: la terminada con observación abierta sale como fantasma «1 obs.»; tocar un día lo suma a su fila de siempre', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: [...DATOS, OBS1] });
  const nActs = await page.evaluate(() => S.act.size);
  await page.evaluate(() => { U.piso = ''; U.lkGh = true; U.sc = ''; gridRows = null; render(); });
  const gh = page.locator('#grid tr.gh[data-gh="a1|k1"]');
  await expect(gh.locator('.mobb')).toHaveText('1 obs.');
  await gh.locator(`td.d[data-d="${MANANA}"]`).click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('acts', 'i0').days)).toContain(MANANA);
  expect(await page.evaluate(() => S.act.size)).toBe(nActs);
  /* la fila real lleva la insignia y abre la lista de observaciones */
  await expect(page.locator('tr[data-a="i0"] .mobrb')).toHaveText('1');
  await page.locator('tr[data-a="i0"] .mobrb').click();
  await expect(page.locator('#pop')).toContainText('A-1-1');
  await expect(page.locator('#pop')).toContainText('Corregir sello del registro');
  noErrors(errors, 'fantasma de observaciones');
});

test('✏️ Registrar: el ingeniero de campo toca un ambiente, agrega una actividad (Pendiente) y cambia un estado; 👁 Ver no abre la hoja', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'mat', extra: [...DATOS, ['mcat', 'k3', { name: 'Rejillas de ventilación', sc: 'c2', cl: 't', al: ['rejillas de ventilacion'], ord: 30 }]] });
  /* Ver: tocar el plano no abre nada */
  await page.evaluate(() => { U.piso = 'p1'; U.mxV = 'pla'; U.mxPlOb = true; U.mxPlEd = false; render(); });
  await expect(page.locator('#mxplmap .pvs')).toBeVisible();
  await page.waitForFunction(() => { const h = document.querySelector('#mxplmap'); return h && h._v && h._v.z > 0; });
  await page.waitForTimeout(300);
  await tocar(page, 200, 200);
  await expect(page.locator('#mobsheet')).toHaveCount(0);
  /* Registrar */
  await page.click('[data-mxpled="1"]');
  await page.waitForTimeout(300);
  await tocar(page, 200, 200);
  const sh = page.locator('#mobsheet');
  await expect(sh.locator('[data-mobtab="act"]')).toHaveClass(/on/);
  await sh.locator('[data-moba="addon"]').click();
  await sh.locator('#mobaq').fill('rejillas');
  await sh.locator('[data-mobadd="k3"]').click();
  await expect.poll(() => page.evaluate(() => (window.__dbGet('mamb', 'a1') || {}).c)).toMatchObject({ k3: 'p' });
  expect(await page.evaluate(() => window.__dbGet('mamb', 'a1').by)).toBe('campo@obra.pe');
  /* cambia Redes empotradas a En curso desde la hoja */
  await sh.locator('.mxrdone summary').click(); // Redes empotradas está Terminado: va en el grupo plegado
  await sh.locator('[data-mobrc="k1"] [data-mobst="c"]').click();
  await expect.poll(() => page.evaluate(() => window.__dbGet('mamb', 'a1').c.k1)).toBe('c');
  noErrors(errors, 'registrar actividades en el plano');
});

test('desde la ficha de la celda: «📍 marcando el punto» lleva al plano y el toque abre la observación con esa actividad', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: DATOS });
  await page.evaluate(() => { U.piso = 'p1'; U.mxV = 'mat'; U.mxFalta = false; render(); });
  await page.waitForFunction(() => MX.ld.amb && MX.ld.cat && document.querySelector('tr[data-amb="a1"] td.mc.s-t'));
  await page.evaluate(() => { const tr = document.querySelector('tr[data-amb="a1"]'); const td = [...tr.querySelectorAll('td.mc')].find(t => { const c = mxCellAt(t); return c && c.cat === 'k1'; }); mxInfo(td, mxCellAt(td)); });
  await page.locator('#pop [data-do="mobp"]').click();
  await expect(page.locator('#mxplmap .pvs')).toBeVisible();
  expect(await page.evaluate(() => [U.mxV, U.mxPlEd])).toEqual(['pla', true]);
  await page.waitForFunction(() => { const h = document.querySelector('#mxplmap'); return h && h._v && h._v.z > 0; });
  await page.waitForTimeout(300);
  await tocar(page, 200, 200);
  const sh = page.locator('#mobsheet');
  await expect(sh.locator('[data-mobtab="obs"]')).toHaveClass(/on/);
  await expect(sh.locator('[data-mobc=""]')).toContainText('Redes empotradas');
  noErrors(errors, 'observación con punto desde la ficha');
});

test('tipos de observación: el editor carga la lista preliminar y la ajusta; se registra por tipo aunque el ambiente no tenga la actividad (sin fantasma ni %) o sin actividad (SC del tipo); se filtra por tipo', async ({ page }) => {
  /* «Baranda metálica» existe en el catálogo pero el Dpto 101 no la tiene; no hay ninguna actividad de limpieza */
  const BAR = ['mcat', 'k3', { name: 'Baranda metálica', sc: 'c1', cl: 't', al: ['baranda metalica'], ord: 30 }];
  const errors = await openApp(page, { as: 'editor', tab: 'mat', extra: [...DATOS, BAR] });
  page.on('dialog', d => d.accept());
  await page.waitForFunction(() => MX.ld.cat && MX.ld.amb);
  await page.evaluate(() => { U.piso = 'p1'; U.mxV = 'obt'; render(); });
  await page.locator('#obtseed').click();
  await expect.poll(() => page.evaluate(() => Object.keys(window.__dbAll('mobt')).length)).toBe(MOBT_N);
  const t = id => page.evaluate(i => window.__dbGet('mobt', i), id);
  expect(await t('ot-AL-04')).toMatchObject({ code: 'AL-04', name: 'Baranda: corrección de pintura', cat: 'k3', sc: '' });
  expect(await t('ot-TR-01')).toMatchObject({ cat: 'k2' });
  expect(await t('ot-LM-01')).toMatchObject({ cat: '', sc: '' });
  /* sin actividad ni responsable se marca; el editor le pone el SC responsable */
  const fila = page.locator('tr[data-otid="ot-LM-01"]');
  await expect(fila).toContainText('Sin actividad ni responsable');
  await fila.locator('select[data-otf="sc"]').selectOption('c3');
  await expect.poll(async () => (await t('ot-LM-01')).sc).toBe('c3');
  /* cargar otra vez no duplica */
  await expect(page.locator('#obtseed')).toHaveCount(0);
  const pct0 = await page.evaluate(() => { const C = mxCells().get('a1'); return Object.values(C).filter(o => o.src !== 'obs').length; });

  /* registrar por tipo: Baranda (el ambiente no la tiene) */
  await grafico(page);
  await tocar(page, 200, 200);
  const sh = page.locator('#mobsheet');
  await sh.locator('[data-mobtab="obs"]').click();
  /* primero salen los tipos de las actividades del ambiente (Tarrajeo), los demás plegados o con el buscador */
  await expect(sh.locator('.mobts').first().locator('[data-mobt="ot-TR-01"]')).toBeVisible();
  await sh.locator('#mobtq').fill('baranda');
  await sh.locator('[data-mobt="ot-AL-04"]').click();
  await expect(sh).toContainText('El ambiente no tiene esta actividad');
  await expect(sh.locator('#mobdesc')).toHaveValue('Baranda: corrección de pintura');
  await sh.locator('[data-moba="save"]').click();
  await expect.poll(async () => (await obs(page)).length).toBe(1);
  expect((await obs(page))[0]).toMatchObject({ amb: 'a1', cat: 'k3', ot: 'ot-AL-04', sc: 'c1', desc: 'Baranda: corrección de pintura', st: 'ab' });
  /* la celda existe solo por la observación: no es un pendiente del Lookahead ni cuenta en el % */
  expect(await cell(page, 'a1', 'k3')).toEqual({ s: 'p', ob: 1, sp: false });
  expect(await page.evaluate(() => mxPendList().some(r => r.c.id === 'k3'))).toBe(false);
  expect(await page.evaluate(() => { const C = mxCells().get('a1'); return Object.values(C).filter(o => o.src !== 'obs').length; })).toBe(pct0);

  /* sin actividad: limpieza → SC responsable del tipo */
  await sh.locator('#mobtq').fill('limpieza fina');
  await sh.locator('[data-mobt="ot-LM-01"]').click();
  await expect(sh).toContainText('Sin actividad');
  await sh.locator('[data-moba="save"]').click();
  await expect.poll(async () => (await obs(page)).length).toBe(2);
  expect((await obs(page)).find(o => o.ot === 'ot-LM-01')).toMatchObject({ cat: '', sc: 'c3', num: 2 });

  /* «Otra» sigue con el flujo por actividad (sin tipo) */
  await sh.locator('[data-mobt="*"]').click();
  await sh.locator('[data-mobc="k2"]').click();
  await sh.locator('#mobdesc').fill('Revisar arista');
  await sh.locator('[data-moba="save"]').click();
  await expect.poll(async () => (await obs(page)).length).toBe(3);
  expect((await obs(page)).find(o => o.num === 3).ot).toBeUndefined();
  await sh.locator('[data-mobx]').first().click();

  /* Ver › Observaciones: resumen por tipo y filtro */
  await page.evaluate(() => { U.mxPlEd = false; U.mxPlOb = true; render(); });
  await expect(page.locator('details.obts')).toContainText('AL-04 Baranda: corrección de pintura');
  await expect(page.locator('details.obts')).toContainText('Sin tipo');
  await page.locator('#mxplot').selectOption('ot-AL-04');
  await expect(page.locator('#mxpls .mobi')).toHaveCount(1);
  await expect(page.locator('#mxpls .mobi .mobtc')).toHaveText('AL-04');
  noErrors(errors, 'tipos de observación');
});
