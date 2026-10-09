// Trabajo no programado visto en obra: en Campo › Plano, un toque en el plano abre la ficha rápida
// (ambiente según el punto, subcontratista, qué hacen y foto). Lo registran campo, Calidad y el veedor.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab, HOY } from './helpers.js';
import zlib from 'node:zlib';
import { LAMINA } from './lamina.js';

/* una imagen PNG de color liso, para la lámina y la foto */
function png(w, h) {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0xe8)])));
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
}
const B64 = png(20, 12).toString('base64');
/* lámina del piso 1 y la última zona de «Entubado» (ambiente A-1) en el rectángulo 100–300 */
const PLANO = [
  ['laminas', 'L1', { pisoId: 'p1', esp: 'ARQ', name: 'Planta P1', base: true, w: 1000, h: 600, lw: 1000, lh: 600, fmt: 'image/png', nf: 1, nl: 1, rev: 1, order: 1 }],
  ['lamimg', 'L1_1_l_0', { d: B64 }], ['lamimg', 'L1_1_f_0', { d: B64 }],
  ['pzon', 'e0', { pisoId: 'p1', vista: 'L1', pts: [100, 100, 300, 100, 300, 300, 100, 300], sc: 'c2' }],
];
const npAll = page => page.evaluate(() => Object.values(window.__dbAll('nprog')));
/* toca un punto del plano dado en coordenadas de la lámina */
async function tocar(page, x, y) {
  await expect(page.locator('#kplan .pvs')).toBeVisible();
  await page.waitForFunction(() => { const h = document.querySelector('#kplan'); return h && h._v && h._v.z > 0; });
  await page.waitForTimeout(300);
  const p = await page.evaluate(([x, y]) => { const h = document.querySelector('#kplan'); const v = h._v; const r = h.getBoundingClientRect(); return { x: r.left + v.x + x * v.z, y: r.top + v.y + y * v.z }; }, [x, y]);
  await page.mouse.click(p.x, p.y);
}

/* dos toques rápidos en un punto del plano */
async function dobleToque(page, x, y) {
  await tocar(page, x, y);
  const p = await page.evaluate(([x, y]) => { const h = document.querySelector('#kplan'); const v = h._v; const r = h.getBoundingClientRect(); return { x: r.left + v.x + x * v.z, y: r.top + v.y + y * v.z }; }, [x, y]);
  await page.mouse.click(p.x, p.y);
}

test('doble toque en cualquier lugar (también sobre una actividad programada) abre el trabajo no programado; un toque abre la actividad', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'campo', extra: PLANO });
  await page.evaluate(() => { CU.view = 'plan'; render(); });
  await page.locator('[data-kp="p1"]').click();
  await dobleToque(page, 200, 200); // la zona e0 tiene una actividad programada
  await expect(page.locator('#npsheet')).toContainText('Trabajo no programado');
  await expect(page.locator('#npamb')).toHaveValue('a1');
  await expect(page.locator('#ksheet')).toHaveCount(0);
  await page.locator('#npsheet [data-npx]').first().click();
  noErrors(errors, 'doble toque');
});

test('el veedor toca el plano y registra un trabajo no programado con foto', async ({ page }) => {
  const errors = await openApp(page, { as: 'veedor', tab: 'campo', extra: PLANO });
  await expect(page.locator('#kplan')).toBeVisible();
  await page.locator('[data-kp="p1"]').click();
  await tocar(page, 200, 200); // sin armar: un toque suelto (al desplazarse) no abre nada
  await page.waitForTimeout(300);
  await expect(page.locator('#npsheet')).toHaveCount(0);
  await page.locator('[data-knp]').click(); // arma el registro
  await expect(page.locator('#kplanw.knparm')).toHaveCount(1);
  await tocar(page, 200, 200);
  const sh = page.locator('#npsheet');
  await expect(sh).toContainText('Trabajo no programado');
  await expect(page.locator('#npamb')).toHaveValue('a1'); // el ambiente sale del punto tocado
  await sh.locator('[data-npsc="c3"]').click();
  await sh.locator('[data-npd]').first().click(); // «Tarrajeo de muros», del lookahead
  await page.setInputFiles('#npfoto', { name: 'foto.png', mimeType: 'image/png', buffer: png(64, 48) });
  await expect(sh.locator('.npph img')).toHaveCount(1);
  await sh.locator('[data-npa="save"]').click();
  await expect(sh).toHaveCount(0);
  await expect.poll(async () => (await npAll(page)).length).toBe(1);
  const n = (await npAll(page))[0];
  expect(n).toMatchObject({ date: HOY, pisoId: 'p1', ambId: 'a1', sc: 'c3', desc: 'Tarrajeo de muros', by: 'veedor@obra.pe' });
  expect(n.pt.v).toBe('L1');
  expect(n.photos.length).toBe(1);
  expect(await page.evaluate(id => !!window.__dbGet('fotos', id), n.photos[0])).toBe(true);
  // queda marcado en el plano y en la lista; tocarlo lo abre para corregir
  await expect(page.locator('#kplan .pvl.np')).toHaveCount(1);
  await expect(page.locator('#klist article[data-np]')).toContainText('Tarrajeo de muros');
  await page.locator('#kplan .pvl.np').click();
  await expect(page.locator('#npsheet')).toContainText('Registrado por Vero Veedora');
  await page.fill('#npdesc', 'Tarrajeo de muros (2 operarios)');
  await page.locator('#npsheet [data-npa="save"]').click();
  await expect.poll(async () => (await npAll(page))[0].desc).toBe('Tarrajeo de muros (2 operarios)');
  // el veedor no verifica el avance de lo programado
  await page.locator('#klist article[data-k]').first().click();
  await expect(page.locator('#ksheet')).toContainText('lo verifica el ingeniero de campo');
  await expect(page.locator('#ksheet [data-ka="closef"]')).toHaveCount(0);
  await page.locator('#ksheet [data-kx]').first().click();
  // Hoy lo cuenta
  await openTab(page, 'hoy');
  await expect(page.locator('[data-hoy="np"]')).toContainText('1 registrado');
  noErrors(errors, 'veedor');
});

test('sin plano: el botón «+ No programado» pide el ambiente', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'campo' });
  await page.evaluate(() => { CU.view = 'plan'; render(); });
  await page.locator('[data-knp]').click();
  await page.locator('#npsheet [data-npsc="c1"]').click();
  await page.fill('#npdesc', 'Pase de tuberías');
  await page.locator('#npsheet [data-npa="save"]').click();
  await expect(page.locator('#toast')).toContainText('Elige el ambiente');
  await page.selectOption('#npamb', 'a2');
  await page.locator('#npsheet [data-npa="save"]').click();
  await expect.poll(async () => (await npAll(page)).map(n => n.ambId)).toEqual(['a2']);
  noErrors(errors, 'sin plano');
});

const REG = ['nprog', 'n1', { date: HOY, pisoId: 'p1', ambId: 'a2', sc: 'c2', desc: 'Canaletas', und: 'ML', exec: 6, note: '', photos: [], pt: null, by: 'veedor@obra.pe', byName: 'Vero Veedora', ts: 1 }];

test('el ingeniero lo ve en Campo e Indicadores y lo pasa al lookahead', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { tab: 'campo', extra: [REG] });
  await page.evaluate(() => { CU.view = 'list'; render(); });
  await expect(page.locator('#main article[data-np="n1"]')).toContainText('Canaletas');
  await openTab(page, 'ind');
  await expect(page.locator('#main .tile', { hasText: 'No programados' })).toContainText('1');
  await expect(page.locator('#main .card', { hasText: 'Trabajo no programado' })).toContainText('Canaletas');
  await openTab(page, 'campo');
  await page.locator('#main article[data-np="n1"]').click();
  await page.locator('#npsheet [data-npa="look"]').click();
  await expect.poll(() => page.evaluate(() => Object.values(window.__dbAll('acts')).filter(a => a.name === 'Canaletas').map(a => [a.ambId, a.sc, a.days]))).toEqual([['a2', 'c2', ['2026-10-01']]]);
  await expect.poll(async () => !!(await npAll(page))[0].actId).toBe(true);
  noErrors(errors, 'ingeniero');
});

test('lo visto en obra aparece también en el Plan diario', async ({ page }) => {
  const errors = await openApp(page, { tab: 'mapa', extra: [...PLANO, ['nprog', 'n3', { ...REG[2], pt: { x: 600, y: 300, v: 'L1' }, ambId: 'a1' }]] });
  await page.click('#wtoday'); // el Plan diario abre en mañana: volver a hoy
  await expect(page.locator('#mstage .pvl[data-z="np:n3"]')).toBeVisible();
  await expect(page.locator('#main')).toContainText('Visto en obra · no programado');
  await page.locator('#main [data-npo="n3"]').first().click();
  await expect(page.locator('#npdesc')).toHaveValue('Canaletas');
  noErrors(errors, 'plan diario');
});

for (const as of ['sc', 'lector', 'ot']) {
  test(`${as} no registra trabajo no programado`, async ({ page }) => {
    const errors = await openApp(page, { as, tab: 'campo', extra: [REG] });
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.locator('#xopen, [data-knp]')).toHaveCount(0);
    noErrors(errors, as);
  });
}

test('captura celular (solo para revisar)', async ({ page }) => {
  test.skip(!process.env.SHOT);
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, { as: 'veedor', tab: 'campo', extra: [...PLANO, ['nprog','n2',{date:HOY,pisoId:'p1',ambId:'a1',sc:'c1',desc:'Pase de tuberías',photos:[],pt:{x:600,y:300,v:'L1'},by:'x',byName:'Ana',ts:1}]] });
  await page.locator('[data-kp="p1"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: process.env.SHOT + '/np1.png' });
  await page.locator('[data-knp]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: process.env.SHOT + '/np0.png' });
  await tocar(page, 200, 200);
  await page.locator('#npsheet [data-npsc="c3"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: process.env.SHOT + '/np2.png' });
});

const AMB2 = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
test('con mouse, doble clic sobre una actividad abre la actividad (no el no programado)', async ({ page }) => {
  await openApp(page, { as: 'campo', tab: 'campo', extra: [...LAMINA, ...AMB2] });
  await page.evaluate(() => { CU.view = 'plan'; render(); }); await page.waitForTimeout(800);
  await page.locator('#kplan .pvl.nb').first().dblclick();
  await page.waitForTimeout(700);
  expect(await page.locator('#npsheet').count()).toBe(0);
  expect(await page.locator('#ksheet').count()).toBe(1);
});

test('el SC registra un trabajo no programado de su partida en «En obra» y el ingeniero lo verifica', async ({ page }) => {
  let errors = await openApp(page, { as: 'sc', tab: 'cap', extra: PLANO });
  await page.evaluate(() => { CP.v = 'plan'; render(); });
  await page.locator('[data-knp]').click();
  await tocar(page, 200, 200);
  const sh = page.locator('#npsheet');
  await expect(sh).toContainText('Trabajo no programado');
  await expect(sh.locator('[data-npsc]')).toHaveCount(1); // solo su partida
  await sh.locator('[data-npsc]').click();
  await page.fill('#npdesc', 'Resane de muro');
  await sh.locator('[data-npa="save"]').click();
  await expect.poll(async () => (await npAll(page)).length).toBe(1);
  const n = (await npAll(page))[0];
  expect(n).toMatchObject({ sc: 'c1', desc: 'Resane de muro', scProp: true, by: 'sc@obra.pe' });
  expect(n.ver).toBeUndefined();
  noErrors(errors, 'sc registra');
});

test('el SC solo ve el no programado de su partida', async ({ page }) => {
  const MIO = ['nprog', 'n2', { date: HOY, pisoId: 'p1', ambId: 'a2', sc: 'c1', desc: 'Picado de muro', und: '', exec: null, note: '', photos: [], pt: null, by: 'sc@obra.pe', byName: 'Sandra', ts: 2, scProp: true }];
  const OTRO = ['acts', 'x9', { ambId: 'a2', sc: 'c3', name: 'Tarrajeo', days: [HOY], order: 99 }];
  const sc = await openApp(page, { as: 'sc', extra: [REG, MIO, OTRO] });
  const vis = await page.evaluate(d => npItems([d]).map(i => i.e.desc), HOY);
  expect(vis).toEqual(['Picado de muro']);
  noErrors(sc, 'sc no programado');
});

test('ingeniero: filtro «No programado» y aviso de cruce con otro SC', async ({ page }) => {
  const OTRO = ['acts', 'x9', { ambId: 'a2', sc: 'c3', name: 'Tarrajeo', days: [HOY], order: 99 }];
  const errors = await openApp(page, { tab: 'campo', extra: [REG, OTRO] });
  await page.evaluate(() => { CU.view = 'list'; CU.show = 'np'; render(); });
  await expect(page.locator('#main article[data-np="n1"]')).toBeVisible();
  await expect(page.locator('#main article[data-np="n1"] .npcx')).toContainText('Cruce');
  await expect(page.locator('#main article[data-a]')).toHaveCount(0);
  noErrors(errors, 'filtro no programado');
});
