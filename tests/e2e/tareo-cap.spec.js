// Tareo del capataz en el celular, «horas por cantidad» (docs/ia/tareo.md «Contrato "horas por cantidad"» e «Implementación de
// la grilla — capataz»): asistencia (motivo y salida plegables), trabajos del día, grilla de horas (obreros en columnas), foto y envío.
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
  await expect(root.locator('#tcCnt')).toHaveText('Marcados 0 de 4');
  expect((await root.locator('.tc-v').first().boundingBox()).height).toBeGreaterThanOrEqual(44);
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('¿Quién vino?');
  await expect(root.locator('.tc-ob.need')).toHaveCount(4);
  // «No vino» marca la ausencia sin desplegar los motivos; el enlace pequeño los despliega y se pliega al elegir
  const dan = root.locator('.tc-ob[data-dni="40000004"]');
  await dan.locator('[data-tca="novino"]').click();
  await expect(dan).toHaveClass(/off/);
  await expect(dan.locator('.tc-mot')).toHaveCount(0);
  await expect(dan.locator('[data-tca="motT"]')).toHaveText(/Motivo \(opcional\)/);
  await dan.locator('[data-tca="motT"]').click();
  await expect(dan.locator('.tc-mot')).toHaveCount(9);
  await dan.locator('[data-tca="mot"][data-v="DM"]').click();
  await expect(dan.locator('.tc-mot')).toHaveCount(0);
  await expect(dan.locator('[data-tca="motT"]')).toContainText('Motivo: Descanso médico');
  await root.locator('[data-tca="todos"]').click();
  await expect(root.locator('#tcCnt')).toHaveText('Marcados 4 de 4');
  // Carlos salió a otra hora (plegable) y Ana trabajó en altura
  const car = root.locator('.tc-ob[data-dni="40000003"]');
  await car.locator('[data-tca="salT"]').click();
  await car.locator('input[data-tca="sal"]').fill('15:00');
  await expect(car.locator('[data-tca="salT"]')).toContainText('Salió a las 15:00');
  await expect(car.locator('input[data-tca="sal"]')).toHaveCount(0);
  await root.locator('.tc-ob[data-dni="40000001"] input[data-tca="alt"]').check();
  await expect.poll(async () => (await dbDoc(page)).st).toBe('bor');
  expect((await dbDoc(page)).modo).toBe('hrs');
  await shot(page, '1-asistencia');

  // paso 2: trabajos del día con buscador (la bloqueada no sale), reordenar y quitar
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await expect(root.locator('.tc-h h2')).toHaveText('Trabajos del día');
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

  // paso 3: grilla con los que vinieron en columnas y las partidas en filas
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await expect(root.locator('#tcGrid')).toBeVisible();
  await expect(root.locator('.tc-gn')).toHaveCount(3);
  await expect(root.locator('.tc-gn[data-dni="40000004"]')).toHaveCount(0);
  await expect(root.locator('.tc-g tbody tr')).toHaveCount(2);
  await expect(root.locator('#tcJorH')).toHaveText('Jornada del día: 8,5 h');
  // «Toda la jornada» en encofrado: a cada uno lo que le falta → todos en verde
  await root.locator('tr[data-pc="p10_05"] [data-tca="rowAll"]').click();
  await expect(cell(root, '40000001', 'p10_05')).toHaveText('8,5');
  await expect(root.locator('.tc-gt.ok')).toHaveCount(3);
  // Beto hizo 2 h más en tarrajeo: total ámbar con «+2 HE»
  await cell(root, '40000002', 'p20_01').click();
  await expect(root.locator('#tcCell')).toBeVisible();
  await root.locator('#tcCell [data-tca="cellSet"][data-v="2"]').click();
  await expect(root.locator('#tcCell')).toHaveCount(0);
  await expect(total(root, '40000002')).toHaveClass(/warn/);
  await expect(total(root, '40000002')).toContainText('+2 HE');
  // Carlos: 4 h de encofrado (ámbar, faltan 4,5) y el resto de su jornada en tarrajeo (verde)
  await cell(root, '40000003', 'p10_05').click();
  await expect(root.locator('#tcCv')).toHaveText('8,5 h');
  await root.locator('#tcCell [data-tca="cellSet"][data-v="4"]').click();
  await expect(total(root, '40000003')).toHaveClass(/warn/);
  await expect(total(root, '40000003')).toContainText('faltan 4,5');
  await cell(root, '40000003', 'p20_01').click();
  await root.locator('#tcCell [data-tca="cellSet"]', { hasText: 'Resto de su jornada' }).click();
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
  // columna de partidas y fila de nombres fijas al desplazar la grilla
  const g = root.locator('#tcGrid');
  await g.evaluate(el => { el.scrollLeft = 400; el.scrollTop = 400; });
  const gb = await g.boundingBox(), pb = await root.locator('tr[data-pc="p10_05"] .tc-gp').boundingBox(), nb = await root.locator('.tc-gn').first().boundingBox();
  expect(Math.abs(pb.x - gb.x)).toBeLessThan(3);
  expect(Math.abs(nb.y - gb.y)).toBeLessThan(3);
  await g.evaluate(el => { el.scrollLeft = 0; el.scrollTop = 0; });
  await shot(page, '4-grilla-vertical');
  // en vertical, el aviso «Gira el celular» (descartable y recordado)
  await expect(root.locator('#tcRot')).toBeVisible();
  await root.locator('[data-tca="rotX"]').click();
  await expect(root.locator('#tcRot')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('lps.tcrot'))).toBe('1');

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
  expect(r['40000003']).toMatchObject({ as: true, sal: '15:00', h: { p10_05: 4, p20_01: 4.5 }, trab: 8.5, ext: 0, fin: '15:00' });
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
  // pantalla completa: sin barra superior, pestañas, encabezado del tareo ni barra inferior
  await expect(page.locator('.top')).toBeHidden();
  await expect(page.locator('#bnav')).toBeHidden();
  await expect(root.locator('.tc-head')).toBeHidden();
  await expect(root.locator('#tcRot')).toBeHidden(); // el aviso de girar solo sale en vertical
  const gb = await root.locator('#tcGrid').boundingBox();
  expect(gb.width).toBeGreaterThan(800);
  expect(gb.height).toBeGreaterThan(220);
  await expect(root.locator('.tc-foot')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(844);
  // llenar: «Toda la jornada» en encofrado y 2 h de tarrajeo a Hugo
  await root.locator('tr[data-pc="p10_05"] [data-tca="rowAll"]').click();
  await expect(root.locator('.tc-gt.ok')).toHaveCount(10);
  await shot(page, '6-grilla-echado');
  await cell(root, '40000108', 'p20_01').click();
  await page.waitForTimeout(400); // la hoja entra desde abajo
  const cs = await root.locator('#tcCell').boundingBox();
  expect(cs.y).toBeGreaterThanOrEqual(0);
  expect(cs.y + cs.height).toBeLessThanOrEqual(391);
  await shot(page, '7-celda-echado');
  await root.locator('#tcCell [data-tca="cellSet"][data-v="2"]').click();
  await expect(total(root, '40000108')).toContainText('+2 HE');
  // al desplazar a la derecha la columna de partidas sigue a la vista
  await root.locator('#tcGrid').evaluate(el => { el.scrollLeft = el.scrollWidth; });
  const pb = await root.locator('tr[data-pc="p20_01"] .tc-gp').boundingBox();
  expect(Math.abs(pb.x - gb.x)).toBeLessThan(3);
  await expect.poll(async () => (await dbDoc(page)).rows['40000108'].h).toEqual({ p10_05: 8.5, p20_01: 2 });
  // al volver a vertical reaparecen la barra y el encabezado, y el aviso de girar
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(root.locator('.tc-head')).toBeVisible();
  await expect(root.locator('#tcRot')).toBeVisible();
  // fuera de la grilla (paso 4), echado no oculta nada
  await root.locator('.tc-foot [data-tcs="4"]').click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(root.locator('.tc-head')).toBeVisible();
  noErrors(errors, 'grilla echada');
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
  await expect(root.locator('.tc-sum[data-dni="40000001"]')).toContainText('7:30–18:00');
  await expect(root.locator('.tc-sum[data-dni="40000001"]')).toContainText('9,5 h');
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
  // ayer (antiguo, enviado): solo lectura con su horario
  await root.locator(`[data-tcd="${AYER}"]`).click();
  await expect(root.locator('#tcSentB')).toContainText('Enviado ✓');
  await expect(root.locator('#tcOld')).toHaveCount(0);
  await expect(root.locator('.tc-sum[data-dni="40000001"]')).toContainText('7:30–18:00');
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
  await expect(root.locator(`[data-tcd="${AYER}"]`)).toContainText('Enviado ✓');
  await root.locator('[data-tca="todos"]').click();
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await expect(root.locator('[data-tca="copy"]')).toContainText('(2)');
  await root.locator('[data-tca="copy"]').click();
  await expect.poll(async () => (await dbDoc(page)).pcs).toEqual(['p10_06', 'p20_01']); // la de andamios (bloqueada) no se copia
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await root.locator('[data-tca="copyH"]').click();
  await expect(cell(root, '40000002', 'p10_06')).toHaveText('6');
  await expect(root.locator('[data-tca="copyH"]')).toHaveCount(0);
  await expect(root.locator('.tc-gt.ok')).toHaveCount(4); // 6 + 2,5 = 8,5 h (las de andamios no se copian)
  await expect.poll(async () => (await dbDoc(page)).rows['40000003'].h).toEqual({ p10_06: 6, p20_01: 2.5 });
  // con un obrero que ayer no estuvo, ya no se ofrece copiar las horas
  await root.locator('.tc-steps [data-tcs="1"]').click();
  await root.locator('[data-tca="addOn"]').click();
  await root.locator('#tcAddQ').fill('zega');
  await root.locator('[data-tca="add"][data-v="40000009"]').click();
  await root.locator('.tc-steps [data-tcs="3"]').click();
  await expect(root.locator('.tc-gn')).toHaveCount(5);
  await expect(root.locator('[data-tca="copyH"]')).toHaveCount(0);
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
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...oneCrew(), ['tareo', ID, readyDoc(HOY, { foto: [`${ID}_1`], rows: { '40000001': fullRow('ALVA ROJAS', 'ANA', { p10_05: 6 }) } })], ['tfot', `${ID}_1`, { date: HOY, cap: CAP, n: 1, d: 'data:image/png;base64,iVBORw0KGgo=' }]] });
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
  const pc = root.locator('#tcPorCor');
  await expect(pc).toContainText('Por corregir (1)');
  await expect(pc).toContainText('La tarde fue en 10.06');
  await pc.locator(`[data-tcd="${V}"]`).click();
  await expect(root.locator(`.tc-date.on[data-tcd="${V}"]`)).toBeVisible();
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
  await root.locator('#tcCell [data-tca="cellSet"]', { hasText: 'Resto de su jornada' }).click();
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
  await expect(root.locator('#tcPorCor')).toHaveCount(0);
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
  await expect(dan).toContainText('Motivo (opcional)');
  await expect(dan.locator('.tc-err')).toHaveCount(0);
  // tocar el motivo elegido lo quita
  await dan.locator('[data-tca="motT"]').click();
  await dan.locator('[data-tca="mot"][data-v="VA"]').click();
  await expect(dan.locator('[data-tca="motT"]')).toContainText('Vacaciones');
  await dan.locator('[data-tca="motT"]').click();
  await dan.locator('[data-tca="mot"][data-v="VA"]').click();
  await expect(dan.locator('[data-tca="motT"]')).toHaveText(/Motivo \(opcional\)/);
  // de otro capataz: confirmación clara y etiqueta ámbar
  await root.locator('[data-tca="addOn"]').click();
  await root.locator('#tcAddQ').fill('zega');
  await expect(root.locator('#tcAddL')).toContainText('de ');
  await root.locator('[data-tca="add"][data-v="40000009"]').click();
  expect(msgs.pop()).toMatch(/ZEGARRA LUNA, ZOE no es de tu cuadrilla \(es de .+\)\. ¿Lo tareas igual\?/);
  await expect(root.locator('.tc-ob[data-dni="40000009"] .tc-aj')).toHaveText('No es de tu cuadrilla');
  // sin capataz
  await root.locator('[data-tca="addOn"]').click();
  await root.locator('#tcAddQ').fill('solis');
  await expect(root.locator('#tcAddL')).toContainText('sin capataz');
  await root.locator('[data-tca="add"][data-v="40000010"]').click();
  expect(msgs.pop()).toContain('no es de tu cuadrilla (es sin capataz)');
  await expect(root.locator('.tc-aj')).toHaveCount(2);
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
