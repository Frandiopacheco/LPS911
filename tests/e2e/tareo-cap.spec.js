// Tareo del capataz en el celular, «horas por cantidad» (docs/ia/tareo.md «Contrato "horas por cantidad"» e «Implementación de
// la grilla — capataz»): asistencia (motivo y salida plegables), trabajos del día, grilla de horas (obreros en filas, partidas en columnas, como el formato), foto y envío.
// También: compatibilidad con los tareos antiguos por horarios (blq) y las correcciones de las auditorías F2.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const CAP = 'tcap@obra.pe';
const ID = `${HOY}_${CAP}`;
/* capturas para mirar a ojo: TC_SHOTS=<carpeta> npx playwright test tareo-cap */
const shot = async (page, n) => { if (!process.env.TC_SHOTS) return; await page.waitForTimeout(450); await page.screenshot({ path: `${process.env.TC_SHOTS}/${n}.png` }); };
const ob = (dni, ape, nom, cap, cat = 'OP') => ['tper', dni, { dni, ape, nom, pue: 'OPERARIO', cat, cua: 'ALBAÑILES', cap, ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true }];
const PCS = [
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de muros', und: 'm2', act: true, ord: 1 }],
  ['tpc', 'p10_06', { cod: '10.06', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Vaciado de concreto', und: 'm3', act: true, ord: 2 }],
  ['tpc', 'p20_01', { cod: '20.01', grp: '20', grpN: 'ARQUITECTURA', nom: 'Tarrajeo de muros', und: 'm2', act: true, ord: 3 }],
  ['tpc', 'p30_01', { cod: '30.01', grp: '30', grpN: 'VARIOS', nom: 'Andamios', und: 'glb', act: true, ord: 4, bloq: true }],
];
const EXTRA = [
  ob('40000001', 'ALVA ROJAS', 'ANA', CAP),
  ob('40000002', 'BRAVO DIAZ', 'BETO', CAP),
  ob('40000003', 'CASTRO PAZ', 'CARLOS', CAP, 'PE'),
  ob('40000004', 'DAVILA SOTO', 'DANIEL', CAP, 'OF'),
  ob('40000009', 'ZEGARRA LUNA', 'ZOE', 'otro@obra.pe'),
  ...PCS,
];
const dbDoc = (page, id = ID) => page.evaluate(i => window.__dbGet('tareo', i) || {}, id);
/* foto de prueba: PNG pequeño dibujado en el navegador */
const png = async page => Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 40, 30); return c.toDataURL('image/png').split(',')[1]; }), 'base64');
const fullRow = (ape, nom, h = {}, x = {}) => ({ ape, nom, cat: 'OP', cua: '', as: true, mot: '', alt: false, ini: '', fin: '', h, trab: 0, ext: 0, ...x });
/* un tareo de horas listo (salvo la foto) con Ana: 4,5 h encofrado + 4 h tarrajeo */
const readyDoc = (date, extra = {}) => ({ date, cap: CAP, st: 'bor', modo: 'hrs', pcs: ['p10_05', 'p20_01'], foto: [], hist: [], rows: { '40000001': fullRow('ALVA ROJAS', 'ANA', { p10_05: 4.5, p20_01: 4 }) }, ...extra });
const oneCrew = () => [...EXTRA.filter(x => x[0] !== 'tper'), ob('40000001', 'ALVA ROJAS', 'ANA', CAP)];
const cell = (root, dni, pc) => root.locator(`.tc-gcell[data-dni="${dni}"][data-pc="${pc}"]`);
const total = (root, dni) => root.locator(`.tc-gt[data-dni="${dni}"]`);

test('capataz (390×844): asistencia con motivo plegable, trabajos, grilla con «Toda la jornada», totales y envío en modo horas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: EXTRA });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  const root = page.locator('#tcRoot');
  await expect(root).toBeVisible();

  // paso 1: su cuadrilla (solo los suyos), numerada y nadie marcado; cuatro pasos arriba
  await expect(root.locator('.tc-step')).toHaveCount(4);
  await expect(root.locator('.tc-ob')).toHaveCount(4);
  await expect(root).not.toContainText('ZEGARRA');
  await expect(root.locator('.tc-ob.sin')).toHaveCount(4);
  await expect(root.locator('#tcF1')).toContainText('Sin marcar (4)');
  expect((await root.locator('.tc-v').first().boundingBox()).height).toBeGreaterThanOrEqual(44);
  // (rediseño 22-10-2026) sin la barra de la app; la barra inferior sigue en el paso 1
  await expect(page.locator('.top')).toBeHidden();
  await expect(page.locator('#bnav')).toBeVisible();
  await root.locator('.tc-steps [data-tcs="2"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Asistencia');
  await expect(root.locator('.tc-ob.need')).toHaveCount(4);
  // «No vino» marca la ausencia; el motivo (opcional) se pone tocando el nombre (hoja del obrero) y queda como etiqueta
  const dan = root.locator('.tc-ob[data-dni="40000004"]');
  await dan.locator('[data-tca="novino"]').click();
  await expect(dan).toHaveClass(/off/);
  await dan.locator('[data-tca="ob"]').click();
  await expect(root.locator('#tcOb .tc-mot')).toHaveCount(9);
  await root.locator('#tcOb [data-tca="mot"][data-v="DM"]').click();
  await root.locator('#tcOb [data-tca="obX"]').last().click();
  await expect(dan).toContainText('Descanso médico');
  // el botón principal del paso 1 marca a los que faltan
  await expect(root.locator('.tc-foot [data-tca="todos"]')).toContainText('Los 3 que faltan vinieron en horario normal');
  await root.locator('.tc-foot [data-tca="todos"]').click();
  await expect(root.locator('#tcF1')).toContainText('Sin marcar (0)');
  // altura y horario en la hoja del obrero: Ana trabajó en altura (queda la etiqueta en su fila)
  await root.locator('.tc-ob[data-dni="40000001"] [data-tca="ob"]').click();
  await expect(root.locator('#tcOb [data-tca="salQ"]').first()).toBeVisible();
  await root.locator('#tcOb input[data-tca="alt"]').check();
  await root.locator('#tcOb [data-tca="obX"]').last().click();
  await expect(root.locator('.tc-ob[data-dni="40000001"]')).toContainText('Altura');
  await expect.poll(async () => (await dbDoc(page)).st).toBe('bor');
  expect((await dbDoc(page)).modo).toBe('hrs');
  await shot(page, '1-asistencia');

  // paso 2: trabajos del día con buscador (la bloqueada no sale), reordenar y quitar
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await expect(root.locator('.tc-h h2')).toHaveText('Trabajos del día');
  await expect(page.locator('#bnav')).toBeHidden();
  // sin trabajos, «Siguiente» no pasa a la grilla
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Trabajos');
  await root.locator('#tcPcQ').fill('andam');
  await expect(root.locator('#tcPcL')).toContainText('Ninguna partida');
  for (const [q, id] of [['encof', 'p10_05'], ['20.01', 'p20_01'], ['vaciado', 'p10_06']]) {
    await root.locator('#tcPcQ').fill(q);
    await root.locator(`[data-tca="pc"][data-v="${id}"]`).click();
  }
  await expect(root.locator('.tc-pcr')).toHaveCount(3);
  await root.locator('[data-tca="pcOff"]').click();
  await root.locator('.tc-pcr[data-pc="p20_01"] [data-tca="pcUp"]').click();
  await root.locator('.tc-pcr[data-pc="p10_06"] [data-tca="pcRm"]').click(); // sin horas: no pregunta
  await expect.poll(async () => (await dbDoc(page)).pcs).toEqual(['p20_01', 'p10_05']);
  await shot(page, '2-trabajos');

  // paso 3: grilla como el formato: los que vinieron en filas y las partidas en columnas (en el orden de los trabajos)
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await expect(root.locator('#tcGrid')).toBeVisible();
  await expect(root.locator('.tc-gn')).toHaveCount(3);
  await expect(root.locator('.tc-gn[data-dni="40000004"]')).toHaveCount(0);
  await expect(root.locator('.tc-g tbody tr')).toHaveCount(3);
  expect(await root.locator('.tc-g thead .tc-gp').evaluateAll(t => t.map(x => x.dataset.pc))).toEqual(['p20_01', 'p10_05']);
  // «Toda la jornada» (menú de la cabecera de encofrado): a cada uno lo que le falta → todos en verde; total de la partida abajo
  await root.locator('th.tc-gp[data-pc="p10_05"] [data-tca="pcMenu"]').click();
  await root.locator('#tcPcM [data-tca="pcAll"]').click();
  await expect(root.locator('.tc-gs[data-pc="p10_05"]')).toHaveText('25,5');
  await expect(cell(root, '40000001', 'p10_05')).toHaveText('8,5');
  await expect(root.locator('.tc-gt.ok')).toHaveCount(3);
  // Beto hizo 2 h más en tarrajeo: sin su salida no cuadra («sobran 2»); con salida 19:00 cuadra y son «+2 HE»
  await cell(root, '40000002', 'p20_01').click();
  await expect(root.locator('#tcCell')).toBeVisible();
  await root.locator('#tcCell [data-tca="cellSet"][data-v="2"]').click();
  await expect(root.locator('#tcCell')).toHaveCount(0);
  await expect(total(root, '40000002')).toHaveClass(/warn/);
  await expect(total(root, '40000002')).toContainText('sobran 2');
  await page.evaluate(() => { TCS.doc.rows['40000002'].sal = '19:00'; tcChg(); });
  await expect(total(root, '40000002')).toHaveClass(/ok/);
  await expect(total(root, '40000002')).toContainText('+2 HE');
  // Carlos: 4 h de encofrado (ámbar, faltan 4,5) y el resto de su jornada en tarrajeo (verde)
  await cell(root, '40000003', 'p10_05').click();
  await expect(root.locator('#tcCv')).toHaveText('8,5 h');
  await root.locator('#tcCell [data-tca="cellSet"][data-v="4"]').click();
  await expect(total(root, '40000003')).toHaveClass(/warn/);
  await expect(total(root, '40000003')).toContainText('faltan 4,5');
  await cell(root, '40000003', 'p20_01').click();
  await root.locator('#tcCell [data-tca="cellSet"]', { hasText: 'El resto de su horario' }).click();
  await expect(cell(root, '40000003', 'p20_01')).toHaveText('4,5');
  await expect(total(root, '40000003')).toHaveClass(/ok/);
  // −½ / +½ dejan el editor abierto
  await cell(root, '40000001', 'p10_05').click();
  await root.locator('#tcCell [data-tca="cellAdj"][data-v="-0.5"]').click();
  await expect(root.locator('#tcCv')).toHaveText('8 h');
  await expect(total(root, '40000001')).toContainText('faltan 0,5');
  await root.locator('#tcCell [data-tca="cellAdj"][data-v="0.5"]').click();
  await expect(root.locator('#tcCv')).toHaveText('8,5 h');
  await shot(page, '3-celda');
  await root.locator('#tcCell [data-tca="cellX"]').last().click();
  await shot(page, '4-grilla-vertical');
  // con 2 partidas caben todas: no se pide girar el celular
  await expect(root.locator('#tcRot')).toHaveCount(0);

  // paso 4: foto y envío
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Enviar');
  const send = root.locator('#tcSend');
  await expect(send).toHaveAttribute('data-tca', 'foto');
  await root.locator('#tcFile').setInputFiles({ name: 'formato.png', mimeType: 'image/png', buffer: await png(page) });
  await expect(root.locator('.tc-th')).toHaveCount(1);
  await expect(send).toHaveText('Enviar tareo');
  await expect(root.locator('#tcTot3')).toContainText('3 vinieron · 1 no vinieron · 27,5 h · 2 h extra');
  await shot(page, '5-enviar');
  await send.click();
  await expect.poll(async () => (await dbDoc(page)).st).toBe('env');
  const doc = await dbDoc(page);
  expect(doc).toMatchObject({ date: HOY, cap: CAP, envBy: CAP, modo: 'hrs', pcs: ['p20_01', 'p10_05'], envN: 1 });
  expect(doc.blq).toBeUndefined();
  expect(doc.cfg).toMatchObject({ v: 1 });
  expect(doc.hist.map(h => h.a)).toEqual(['env']);
  const r = doc.rows;
  expect(r['40000001']).toMatchObject({ as: true, alt: true, h: { p10_05: 8.5 }, trab: 8.5, ext: 0, ini: '07:30', fin: '17:00' });
  expect(r['40000002']).toMatchObject({ as: true, h: { p10_05: 8.5, p20_01: 2 }, trab: 10.5, ext: 2, fin: '19:00' });
  expect(r['40000003']).toMatchObject({ as: true, h: { p10_05: 4, p20_01: 4.5 }, trab: 8.5, ext: 0 });
  expect(r['40000004']).toMatchObject({ as: false, mot: 'DM', trab: 0, ext: 0 });
  expect(doc.foto).toEqual([`${ID}_1`]);
  // enviado: solo lectura, sin pasos ni pie
  await expect(root.locator('.tc-sent')).toContainText('Enviado');
  await expect(root.locator('.tc-foot')).toHaveCount(0);
  await expect(root.locator('.tc-gcell')).toHaveCount(0);
  // el asistente lo reabre: vuelve a editable con el motivo a la vista
  await page.evaluate(id => fcol('tareo').doc(id).update({ st: 'reab', reab: { t: 1, by: 'tasis@obra.pe', mot: 'Carlos hizo más encofrado' } }), ID);
  await expect(root.locator('.tc-reab')).toContainText('Carlos hizo más encofrado');
  await expect(root.locator('.tc-steps')).toBeVisible();
  noErrors(errors, 'tareo del capataz');
});

test('capataz (844×390, echado): la grilla ocupa toda la pantalla, nombres y partidas fijos, editor de celda a la vista', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  page.on('dialog', d => d.accept());
  const names = [['ALVA ROJAS', 'ANA'], ['BRAVO DIAZ', 'BETO'], ['CASTRO PAZ', 'CARLOS'], ['DAVILA SOTO', 'DANIEL'], ['ESPINOZA TORRES', 'EDU'], ['FLORES RAMOS', 'FRANCO'], ['GARCIA LOPEZ', 'GABO'], ['HUAMAN ORTIZ', 'HUGO'], ['INCA PEREZ', 'IVAN'], ['JARA CARRASCO', 'JORGE']];
  const crew = names.map(([a, n], i) => ob(String(40000101 + i), a, n, CAP));
  const rows = Object.fromEntries(names.map(([a, n], i) => [String(40000101 + i), fullRow(a, n)]));
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...crew, ...PCS, ['tareo', ID, { date: HOY, cap: CAP, st: 'bor', modo: 'hrs', pcs: ['p10_05', 'p10_06', 'p20_01'], foto: [], hist: [], rows }]] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await expect(root.locator('#tcGrid')).toBeVisible();
  // pantalla completa: sin barra superior ni barra inferior; el encabezado del tareo es el riel de la derecha (rediseño 22-10-2026)
  await expect(page.locator('.top')).toBeHidden();
  await expect(page.locator('#bnav')).toBeHidden();
  const rail = await root.locator('.tc-head').boundingBox();
  expect(rail.x).toBeGreaterThan(700);
  expect(rail.width).toBeLessThan(100);
  await expect(root.locator('#tcRot')).toBeHidden(); // el aviso de girar solo sale en vertical
  const gb = await root.locator('#tcGrid').boundingBox();
  expect(gb.width).toBeGreaterThan(720);
  expect(gb.height).toBeGreaterThan(340);
  await expect(root.locator('.tc-foot')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(844);
  // llenar: «Toda la jornada» en encofrado y 2 h de tarrajeo a Hugo
  await root.locator('th.tc-gp[data-pc="p10_05"] [data-tca="pcMenu"]').click();
  await root.locator('#tcPcM [data-tca="pcAll"]').click();
  await expect(root.locator('.tc-gt.ok')).toHaveCount(10);
  await shot(page, '6-grilla-echado');
  await cell(root, '40000108', 'p20_01').click();
  await page.waitForTimeout(400); // la hoja entra
  // echado, la hoja se abre al costado derecho a todo el alto, con «Listo» a la vista; la grilla sigue visible a la izquierda
  const cs = await root.locator('#tcCell').boundingBox();
  expect(cs.y).toBeGreaterThanOrEqual(0);
  expect(cs.y + cs.height).toBeLessThanOrEqual(391);
  expect(cs.x).toBeGreaterThan(300);
  const ok = await root.locator('#tcCell [data-tca="cellX"]').last().boundingBox();
  expect(ok.y + ok.height).toBeLessThanOrEqual(391);
  await shot(page, '7-celda-echado');
  await root.locator('#tcCell [data-tca="cellSet"][data-v="2"]').click();
  await page.evaluate(() => { TCS.doc.rows['40000108'].sal = '19:00'; tcChg(); });
  await expect(total(root, '40000108')).toContainText('+2 HE');
  // al desplazar hacia abajo los nombres y la fila de partidas siguen a la vista
  await root.locator('#tcGrid').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const nb = await root.locator('.tc-gn[data-dni="40000110"]').boundingBox(), hb = await root.locator('th.tc-gp[data-pc="p20_01"]').boundingBox();
  expect(Math.abs(nb.x - gb.x)).toBeLessThan(3);
  expect(Math.abs(hb.y - gb.y)).toBeLessThan(3);
  await expect.poll(async () => (await dbDoc(page)).rows['40000108'].h).toEqual({ p10_05: 8.5, p20_01: 2 });
  // al volver a vertical reaparecen la barra y el encabezado
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(root.locator('.tc-head')).toBeVisible();
  // fuera de la grilla (paso 4), echado no oculta nada
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(root.locator('.tc-head')).toBeVisible();
  noErrors(errors, 'grilla echada');
});

/* «Grilla como el formato — capataz» (pedido del dueño, 06-10-2026): 12 obreros × 6 partidas */
const PCS6 = [...PCS.filter(x => x[1] !== 'p30_01'),
  ['tpc', 'p10_07', { cod: '10.07', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Acero de refuerzo', und: 'kg', act: true, ord: 5 }],
  ['tpc', 'p20_02', { cod: '20.02', grp: '20', grpN: 'ARQUITECTURA', nom: 'Asentado de ladrillo', und: 'm2', act: true, ord: 6 }],
  ['tpc', 'p40_01', { cod: '40.01', grp: '40', grpN: 'VARIOS', nom: 'Limpieza de obra', und: 'glb', act: true, ord: 7 }]];
const N12 = [['ALVA ROJAS', 'ANA'], ['BRAVO DIAZ', 'BETO'], ['CASTRO PAZ', 'CARLOS'], ['DAVILA SOTO', 'DANIEL'], ['ESPINOZA TORRES', 'EDU'], ['FLORES RAMOS', 'FRANCO'],
  ['GARCIA LOPEZ', 'GABO'], ['HUAMAN ORTIZ', 'HUGO'], ['INCA PEREZ', 'IVAN'], ['JARA CARRASCO', 'JORGE'], ['QUISPE HUAMANI', 'JUAN'], ['QUISPE MAMANI', 'JUAN']];
const P6 = ['p10_05', 'p10_06', 'p10_07', 'p20_01', 'p20_02', 'p40_01'];
/** partidas enteras a la vista entre la columna de nombres y la de totales */
const visCols = root => root.locator('#tcGrid, #tcGridR').first().evaluate(g => {
  const l = g.querySelector('thead .tc-gc').getBoundingClientRect().right, r = g.querySelector('thead .tc-gtc').getBoundingClientRect().left;
  return [...g.querySelectorAll('thead .tc-gp')].filter(t => { const b = t.getBoundingClientRect(); return b.left >= l - 1 && b.right <= r + 1; }).length; });

test('grilla como el formato (12 obreros × 6 partidas): obreros en filas, partidas en columnas; revisar en la misma grilla y tocar una celda lleva a editarla', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const crew = N12.map(([a, n], i) => ob(String(40000201 + i), a, n, CAP));
  const rows = Object.fromEntries(N12.map(([a, n], i) => { const d = String(40000201 + i);
    if (i === 11) return [d, fullRow(a, n, { p10_05: 4 }, { as: false, mot: 'DM' })];
    const h = { [P6[i % 6]]: 4.5, [P6[(i + 2) % 6]]: i === 3 ? 6 : 4 };
    return [d, fullRow(a, n, h, { alt: i === 1, ...(i === 3 ? { sal: '19:00' } : {}) })]; }));
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...crew, ...PCS6, ['tareo', ID, { date: HOY, cap: CAP, st: 'bor', modo: 'hrs', pcs: P6, foto: [], hist: [], rows }]] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; });
  const root = page.locator('#tcRoot');
  // paso 3 en vertical: 11 filas (los que vinieron), 6 columnas, al menos 3 partidas enteras a la vista
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await expect(root.locator('.tc-g tbody tr')).toHaveCount(11);
  await expect(root.locator('.tc-g thead .tc-gp')).toHaveCount(6);
  await expect(root.locator('.tc-gn').first()).toContainText('1');
  expect(await visCols(root)).toBeGreaterThanOrEqual(3);
  await expect(total(root, '40000204')).toContainText('+2 HE');
  await expect(root.locator('#tcRot')).toBeVisible();
  await shot(page, '8-grilla-12x6-vertical');
  // al desplazar de lado: nombres fijos a la izquierda, totales fijos a la derecha, sin desbordar la página
  const g = root.locator('#tcGrid');
  await g.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  const gb = await g.boundingBox(), nb = await root.locator('.tc-gn[data-dni="40000201"]').boundingBox(), tb = await total(root, '40000201').boundingBox();
  expect(Math.abs(nb.x - gb.x)).toBeLessThan(3);
  expect(Math.abs((tb.x + tb.width) - (gb.x + gb.width))).toBeLessThan(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await root.locator('[data-tca="rotX"]').click();
  await expect(root.locator('#tcRot')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('lps.tcrot'))).toBe('1');
  // tocar la cabecera de una partida abre su menú con el nombre completo (rediseño 22-10-2026)
  await root.locator('th.tc-gp[data-pc="p20_02"] [data-tca="pcMenu"]').click();
  await expect(root.locator('#tcPcM')).toContainText('Asentado de ladrillo');
  await root.locator('#tcPcM [data-tca="pcmX"]').last().click();

  // paso 4: la misma grilla en solo lectura; el que no vino al final, atenuado y con su motivo; altura (A); totales
  await root.locator('.tc-steps [data-tcs="4"]').click();
  await expect(root.locator('#tcGridR .tc-rr')).toHaveCount(12);
  const last = root.locator('#tcGridR .tc-rr').last();
  await expect(last).toHaveClass(/off/);
  await expect(last).toHaveAttribute('data-dni', '40000212');
  await expect(last).toContainText('No vino · Descanso médico');
  await expect(root.locator('.tc-rr[data-dni="40000202"] .tc-gn')).toContainText('(A)');
  await expect(root.locator('.tc-rr[data-dni="40000204"] .tc-gt')).toContainText('+2 HE');
  await expect(root.locator('#tcGridR .tc-gss')).toContainText('95,5');
  const foto = await root.locator('#tcFotoC').boundingBox(), gr = await root.locator('#tcGridR').boundingBox();
  expect(foto.y).toBeLessThan(gr.y);
  await shot(page, '9-revisar-vertical');
  await root.locator('#tcBody').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await shot(page, '9b-revisar-vertical-final');
  // tocar una celda lleva al paso 3 con esa celda abierta
  await root.locator('#tcGridR .tc-rc[data-dni="40000205"][data-pc="p20_02"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Horas');
  await expect(root.locator('#tcCell')).toContainText('ESPINOZA TORRES, EDU');
  await expect(root.locator('#tcCell')).toContainText('20.02');
  await root.locator('#tcCell [data-tca="cellSet"][data-v="4"]').click();
  await expect(cell(root, '40000205', 'p20_02')).toHaveText('4');
  await expect(total(root, '40000205')).toContainText('faltan 0,5');
  await page.evaluate(() => { TCS.doc.rows['40000205'].sal = '16:30'; tcChg(); }); // salió antes: ahora cuadra
  await expect(total(root, '40000205')).toHaveClass(/ok/);

  // echado: la grilla a pantalla completa con más partidas a la vista; revisar también se lee
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('.top')).toBeHidden();
  expect(await visCols(root)).toBeGreaterThanOrEqual(5);
  await shot(page, '10-grilla-12x6-echado');
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await expect(root.locator('#tcGridR')).toBeVisible();
  expect(await visCols(root)).toBeGreaterThanOrEqual(5);
  await root.locator('#tcGridR').scrollIntoViewIfNeeded();
  await shot(page, '11-revisar-echado');
  noErrors(errors, 'grilla como el formato');
});

test('compatibilidad: un tareo antiguo por horarios se ve en solo lectura y se pasa a horas conservando las horas; enviado: solo lectura', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', d => d.accept());
  const AYER = '2026-09-30';
  const old = (date, st) => ({ date, cap: CAP, st, foto: [], hist: [], rows: { '40000001': fullRow('ALVA ROJAS', 'ANA'), '40000002': fullRow('BRAVO DIAZ', 'BETO', {}, { as: false }) },
    blq: [{ id: 'a', pc: 'p10_05', ini: '07:30', fin: '12:00', dnis: ['40000001', '40000002'] }, { id: 'b', pc: 'p20_01', ini: '13:00', fin: '18:00', dnis: ['40000001'] }] });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...EXTRA.filter(x => x[0] !== 'tper'), ob('40000001', 'ALVA ROJAS', 'ANA', CAP), ob('40000002', 'BRAVO DIAZ', 'BETO', CAP),
    ['tareo', ID, old(HOY, 'bor')], ['tareo', `${AYER}_${CAP}`, { ...old(AYER, 'env'), envAt: 1, envN: 1 }]] });
  const root = page.locator('#tcRoot');
  // borrador antiguo: aviso, sin pasos ni pie, se ve con su horario
  await expect(root.locator('#tcOld')).toContainText('formato anterior');
  await expect(root.locator('.tc-steps')).toHaveCount(0);
  await expect(root.locator('.tc-foot')).toHaveCount(0);
  await expect(root.locator('.tc-rr[data-dni="40000001"]')).toContainText('7:30–18:00');
  await expect(root.locator('.tc-rr[data-dni="40000001"] .tc-gt')).toContainText('9,5');
  // tocar algo no cambia el documento
  await page.evaluate(() => { tcChg(); });
  await page.waitForTimeout(1200);
  expect((await dbDoc(page)).modo).toBeUndefined();
  // pasar a horas: conserva las horas (también las de Beto, que no vino) y va a la grilla
  await root.locator('[data-tca="conv"]').click();
  await expect(root.locator('#tcGrid')).toBeVisible();
  await expect(cell(root, '40000001', 'p20_01')).toHaveText('5');
  await expect(total(root, '40000001')).toContainText('+1 HE');
  await expect.poll(async () => { const d = await dbDoc(page); return [d.modo, d.pcs, d.blq, d.rows['40000001'].h, d.rows['40000002'].h, d.rows['40000002'].trab]; })
    .toEqual(['hrs', ['p10_05', 'p20_01'], [], { p10_05: 4.5, p20_01: 5 }, { p10_05: 4.5 }, 0]);
  // ayer (antiguo, enviado): solo lectura con su horario (los días están en el menú «Hoy ▾» de la barra)
  await root.locator('[data-tcm="day"]').click();
  await root.locator(`[data-tcd="${AYER}"]`).click();
  await expect(root.locator('#tcSentB')).toContainText('Enviado ✓');
  await expect(root.locator('#tcOld')).toHaveCount(0);
  await expect(root.locator('.tc-rr[data-dni="40000001"]')).toContainText('7:30–18:00');
  noErrors(errors, 'compatibilidad');
});

test('capataz sin obreros asignados: mensaje claro', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: EXTRA.filter(x => x[0] !== 'tper' || x[2].cap !== CAP) });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await expect(root.locator('.tc-none')).toContainText('No tienes obreros asignados');
  await expect(root.locator('.tc-none')).toContainText('Pide a la oficina que te los asigne en Personal');
  await expect(root.locator('[data-tca="addOn"]')).toBeVisible();
  noErrors(errors, 'sin obreros');
});

test('capataz: copia los trabajos y las horas de ayer (sin la bloqueada) y agrega un obrero de otro capataz', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', d => d.accept());
  const AYER = '2026-09-30';
  const h = { p10_06: 6, p20_01: 2.5, p30_01: 1 };
  const extra = [...EXTRA, ['tareo', `${AYER}_${CAP}`, { date: AYER, cap: CAP, st: 'env', modo: 'hrs', pcs: ['p10_06', 'p20_01', 'p30_01'], foto: [], hist: [],
    rows: Object.fromEntries(['40000001', '40000002', '40000003', '40000004'].map(d => [d, fullRow('X', 'Y', h)])) }]];
  const errors = await openApp(page, { as: 'tcap', editar: false, extra });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await root.locator('[data-tcm="day"]').click();
  await expect(root.locator(`[data-tcd="${AYER}"]`)).toContainText('Enviado ✓');
  await root.locator('#tcMenu [data-tcm="x"]').last().click();
  await root.locator('[data-tca="todos"]').click();
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await expect(root.locator('[data-tca="copy"]')).toContainText('(2)');
  await root.locator('[data-tca="copy"]').click();
  await expect.poll(async () => (await dbDoc(page)).pcs).toEqual(['p10_06', 'p20_01']); // la de andamios (bloqueada) no se copia
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await root.locator('[data-tca="rep"]').click(); // «Repetir ayer» (20-10-2026)
  await expect(cell(root, '40000002', 'p10_06')).toHaveText('6');
  await expect(page.locator('#toast')).toContainText('4 de 4');
  await expect(root.locator('.tc-gt.ok')).toHaveCount(4); // 6 + 2,5 = 8,5 h (las de andamios no se copian)
  await expect.poll(async () => (await dbDoc(page)).rows['40000003'].h).toEqual({ p10_06: 6, p20_01: 2.5 });
  // con un obrero que ayer no estuvo, ya no se ofrece copiar las horas
  await root.locator('.tc-steps [data-tcs="1"]').click();
  await root.locator('[data-tca="addOn"]').click();
  await root.locator('#tcAddQ').fill('zega');
  await root.locator('[data-tca="add"][data-v="40000009"]').click();
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await expect(root.locator('.tc-gn')).toHaveCount(5);
  // «Repetir ayer» sigue disponible: copia a quien no tiene horas y dice a quién falta (el nuevo no estuvo ayer)
  await root.locator('[data-tca="rep"]').click();
  await expect(page.locator('#toast')).toContainText('Falta');
  noErrors(errors, 'copiar trabajos');
});

// ── Auditoría F2 (docs/ia/tareo.md «Correcciones de la auditoría F2 — capataz») ──
/* intercepta las escrituras de una colección en la base falsa: 'deny' (rechazo del servidor) o 'hang' (sin señal: espera a window.__rel()) */
const patchCol = (page, col, method, mode) => page.evaluate(({ col, method, mode }) => {
  const F = (typeof db !== 'undefined' && db) || FDB; if (!window.__origCol) window.__origCol = F.collection;
  const o = window.__origCol; window.__rel = null;
  F.collection = n => { const c = o.call(F, n); if (n !== col) return c; const d0 = c.doc;
    c.doc = id => { const r = d0(id); const real = r[method];
      r[method] = (...a) => mode === 'deny' ? Promise.reject(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }))
        : new Promise((res, rej) => { window.__rel = () => real(...a).then(res, rej); });
      return r; };
    return c; };
}, { col, method, mode });
const unpatch = page => page.evaluate(() => { const F = (typeof db !== 'undefined' && db) || FDB; if (window.__origCol) F.collection = window.__origCol; });

test('F2 capataz: la foto solo cuenta confirmada (rechazo → reintentar; sin señal → pendiente) y el envío muestra su estado real', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...oneCrew(), ['tareo', ID, readyDoc(HOY)]] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await root.locator('.tc-steps [data-tcs="4"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Enviar');
  // 1) el servidor rechaza la foto: no se agrega al tareo y no deja enviar
  await patchCol(page, 'tfot', 'set', 'deny');
  await root.locator('#tcFile').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: await png(page) });
  const fp = root.locator('.tc-fp');
  await expect(fp).toHaveClass(/err/);
  await expect(fp).toContainText('No se subió');
  await expect(root.locator('#tcSend')).toBeDisabled();
  await expect(root.locator('#tcSend')).toHaveText('Foto sin subir');
  await page.waitForTimeout(1300);
  expect((await dbDoc(page)).foto || []).toEqual([]);
  expect(await page.evaluate(id => window.__dbGet('tfot', id), `${ID}_1`)).toBeFalsy();
  // reintentar con el servidor bien: se sube, se agrega y ya se puede enviar
  await unpatch(page);
  await fp.locator('[data-tca="fpRe"]').click();
  await expect(root.locator('.tc-fp')).toHaveCount(0);
  await expect(root.locator('.tc-th')).toHaveCount(1);
  await expect.poll(async () => (await dbDoc(page)).foto).toEqual([`${ID}_1`]);
  await expect(root.locator('#tcSend')).toHaveText('Enviar tareo');
  // 2) sin señal: «Pendiente de subir», guardada en el celular, no deja enviar; al volver la señal se sube sola
  await patchCol(page, 'tfot', 'set', 'hang');
  await page.context().setOffline(true);
  await root.locator('#tcFile').setInputFiles({ name: 'g.png', mimeType: 'image/png', buffer: await png(page) });
  await expect(root.locator('.tc-fp')).toHaveClass(/pend/);
  await expect(root.locator('.tc-fp')).toContainText('Pendiente de subir');
  await expect(root.locator('#tcFpNote')).toContainText('quedó guardada en el celular');
  await expect(root.locator('#tcSend')).toBeDisabled();
  expect(Object.keys(await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), `lps.tcfp.${ID}`))).toEqual([`${ID}_2`]);
  await page.context().setOffline(false);
  await page.evaluate(() => window.__rel());
  await expect(root.locator('.tc-fp')).toHaveCount(0);
  await expect.poll(async () => (await dbDoc(page)).foto).toEqual([`${ID}_1`, `${ID}_2`]);
  expect(await page.evaluate(k => localStorage.getItem(k), `lps.tcfp.${ID}`)).toBeNull();
  expect(await page.evaluate(id => window.__dbGet('tfot', id).d.length, `${ID}_2`)).toBeLessThanOrEqual(950000);
  await unpatch(page);
  // 3) envío sin confirmar: «Enviando…» → «Se enviará al tener señal» (ámbar) → «Enviado ✓» al confirmarse
  await patchCol(page, 'tareo', 'update', 'hang');
  await root.locator('#tcSend').click();
  await expect(root.locator('#tcSentB')).toContainText('Enviando…');
  await expect(root.locator('#tcSentB')).toHaveClass(/tc-queued/, { timeout: 6000 });
  await expect(root.locator('#tcSentB')).toContainText('Se enviará al tener señal');
  await expect(root.locator('#tcSt')).toHaveText('Se enviará al tener señal');
  expect((await dbDoc(page)).st).toBe('bor');
  await unpatch(page);
  await page.evaluate(() => window.__rel());
  await expect(root.locator('#tcSentB')).toContainText('Enviado ✓');
  await expect(root.locator('#tcSentB')).not.toHaveClass(/tc-queued|tc-sending/);
  expect((await dbDoc(page)).st).toBe('env');
  noErrors(errors, 'foto y envío confirmados');
});

test('foto: si existe el editor de mejora (tFotoEditor) se usa lo que devuelve; cancelar no agrega nada', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...oneCrew(), ['tareo', ID, readyDoc(HOY)]] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await page.evaluate(() => {
    window.__fe = [];
    window.tFotoEditor = async u => { window.__fe.push(u.slice(0, 22)); if (window.__feNull) return null;
      const c = document.createElement('canvas'); c.width = 30; c.height = 20; const g = c.getContext('2d'); g.fillStyle = '#00f'; g.fillRect(0, 0, 30, 20); return c.toDataURL('image/png'); };
  });
  await root.locator('.tc-steps [data-tcs="4"]').click();
  // cancelado: nada se sube
  await page.evaluate(() => { window.__feNull = true; });
  await root.locator('#tcFile').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: await png(page) });
  await expect.poll(() => page.evaluate(() => window.__fe.length)).toBe(1);
  await expect(root.locator('.tc-cam')).not.toHaveClass(/busy/);
  await expect(root.locator('.tc-th')).toHaveCount(0);
  // aceptado: se reduce y se sube lo que devolvió el editor (30×20 azul)
  await page.evaluate(() => { window.__feNull = false; });
  await root.locator('#tcFile').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: await png(page) });
  await expect.poll(async () => (await dbDoc(page)).foto).toEqual([`${ID}_1`]);
  expect(await page.evaluate(() => window.__fe)).toEqual(['data:image/png;base64,', 'data:image/png;base64,']);
  const px = await page.evaluate(async id => { const d = window.__dbGet('tfot', id).d; const i = new Image(); await new Promise(r => { i.onload = r; i.src = d; });
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return [i.width, i.height, [...g.getImageData(15, 10, 1, 1).data].slice(0, 3)]; }, `${ID}_1`);
  expect(px[0]).toBe(30);
  expect(px[1]).toBe(20);
  expect(px[2][2]).toBeGreaterThan(200); // azul: la del editor, no la roja original
  noErrors(errors, 'editor de foto');
});

test('F2 capataz: si el servidor rechaza el envío vuelve a borrador con el error; avisos «warn» no bloquean; guarda la jornada del día', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  // Ana con 6 h: jornada parcial (aviso que no bloquea)
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...oneCrew(), ['tareo', ID, readyDoc(HOY, { foto: [`${ID}_1`], rows: { '40000001': fullRow('ALVA ROJAS', 'ANA', { p10_05: 6 }, { sal: '14:30' }) } })], ['tfot', `${ID}_1`, { date: HOY, cap: CAP, n: 1, d: 'data:image/png;base64,iVBORw0KGgo=' }]] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  await expect(root.locator('.tc-steps')).toBeVisible();
  await root.locator('.tc-steps [data-tcs="4"]').click();
  await expect(root.locator('#tcWarns')).toContainText('Jornada parcial: ALVA ROJAS 6 h de 8,5');
  await expect(root.locator('#tcSend')).toHaveText('Enviar tareo');
  await expect(root.locator('#tcSend')).toBeEnabled();
  // rechazo del servidor: vuelve a editable con el error
  await patchCol(page, 'tareo', 'update', 'deny');
  await root.locator('#tcSend').click();
  await expect(root.locator('#tcSt')).toContainText('No se pudo enviar el tareo');
  await expect(root.locator('.tc-foot')).toBeVisible();
  await expect(root.locator('#tcSentB')).toHaveCount(0);
  expect((await dbDoc(page)).st).toBe('bor');
  // con el servidor bien: enviado con la jornada congelada
  await unpatch(page);
  await root.locator('#tcSend').click();
  await expect(root.locator('#tcSentB')).toContainText('Enviado ✓');
  const d = await dbDoc(page);
  expect(d.st).toBe('env');
  expect(d.cfg).toMatchObject({ v: 1 });
  expect(d.hist.map(h => h.a)).toEqual(['env']);
  noErrors(errors, 'rechazo del envío');
});

test('F2 capataz: «Por corregir» lista los reabiertos de cualquier fecha; se corrige en la grilla sin tocar el cotejo de la oficina', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  const V = '2026-09-23', VID = `${V}_${CAP}`;
  const cot = { '40000001': { fir: true, by: 'tasis@obra.pe', t: 5 } };
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...oneCrew(),
    ['tareo', VID, readyDoc(V, { st: 'reab', foto: [`${VID}_1`], reab: { t: 9, by: 'tasis@obra.pe', mot: 'La tarde fue en 10.06' }, hist: [{ t: 8, by: CAP, a: 'env' }, { t: 9, by: 'tasis@obra.pe', a: 'reab' }], cot, cotFot: [`${VID}_1`] })],
    ['tfot', `${VID}_1`, { date: V, cap: CAP, n: 1, d: 'data:image/png;base64,iVBORw0KGgo=' }],
    ['tareo', '2026-09-20_otro@obra.pe', { date: '2026-09-20', cap: 'otro@obra.pe', st: 'reab', rows: {}, blq: [] }]] });
  const root = page.locator('#tcRoot');
  // (rediseño 22-10-2026) «Por corregir» va en el menú del día: la barra muestra un globo con cuántos hay
  await expect(root.locator('.tc-dayb .tc-badge')).toHaveText('1');
  await root.locator('[data-tcm="day"]').click();
  const pc = root.locator('#tcMenu');
  await expect(pc).toContainText('Por corregir (1)');
  await expect(pc).toContainText('La tarde fue en 10.06');
  await pc.locator(`[data-tcd="${V}"]`).click();
  await expect(root.locator('.tc-dayb')).toContainText('Mié 23');
  await expect(root.locator('.tc-reab')).toContainText('La tarde fue en 10.06');
  // corrige: agrega 10.06 y le pasa las 4 h de la tarde
  await root.locator('.tc-steps [data-tcs="2"]').click();
  await root.locator('[data-tca="pcOn"]').click();
  await root.locator('#tcPcQ').fill('10.06');
  await root.locator('[data-tca="pc"][data-v="p10_06"]').click();
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await cell(root, '40000001', 'p20_01').click();
  await root.locator('#tcCell [data-tca="cellSet"][data-v="0"]').click();
  await cell(root, '40000001', 'p10_06').click();
  await root.locator('#tcCell [data-tca="cellSet"]', { hasText: 'El resto de su horario' }).click();
  await expect.poll(async () => (await dbDoc(page, VID)).rows['40000001'].h).toEqual({ p10_05: 4.5, p10_06: 4 });
  let d = await dbDoc(page, VID);
  expect(d.cot).toEqual(cot);
  expect(d.cotFot).toEqual([`${VID}_1`]);
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await root.locator('#tcSend').click();
  await expect(root.locator('#tcSentB')).toContainText('Enviado ✓');
  d = await dbDoc(page, VID);
  expect(d.st).toBe('env');
  expect(d.cot).toEqual(cot);
  expect(d.hist.map(h => h.a)).toEqual(['env', 'reab', 'env']);
  await expect(root.locator('.tc-dayb .tc-badge')).toHaveCount(0);
  noErrors(errors, 'por corregir');
});

test('capataz: quitar una partida con horas pide confirmar y borra sus horas al primer intento aunque se guarde con la ventana abierta', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...oneCrew(), ['tareo', ID, readyDoc(HOY)]] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  // un cambio recién hecho en la grilla (se guarda ≈1 s después) y enseguida quitar la partida con la ventana real de confirmación
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await cell(root, '40000001', 'p10_05').click();
  await root.locator('#tcCell [data-tca="cellSet"][data-v="5"]').click();
  await root.locator('.tc-steps [data-tcs="2"]').click();
  await page.evaluate(() => { window.__uiAskReal = true; });
  await root.locator('.tc-pcr[data-pc="p20_01"] [data-tca="pcRm"]').click();
  await expect(page.locator('#uask')).toBeVisible();
  await expect(page.locator('#uask')).toContainText('4 h cargadas');
  await page.waitForTimeout(1600); // el guardado automático y la confirmación de la base llegan con la ventana abierta
  await page.locator('#uask [data-ua="si"]').click();
  await expect(root.locator('.tc-pcr')).toHaveCount(1);
  await expect.poll(async () => { const d = await dbDoc(page); return [d.pcs, d.rows['40000001'].h]; }).toEqual([['p10_05'], { p10_05: 5 }]);
  noErrors(errors, 'quitar partida');
});

test('capataz: «no vino» sin motivo deja seguir; obrero de otra cuadrilla con aviso, etiqueta y ajeno/capOrig', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const msgs = [];
  page.on('dialog', d => { msgs.push(d.message()); d.accept(); });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...EXTRA, ob('40000010', 'SOLIS VEGA', 'SAUL', '')] });
  await page.evaluate(() => { window.tFotoEditor = async u => u; }); // sin el editor de mejora (se prueba aparte)
  const root = page.locator('#tcRoot');
  const dan = root.locator('.tc-ob[data-dni="40000004"]');
  await dan.locator('[data-tca="novino"]').click();
  await expect(dan.locator('.tc-err')).toHaveCount(0);
  // motivo opcional en la hoja del obrero (tocar su nombre); tocar el motivo elegido lo quita
  await dan.locator('[data-tca="ob"]').click();
  await expect(root.locator('#tcOb')).toContainText('Motivo (opcional)');
  await root.locator('#tcOb [data-tca="mot"][data-v="VA"]').click();
  await expect(dan).toContainText('Vacaciones');
  await root.locator('#tcOb [data-tca="mot"][data-v="VA"]').click();
  await expect(dan).not.toContainText('Vacaciones');
  await root.locator('#tcOb [data-tca="obX"]').last().click();
  // de otro capataz: confirmación clara y etiqueta ámbar
  await root.locator('[data-tca="addOn"]').click();
  await root.locator('#tcAddQ').fill('zega');
  await expect(root.locator('#tcAddL')).toContainText('de ');
  await root.locator('[data-tca="add"][data-v="40000009"]').click();
  expect(msgs.pop()).toMatch(/ZEGARRA LUNA, ZOE no es de tu cuadrilla \(es de .+\)\. ¿Lo tareas igual\?/);
  await expect(root.locator('.tc-ob[data-dni="40000009"] .tc-tag.bad')).toHaveText('No es de tu cuadrilla');
  // sin capataz
  await root.locator('[data-tca="addOn"]').click();
  await root.locator('#tcAddQ').fill('solis');
  await expect(root.locator('#tcAddL')).toContainText('sin capataz');
  await root.locator('[data-tca="add"][data-v="40000010"]').click();
  expect(msgs.pop()).toContain('no es de tu cuadrilla (es sin capataz)');
  await expect(root.locator('.tc-tag.bad')).toHaveCount(2);
  // pasa al paso 2 aunque Daniel no tenga motivo
  await root.locator('[data-tca="todos"]').click();
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Trabajos');
  await expect.poll(async () => { const r = (await dbDoc(page)).rows || {}; return [r['40000009']?.ajeno, r['40000009']?.capOrig, r['40000010']?.ajeno, r['40000010']?.capOrig, r['40000004']?.as, r['40000004']?.mot, r['40000001']?.ajeno]; })
    .toEqual([true, 'otro@obra.pe', true, '', false, '', undefined]);
  // la regla común (tValida) no pide el motivo
  expect(await page.evaluate(() => tValida({ date: '2026-09-28', modo: 'hrs', pcs: [], rows: { d: { ape: 'X', as: false, mot: '' } }, foto: ['f'] }))).toEqual([]);
  noErrors(errors, 'motivo opcional y ajeno');
});

test('capataz: errores de horas llevan a la columna del obrero; partida bloqueada en los trabajos no deja enviar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...EXTRA.filter(x => x[0] !== 'tper'), ob('40000001', 'ALVA ROJAS', 'ANA', CAP), ob('40000002', 'BRAVO DIAZ', 'BETO', CAP),
    ['tareo', ID, readyDoc(HOY, { pcs: ['p10_05', 'p30_01'], rows: { '40000001': fullRow('ALVA ROJAS', 'ANA', { p10_05: 8.5 }), '40000002': fullRow('BRAVO DIAZ', 'BETO', { p10_05: 17 }) } })]] });
  const root = page.locator('#tcRoot');
  // la bloqueada sale en rojo en los trabajos y sus celdas no se pueden tocar
  await root.locator('.tc-steps [data-tcs="2"]').click();
  await expect(root.locator('.tc-pcr[data-pc="p30_01"]')).toHaveClass(/bad/);
  await expect(root.locator('.tc-pcr[data-pc="p30_01"]')).toContainText('Bloqueada por costos');
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await expect(cell(root, '40000001', 'p30_01')).toBeDisabled();
  await expect(total(root, '40000002')).toHaveClass(/bad/);
  await expect(root.locator('.tc-gn[data-dni="40000002"]')).toHaveClass(/bad/);
  // «Revisar y enviar» lleva primero a quitar la bloqueada y luego a la columna de Beto (más de 16 h)
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Trabajos');
  await root.locator('.tc-pcr[data-pc="p30_01"] [data-tca="pcRm"]').click();
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Horas');
  await expect(page.locator('#toast')).toContainText('máximo 16');
  await cell(root, '40000002', 'p10_05').click();
  await root.locator('#tcCell [data-tca="cellSet"][data-v="8.5"]').click();
  await expect(total(root, '40000002')).toHaveClass(/ok/);
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await expect(root.locator('#tcSend')).toContainText('Falta la foto');
  noErrors(errors, 'errores de horas');
});

test('grilla de horas: «+» agrega una partida sin volver a Trabajos y abre la primera casilla (20-10-2026)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...oneCrew(), ['tareo', ID, readyDoc(HOY)]] });
  const root = page.locator('#tcRoot');
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await expect(root.locator('th.tc-gp')).toHaveCount(2);
  await root.locator('#tcPcPlus').click();
  const sh = root.locator('#tcPcSh');
  await expect(sh).toBeVisible();
  // las ya agregadas y las bloqueadas no se ofrecen
  await expect(sh.locator('[data-tca="pc"][data-v="p10_05"]')).toHaveCount(0);
  await expect(sh.locator('[data-tca="pc"][data-v="p30_01"]')).toHaveCount(0);
  await sh.locator('#tcPcQ').fill('vaciado');
  await sh.locator('[data-tca="pc"][data-v="p10_06"]').click();
  await expect(sh).toHaveCount(0);
  await expect(root.locator('th.tc-gp[data-pc="p10_06"]')).toBeVisible();
  await expect(root.locator('#tcCell')).toBeVisible();
  await expect.poll(async () => (await dbDoc(page)).pcs).toEqual(['p10_05', 'p20_01', 'p10_06']);
  // el paso de Trabajos sigue con la lista completa
  await root.locator('[data-tca="cellX"]').first().click();
  await root.locator('.tc-steps [data-tcs="2"]').click();
  await expect(root.locator('.tc-pcr')).toHaveCount(3);
  noErrors(errors, 'grilla +');
});

test('capataz más rápido (20-10-2026): horario con salida y corrido, repetir ayer, elegir varios con «el resto», día de un obrero y bloqueo si no cuadra', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', d => d.accept());
  const AYER = '2026-09-30';
  const extra = [...EXTRA, ['tareo', `${AYER}_${CAP}`, { date: AYER, cap: CAP, st: 'env', modo: 'hrs', pcs: ['p10_05', 'p20_01'], foto: [], hist: [],
    rows: { '40000001': fullRow('ALVA ROJAS', 'ANA', { p10_05: 4.5, p20_01: 4 }), '40000002': fullRow('BRAVO DIAZ', 'BETO', { p10_05: 8.5 }) } }]];
  const errors = await openApp(page, { as: 'tcap', editar: false, extra });
  await page.evaluate(() => { window.tFotoEditor = async u => u; });
  const root = page.locator('#tcRoot');
  await root.locator('[data-tca="todos"]').click();
  // horario de Carlos: salió 19:00 y corrido → 11,5 h (3 extra: 2 al 60 %, 1 al 100 %)
  await root.locator('.tc-ob[data-dni="40000003"] [data-tca="ob"]').click();
  const carlos = root.locator('#tcOb');
  await carlos.locator('[data-tca="salQ"][data-v="19:00"]').click();
  await carlos.locator('input[data-tca="cor"]').check();
  await expect(carlos.locator('.tc-hres')).toContainText('11,5 h trabajadas');
  await expect(carlos.locator('.tc-hres')).toContainText('2 al 60 %, 1 al 100 %');
  await expect.poll(async () => { const r = ((await dbDoc(page)).rows || {})['40000003'] || {}; return [r.sal, r.cor, r.ent]; }).toEqual(['19:00', true, undefined]);
  await carlos.locator('[data-tca="obX"]').last().click();
  // paso 3: «Repetir ayer» trae las partidas de ayer y copia a Ana y Beto; Carlos y Daniel faltan
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await root.locator('[data-tca="rep"]').click();
  await expect(page.locator('#toast')).toContainText('2 de 4');
  await expect(cell(root, '40000001', 'p20_01')).toHaveText('4');
  await expect.poll(async () => (await dbDoc(page)).pcs).toEqual(['p10_05', 'p20_01']);
  // elegir varios (Carlos y Daniel): 4 h en 10.05 y el resto en 20.01, según el horario de cada uno
  await root.locator('[data-tca="multi"]').click();
  await root.locator('[data-tca="mSin"]').click();
  await expect(root.locator('#tcMBar')).toContainText('2 elegidos');
  await root.locator('.tc-foot [data-tca="asgOn"]').click();
  await root.locator('#tcAsg input[data-pc="p10_05"]').fill('4');
  await root.locator('#tcAsg input[data-pc="p10_05"]').press('Enter');
  await root.locator('#tcAsg [data-tca="asgR"][data-pc="p20_01"]').click();
  await expect(root.locator('#tcAsgP')).toContainText('4 + 7,5');
  await root.locator('#tcAsg [data-tca="asgOk"]').click();
  await expect(cell(root, '40000003', 'p20_01')).toHaveText('7,5');   // 11,5 − 4
  await expect(cell(root, '40000004', 'p20_01')).toHaveText('4,5');   // 8,5 − 4
  await expect(total(root, '40000003')).toHaveClass(/ok/);
  // día de un obrero: Beto escribe 6 en 10.05 y «el resto» en 20.01
  await root.locator('.tc-gn[data-dni="40000002"] [data-tca="wk"]').click();
  await root.locator('#tcWk input[data-pc="p10_05"]').fill('6');
  await root.locator('#tcWk input[data-pc="p10_05"]').press('Enter');
  await expect(root.locator('#tcWkT')).toContainText('faltan 2,5');
  await root.locator('#tcWk [data-tca="wkSet"][data-pc="p20_01"]').click();
  await expect(root.locator('#tcWkT')).toContainText('completo');
  await root.locator('#tcWk [data-tca="wkX"]').last().click();
  await expect.poll(async () => (((await dbDoc(page)).rows || {})['40000002'] || {}).h).toEqual({ p10_05: 6, p20_01: 2.5 });
  // escribir en la casilla: Ana 10.05 = 6 → no cuadra con su horario (sobran 1,5) y no deja pasar a enviar
  await cell(root, '40000001', 'p10_05').click();
  if (!(await root.locator('#tcCin').count())) await root.locator('#tcCell [data-tca="cellW"]').click();
  await root.locator('#tcCin').fill('6');
  await root.locator('#tcCin').press('Enter');
  await expect(total(root, '40000001')).toContainText('sobran 1,5');
  const E = await page.evaluate(() => tcErrs(TCS.doc).filter(e => e.k === 'hor').map(e => e.dni));
  expect(E).toEqual(['40000001']);
  // atajo (20-10-2026): tocar el total que no cuadra → «Se quedó: salida 18:30» (7:30 + 10 h + refrigerio) y ya cuadra
  await total(root, '40000001').locator('[data-tca="hfx"]').click();
  await expect(root.locator('#tcHfx')).toContainText('1,5 h más');
  await root.locator('#tcHfx [data-tca="hfxSal"]').click();
  await expect(total(root, '40000001')).toHaveClass(/ok/);
  await expect.poll(async () => (((await dbDoc(page)).rows || {})['40000001'] || {}).sal).toBe('18:30');
  // elegir varios + tocar una partida (22-10-2026): se abre la hoja «¿Cuántas horas?»; «Todo el día aquí» reemplaza su día y termina
  await root.locator('[data-tca="multi"]').click();
  await root.locator('.tc-gn[data-dni="40000004"] [data-tca="mtog"]').click();
  await root.locator('th.tc-gp[data-pc="p10_05"] [data-tca="pcAll"]').click();
  await expect(root.locator('#tcMpc')).toContainText('10.05');
  await root.locator('#tcMpc [data-tca="mpcSet"][data-m="all"]').click();
  await expect(cell(root, '40000004', 'p10_05')).toHaveText('8,5');
  await expect(cell(root, '40000004', 'p20_01')).toHaveText('');
  await expect(root.locator('#tcMBar')).toHaveCount(0);
  await expect(root.locator('.tc-mck')).toHaveCount(0);
  // 3 h en 20.01: sus otras partidas no se tocan y la selección sigue; luego «el resto de su horario» en 10.05 completa y termina
  // (22-10-2026) tocar la casilla ☑ también elige (antes se marcaba pero quedaba «0 elegidos»)
  await root.locator('[data-tca="multi"]').click();
  await root.locator('.tc-gn[data-dni="40000004"] .tc-mck').click();
  await expect(root.locator('#tcMBar')).toContainText('1 elegido');
  await root.locator('th.tc-gp[data-pc="p20_01"] [data-tca="pcAll"]').click();
  await root.locator('#tcMpc [data-tca="mpcSet"][data-v="3"]').click();
  await expect(cell(root, '40000004', 'p20_01')).toHaveText('3');
  await expect(cell(root, '40000004', 'p10_05')).toHaveText('8,5');
  await expect(root.locator('#tcMBar')).toContainText('1 elegido');
  await root.locator('th.tc-gp[data-pc="p10_05"] [data-tca="pcAll"]').click();
  await expect(root.locator('#tcMpc [data-m="resto"]')).toContainText('5,5');
  // otra cantidad escrita: «Poner» se habilita al escribir; se usa «el resto»
  await root.locator('#tcMpc [data-tca="mpcW"]').click();
  await root.locator('#tcMpcIn').fill('2,5');
  await expect(root.locator('#tcMpcOk')).toContainText('2,5');
  await root.locator('#tcMpc [data-tca="mpcSet"][data-m="resto"]').click();
  await expect(cell(root, '40000004', 'p10_05')).toHaveText('5,5');
  await expect(total(root, '40000004')).toHaveClass(/ok/);
  await expect(root.locator('#tcMBar')).toHaveCount(0);
  await expect.poll(async () => (((await dbDoc(page)).rows || {})['40000004'] || {}).h).toEqual({ p10_05: 5.5, p20_01: 3 });
  noErrors(errors, 'capataz rápido');
});

// ── Auditoría del capataz (21-10-2026): repetir con el horario de hoy, asignar sin borrar, primer toque, medianoche, no laborable ──
test('auditoría 21-10: «Repetir» ajusta las horas al horario de hoy, «Ajustar» en la hoja que no cuadra, «Asignar» no borra lo que no se llenó y el primer toque no se pierde', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  page.on('dialog', d => d.accept());
  const AYER = '2026-09-30';
  const extra = [...EXTRA, ['tareo', `${AYER}_${CAP}`, { date: AYER, cap: CAP, st: 'env', modo: 'hrs', pcs: ['p10_05', 'p20_01'], foto: [], hist: [],
    rows: { '40000001': fullRow('ALVA ROJAS', 'ANA', { p10_05: 8.5, p20_01: 2 }, { sal: '19:00' }), '40000002': fullRow('BRAVO DIAZ', 'BETO', { p10_05: 8.5 }),
      '40000003': fullRow('CASTRO PAZ', 'CARLOS', { p20_01: 8.5 }) } }],
    ['tareo', ID, readyDoc(HOY, { rows: { '40000001': fullRow('ALVA ROJAS', 'ANA'), '40000002': fullRow('BRAVO DIAZ', 'BETO', { p20_01: 8.5 }),
      '40000003': fullRow('CASTRO PAZ', 'CARLOS'), '40000004': fullRow('DAVILA SOTO', 'DANIEL') } })]];
  const errors = await openApp(page, { as: 'tcap', editar: false, extra });
  const root = page.locator('#tcRoot');
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await root.locator('[data-tca="rep"]').click();
  // Ana ayer 10,5 h (salió 19:00) → hoy 8,5 h en la misma proporción (cuartos de hora, el residuo a la mayor); su salida no se copia
  await expect.poll(async () => ((await dbDoc(page)).rows || {})['40000001']?.h).toEqual({ p10_05: 7, p20_01: 1.5 });
  expect(((await dbDoc(page)).rows['40000001']).sal).toBeUndefined();
  await expect(total(root, '40000001')).toHaveClass(/ok/);
  // el aviso cuenta aparte a quien ya tenía horas (Beto) y no lo cambia
  await expect(page.locator('#toast')).toContainText('2 de 3 sin horas');
  await expect(page.locator('#toast')).toContainText('1 ajustado a su horario de hoy');
  await expect(page.locator('#toast')).toContainText('1 ya tenía horas');
  await expect(page.locator('#toast')).toContainText('Falta: ');
  expect(((await dbDoc(page)).rows['40000002']).h).toEqual({ p20_01: 8.5 });
  // si después cambia su horario, la hoja «no cuadra» ofrece primero ajustar las horas copiadas (no inventar HE con la salida)
  await page.evaluate(() => { TCS.doc.rows['40000001'].sal = '16:00'; tcChg(); });
  await total(root, '40000001').locator('[data-tca="hfx"]').click();
  await expect(root.locator('#tcHfx .tc-csa .ib').first()).toHaveAttribute('data-tca', 'hfxAdj');
  await expect(root.locator('#tcHfx [data-tca="hfxAdj"]')).toHaveClass(/pri/);
  await expect(root.locator('#tcHfx [data-tca="hfxSal"]')).not.toHaveClass(/pri/);
  await root.locator('#tcHfx [data-tca="hfxAdj"]').click();
  await expect.poll(async () => ((await dbDoc(page)).rows || {})['40000001']?.h).toEqual({ p10_05: 6.25, p20_01: 1.25 });
  await expect(total(root, '40000001')).toHaveClass(/ok/);
  // «Asignar a 1» sin escribir nada: «Aplicar» deshabilitado; con 3 h en 10.05 (sin soltar el campo) el primer toque aplica y 20.01 no se toca
  await root.locator('[data-tca="multi"]').click();
  await root.locator('.tc-gn[data-dni="40000002"] [data-tca="mtog"]').click();
  await root.locator('.tc-foot [data-tca="asgOn"]').click();
  await expect(root.locator('#tcAsgOk')).toBeDisabled();
  await root.locator('#tcAsg input[data-pc="p10_05"]').fill('3');
  await expect(root.locator('#tcAsgP')).toContainText('3 + 8,5');
  await expect(root.locator('#tcAsgOk')).toBeEnabled();
  await root.locator('#tcAsgOk').click();
  await expect.poll(async () => ((await dbDoc(page)).rows || {})['40000002']?.h).toEqual({ p20_01: 8.5, p10_05: 3 });
  // casilla: escribir 2 y tocar «El resto de su horario» sin soltar el campo → el toque no se pierde (8,5)
  await cell(root, '40000004', 'p10_05').click();
  if (!(await root.locator('#tcCin').count())) await root.locator('#tcCell [data-tca="cellW"]').click();
  await root.locator('#tcCin').fill('2');
  await expect(root.locator('#tcCv')).toHaveText('2 h');
  await root.locator('#tcCellR').click();
  await expect(root.locator('#tcCell')).toHaveCount(0);
  await expect(cell(root, '40000004', 'p10_05')).toHaveText('8,5');
  // las horas escritas se guardan con dos decimales (antes se redondeaban a ¼ sin avisar)
  await cell(root, '40000003', 'p10_05').click();
  if (!(await root.locator('#tcCin').count())) await root.locator('#tcCell [data-tca="cellW"]').click();
  await root.locator('#tcCin').fill('2,33');
  await root.locator('#tcCin').press('Enter');
  await expect(cell(root, '40000003', 'p10_05')).toHaveText('2,33');
  // «Su día»: escribir y tocar «Anterior» sin soltar el campo
  await root.locator('.tc-gn[data-dni="40000004"] [data-tca="wk"]').click();
  await root.locator('#tcWk input[data-pc="p10_05"]').fill('6');
  await expect(root.locator('#tcWkT')).toContainText('faltan 2,5');
  await expect(root.locator('#tcWk [data-tca="wkSet"][data-pc="p20_01"]')).toBeVisible();
  await root.locator('#tcWk [data-tca="wkSet"][data-pc="p20_01"]').click();
  await expect(root.locator('#tcWkT')).toContainText('completo');
  await expect.poll(async () => ((await dbDoc(page)).rows || {})['40000004']?.h).toEqual({ p10_05: 6, p20_01: 2.5 });
  await root.locator('#tcWk [data-tca="wkX"]').last().click();
  // «No vino» por error conserva su horario (como sus horas)
  await page.evaluate(() => { const r = TCS.doc.rows['40000004']; r.sal = '18:00'; r.cor = true; tcChg(); });
  await root.locator('.tc-steps [data-tcs="1"]').click();
  await root.locator('.tc-ob[data-dni="40000004"] [data-tca="novino"]').click();
  await expect.poll(async () => { const r = ((await dbDoc(page)).rows || {})['40000004'] || {}; return [r.as, r.sal, r.cor]; }).toEqual([false, '18:00', true]);
  noErrors(errors, 'auditoría 21-10 repetir/asignar');
});

test('auditoría 21-10: turno que pasa de medianoche se puede enviar y en un no laborable la salida sola guarda la entrada', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...oneCrew(), ['tareo', ID, readyDoc(HOY, { rows: { '40000001': fullRow('ALVA ROJAS', 'ANA', { p10_05: 8, p20_01: 8 }) } })]] });
  const root = page.locator('#tcRoot');
  const ana = root.locator('#tcOb');
  // 7:30 a 0:30 del día siguiente: 17 h menos el refrigerio = 16 h (el límite de 16 h sigue)
  await root.locator('.tc-ob[data-dni="40000001"] [data-tca="ob"]').click();
  await ana.locator('input[data-tca="sal"]').fill('00:30');
  await expect(ana.locator('.tc-hres')).toContainText('16 h trabajadas (sale al día siguiente)');
  await expect.poll(async () => ((await dbDoc(page)).rows || {})['40000001']?.sal).toBe('00:30');
  expect(await page.evaluate(() => tcErrs(TCS.doc).filter(e => e.dni).map(e => e.k))).toEqual([]);
  await root.locator('#tcOb [data-tca="obX"]').last().click();
  // con 15 h en partidas, «Se quedó / Salió antes» propone 23:30 (no 23:59) y de verdad cuadra
  await page.evaluate(() => { TCS.doc.rows['40000001'].h = { p10_05: 8, p20_01: 7 }; tcChg(); });
  await root.locator('.tc-steps [data-tcs="2"]').click();
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await total(root, '40000001').locator('[data-tca="hfx"]').click();
  await expect(root.locator('#tcHfx [data-tca="hfxSal"]')).toHaveAttribute('data-v', '23:30');
  await root.locator('#tcHfx [data-tca="hfxSal"]').click();
  await expect(page.locator('#toast')).toContainText('ya cuadra');
  await expect(total(root, '40000001')).toHaveClass(/ok/);
  // no laborable (domingo congelado): escribir solo la salida guarda también la entrada que se ve, y se compara con sus horas
  await page.evaluate(() => { TCS.doc.cfg = { v: 1, jor: null, fer: false, rnl: { ref: 60, refIni: '12:00' } }; const r = TCS.doc.rows['40000001']; delete r.sal; delete r.ent; r.h = { p10_05: 8.5 }; tcChg(); });
  await root.locator('.tc-steps [data-tcs="1"]').click();
  await root.locator('.tc-ob[data-dni="40000001"] [data-tca="ob"]').click();
  await ana.locator('input[data-tca="sal"]').fill('15:00');
  await expect.poll(async () => { const r = ((await dbDoc(page)).rows || {})['40000001'] || {}; return [r.ent, r.sal]; }).toEqual(['07:30', '15:00']);
  await expect(ana.locator('.tc-hres')).toContainText('6,5 h trabajadas');
  expect(await page.evaluate(() => tcErrs(TCS.doc).filter(e => e.dni).map(e => e.k))).toEqual(['hor']);
  noErrors(errors, 'auditoría 21-10 medianoche y no laborable');
});

// ── Rediseño del celular del capataz (22-10-2026): barra única, reabierto, confirmaciones que evitan perder datos ──
test('rediseño 22-10: reabierto completo hasta «Entendido», quitar foto y «Todo el día aquí» piden confirmar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let accept = false;
  const msgs = [];
  page.on('dialog', d => { msgs.push(d.message()); accept ? d.accept() : d.dismiss(); });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...EXTRA, ['tfot', `${ID}_1`, { date: HOY, cap: CAP, n: 1, d: 'data:image/png;base64,iVBORw0KGgo=' }],
    ['tareo', ID, readyDoc(HOY, { st: 'reab', foto: [`${ID}_1`], reab: { t: 7, by: 'tasis@obra.pe', mot: 'Revisa las horas de Ana' },
      rows: { '40000001': fullRow('ALVA ROJAS', 'ANA', { p10_05: 4.5, p20_01: 4 }), '40000002': fullRow('BRAVO DIAZ', 'BETO') } })]] });
  const root = page.locator('#tcRoot');
  // barra única: sin la barra de la app; el día lleva ⚠ por estar reabierto
  await expect(page.locator('.top')).toBeHidden();
  await expect(root.locator('.tc-dayb')).toContainText('⚠');
  // el aviso se lee completo hasta «Entendido»; después el motivo sigue en el menú del día
  await expect(root.locator('#tcReab')).toContainText('Revisa las horas de Ana');
  await root.locator('[data-tcm="reabOk"]').click();
  await expect(root.locator('#tcReab')).toHaveCount(0);
  await root.locator('[data-tcm="day"]').click();
  await expect(root.locator('#tcMenu')).toContainText('Revisa las horas de Ana');
  await root.locator('#tcMenu [data-tcm="x"]').last().click();
  // pasos 2 a 4: sin la barra inferior de la app
  await root.locator('.tc-foot [data-tca="todos"]').click();
  await root.locator('.tc-steps [data-tcs="4"]').click();
  await expect(page.locator('#bnav')).toBeHidden();
  // quitar la foto pide confirmar: cancelar la deja
  await root.locator('[data-tca="fx"]').click();
  expect(msgs.pop()).toContain('¿Quitar esta foto?');
  await page.waitForTimeout(300);
  expect((await dbDoc(page)).foto).toEqual([`${ID}_1`]);
  // «Todo el día aquí» con alguien que ya tiene horas en otra partida: confirma; cancelar no cambia nada
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await root.locator('[data-tca="multi"]').click();
  await root.locator('.tc-gnb[data-dni="40000001"]').click();
  await root.locator('th.tc-gp[data-pc="p20_01"] [data-tca="pcAll"]').click();
  await root.locator('#tcMpc [data-tca="mpcSet"][data-m="all"]').click();
  expect(msgs.pop()).toContain('ya tiene horas en otras partidas');
  expect(await page.evaluate(() => TCS.doc.rows['40000001'].h)).toEqual({ p10_05: 4.5, p20_01: 4 });
  accept = true;
  await root.locator('#tcMpc [data-tca="mpcSet"][data-m="all"]').click();
  await expect.poll(async () => ((await dbDoc(page)).rows || {})['40000001']?.h).toEqual({ p20_01: 8.5 });
  await expect(root.locator('#tcMBar')).toHaveCount(0);
  noErrors(errors, 'rediseño 22-10');
});
