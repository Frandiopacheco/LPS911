// Tareo del capataz en el celular (docs/ia/tareo.md «Contrato de F1» y «Mejoras del capataz (oct 2026)»):
// asistencia explícita, trabajos por bloques con atajos, cruces, partidas bloqueadas, foto y envío.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const CAP = 'tcap@obra.pe';
const ID = `${HOY}_${CAP}`;
const ob = (dni, ape, nom, cap, cat = 'OP') => ['tper', dni, { dni, ape, nom, pue: 'OPERARIO', cat, cua: 'ALBAÑILES', cap, ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true }];
const EXTRA = [
  ob('40000001', 'ALVA ROJAS', 'ANA', CAP),
  ob('40000002', 'BRAVO DIAZ', 'BETO', CAP),
  ob('40000003', 'CASTRO PAZ', 'CARLOS', CAP, 'PE'),
  ob('40000004', 'DAVILA SOTO', 'DANIEL', CAP, 'OF'),
  ob('40000009', 'ZEGARRA LUNA', 'ZOE', 'otro@obra.pe'),
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de muros', und: 'm2', act: true, ord: 1 }],
  ['tpc', 'p10_06', { cod: '10.06', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Vaciado de concreto', und: 'm3', act: true, ord: 2 }],
  ['tpc', 'p20_01', { cod: '20.01', grp: '20', grpN: 'ARQUITECTURA', nom: 'Tarrajeo de muros', und: 'm2', act: true, ord: 3 }],
  ['tpc', 'p30_01', { cod: '30.01', grp: '30', grpN: 'VARIOS', nom: 'Andamios', und: 'glb', act: true, ord: 4, bloq: true }],
];
const dbDoc = (page, id = ID) => page.evaluate(i => window.__dbGet('tareo', i) || {}, id);
/* foto de prueba: PNG pequeño dibujado en el navegador */
const png = async page => Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 40, 30); return c.toDataURL('image/png').split(',')[1]; }), 'base64');

test('capataz: asistencia explícita, no vino ↔ vino conserva horas, foto, envío y reapertura', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: EXTRA });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  const root = page.locator('#tcRoot');
  await expect(root).toBeVisible();

  // paso 1: su cuadrilla (solo los suyos), numerada y nadie marcado
  const rows = root.locator('.tc-ob');
  await expect(rows).toHaveCount(4);
  await expect(root).not.toContainText('ZEGARRA');
  await expect(root.locator('.tc-date.on')).toContainText('Hoy');
  await expect(root.locator('.tc-ob.sin')).toHaveCount(4);
  await expect(root.locator('.tc-n').first()).toHaveText('1');
  await expect(root.locator('#tcCnt')).toHaveText('Marcados 0 de 4');
  // botones grandes para el dedo
  expect((await root.locator('.tc-v').first().boundingBox()).height).toBeGreaterThanOrEqual(44);
  // sin marcar no pasa al paso 2: señala a quién falta
  await expect(root.locator('.tc-foot [data-tcs="2"]')).toContainText('Falta marcar a 4');
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('¿Quién vino?');
  await expect(root.locator('.tc-ob.need')).toHaveCount(4);
  // Daniel no vino por descanso médico
  const dan = root.locator('.tc-ob[data-dni="40000004"]');
  await dan.locator('[data-tca="novino"]').click();
  await expect(dan).toHaveClass(/off/);
  await expect(dan).toContainText('Elige el motivo');
  await dan.locator('[data-tca="mot"][data-v="DM"]').click();
  await expect(dan.locator('.tc-mot.on')).toContainText('DM');
  await expect(root.locator('#tcCnt')).toHaveText('Marcados 1 de 4');
  // «Todos vinieron» marca a los que faltan, sin tocar a Daniel
  await root.locator('[data-tca="todos"]').click();
  await expect(root.locator('#tcCnt')).toHaveText('Marcados 4 de 4');
  await expect(root.locator('.tc-ob.si')).toHaveCount(3);
  await expect(dan).toHaveClass(/off/);
  await expect(root.locator('[data-tca="todos"]')).toHaveCount(0);
  // Ana trabajó en altura
  await root.locator('.tc-ob[data-dni="40000001"] input[data-tca="alt"]').check();

  // se guarda solo como borrador
  await expect.poll(async () => (await dbDoc(page)).st).toBe('bor');
  await expect(root.locator('#tcSt')).toHaveText('Guardado');

  // paso 2: mañana a todos (encofrado)
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await root.locator('[data-tca="new"]').click();
  await root.locator('#tcPcQ').fill('encof');
  await root.locator('[data-tca="pc"][data-v="p10_05"]').click();
  await root.locator('[data-tca="sc"][data-v="man"]').click();
  await expect(root.locator('#tcIni')).toHaveValue('07:30');
  await expect(root.locator('#tcFin')).toHaveValue('12:00');
  await expect(root.locator('.tc-pp.on')).toHaveCount(3); // los 3 que vinieron
  await root.locator('[data-tca="edOk"]').click();
  await expect(root.locator('.tc-blq')).toHaveCount(1);
  // a todos les faltan horas: en rojo, con su línea de tiempo
  await expect(root.locator('.tc-bar.bad')).toHaveCount(3);
  await expect(root.locator('.tc-bar[data-dni="40000001"] .tc-seg')).toHaveCount(1);

  // tarde: tarrajeo, sin Carlos (el nuevo trabajo ya empieza después del refrigerio)
  await root.locator('[data-tca="new"]').click();
  await expect(root.locator('#tcIni')).toHaveValue('13:00');
  await expect(root.locator('#tcFin')).toHaveValue('17:00');
  await root.locator('#tcPcQ').fill('20.01');
  await root.locator('[data-tca="pc"][data-v="p20_01"]').click();
  await root.locator('[data-tca="sc"][data-v="tar"]').click();
  await root.locator('[data-tca="who"][data-v="40000003"]').click();
  await expect(root.locator('.tc-pp.on')).toHaveCount(2);
  await root.locator('[data-tca="edOk"]').click();
  await expect(root.locator('.tc-blq')).toHaveCount(2);
  await expect(root.locator('.tc-bar.ok')).toHaveCount(2);
  await expect(root.locator('.tc-bar[data-dni="40000003"]')).toHaveClass(/bad/);

  // Ana «no vino»: sigue en sus trabajos (tachada) con 0 h; al volver a «vino» recupera sus horas
  await root.locator('.tc-foot [data-tcs="1"]').click();
  const ana = root.locator('.tc-ob[data-dni="40000001"]');
  await ana.locator('[data-tca="novino"]').click();
  await ana.locator('[data-tca="mot"][data-v="FA"]').click();
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await expect(root.locator('.tc-bar[data-dni="40000001"]')).toHaveCount(0);
  await expect(root.locator('.tc-blq').first()).toContainText('no vino');
  await root.locator('.tc-blq').first().locator('[data-tca="edit"]').click();
  await expect(root.locator('.tc-pp.nv')).toContainText('no vino');
  await root.locator('[data-tca="edCancel"]').click();
  await expect.poll(async () => { const d = await dbDoc(page); const a = (d.rows || {})['40000001'] || {}; return [a.as, a.trab, ((d.blq || [])[0] || {}).dnis?.includes('40000001')]; }).toEqual([false, 0, true]);
  await root.locator('.tc-foot [data-tcs="1"]').click();
  await ana.locator('[data-tca="vino"]').click();
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await expect(root.locator('.tc-bar[data-dni="40000001"]')).toHaveClass(/ok/);
  await expect(root.locator('.tc-bar[data-dni="40000001"]')).toContainText(/8[.,]5 h/);

  // paso 3: sin foto no se puede enviar
  await root.locator('.tc-foot [data-tcs="3"]').click();
  const send = root.locator('#tcSend');
  await expect(send).toBeDisabled();
  await expect(root).toContainText('Toma una foto del formato');
  await expect(root.locator('.tc-sum .tc-tl')).toHaveCount(3);
  await root.locator('#tcFile').setInputFiles({ name: 'formato.png', mimeType: 'image/png', buffer: await png(page) });
  await expect(root.locator('.tc-th')).toHaveCount(1);
  await expect(send).toBeEnabled();
  await expect(send).toHaveText('Enviar tareo');
  await send.click();

  await expect.poll(async () => (await dbDoc(page)).st).toBe('env');
  const doc = await dbDoc(page);
  expect(doc).toMatchObject({ date: HOY, cap: CAP, envBy: CAP });
  expect(doc.hist.map(h => h.a)).toEqual(['env']);
  expect(doc.blq).toHaveLength(2);
  const r = doc.rows;
  expect(r['40000001']).toMatchObject({ as: true, mot: '', ini: '07:30', fin: '17:00', trab: 8.5, ext: 0, h: { p10_05: 4.5, p20_01: 4 } });
  expect(r['40000002']).toMatchObject({ as: true, alt: false, trab: 8.5, h: { p10_05: 4.5, p20_01: 4 } });
  expect(r['40000003']).toMatchObject({ as: true, ini: '07:30', fin: '12:00', trab: 4.5, ext: 0, h: { p10_05: 4.5 } });
  expect(r['40000004']).toMatchObject({ as: false, mot: 'DM', trab: 0 });
  expect(doc.foto).toHaveLength(1);
  const foto = await page.evaluate(id => window.__dbGet('tfot', id), doc.foto[0]);
  expect(doc.foto[0]).toBe(`${ID}_1`);
  expect(foto).toMatchObject({ date: HOY, cap: CAP, n: 1 });
  expect(foto.d).toMatch(/^data:image\/jpeg;base64,/);

  // enviado: solo lectura
  await expect(root.locator('.tc-sent')).toContainText('Enviado');
  await expect(root.locator('.tc-foot')).toHaveCount(0);
  await expect(root.locator('#tcFile')).toHaveCount(0);

  // el asistente lo reabre: vuelve a editable con el motivo a la vista
  await page.evaluate(id => fcol('tareo').doc(id).update({ st: 'reab', reab: { t: 1, by: 'tasis@obra.pe', mot: 'Carlos también vino en la tarde' } }), ID);
  await expect(root.locator('.tc-reab')).toContainText('Carlos también vino en la tarde');
  await expect(root.locator('.tc-steps')).toBeVisible();
  await expect(root.locator('.tc-foot')).toBeVisible();
  await root.locator('[data-tcs="1"]').first().click();
  await expect(root.locator('.tc-ob [data-tca="vino"]').first()).toBeEnabled();
  noErrors(errors, 'tareo del capataz');
});

test('capataz: atajos +2 h / +3 h / Extendido, cruce al crear resuelto con «Ajustar» y partida bloqueada oculta', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: EXTRA });
  const root = page.locator('#tcRoot');
  await root.locator('[data-tca="todos"]').click();
  await root.locator('.tc-foot [data-tcs="2"]').click();

  // partida bloqueada por costos: no aparece en el buscador
  await root.locator('[data-tca="new"]').click();
  await root.locator('#tcPcQ').fill('andam');
  await expect(root.locator('#tcPcL')).toContainText('Ninguna partida');
  await root.locator('#tcPcQ').fill('30.01');
  await expect(root.locator('[data-tca="pc"]')).toHaveCount(0);
  await root.locator('#tcPcQ').fill('encof');
  await root.locator('[data-tca="pc"][data-v="p10_05"]').click();
  // +2 h desde el inicio de la jornada
  await root.locator('[data-tca="sc"][data-v="p2"]').click();
  await expect(root.locator('#tcIni')).toHaveValue('07:30');
  await expect(root.locator('#tcFin')).toHaveValue('09:30');
  await root.locator('[data-tca="edOk"]').click();

  // un trabajo que se cruza: chips en rojo con el otro horario, y «Ajustar este» lo arregla en un toque
  await root.locator('[data-tca="new"]').click();
  await root.locator('#tcPcQ').fill('10.06');
  await root.locator('[data-tca="pc"][data-v="p10_06"]').click();
  await root.locator('#tcIni').fill('08:00');
  await root.locator('#tcFin').fill('12:00');
  await expect(root.locator('.tc-pp.cx')).toHaveCount(4);
  await expect(root.locator('.tc-pp.cx').first()).toContainText('se cruza con 10.05 7:30–9:30');
  await root.locator('[data-tca="edOk"]').click();
  await expect(root.locator('.tc-errb')).toContainText('se cruzan');
  await root.locator('[data-tca="cxEste"]').click();
  await expect(root.locator('#tcIni')).toHaveValue('09:30');
  await expect(root.locator('.tc-pp.cx')).toHaveCount(0);
  await root.locator('[data-tca="edOk"]').click();
  await expect(root.locator('.tc-blq')).toHaveCount(2);

  // +3 h empieza donde terminó el último (12:00) y salta el refrigerio
  await root.locator('[data-tca="new"]').click();
  await expect(root.locator('[data-tca="sc"][data-v="p3"]')).toContainText('13:00–16:00');
  // Extendido: desde el fin de la jornada hasta las 19:00 (editable)
  await root.locator('#tcPcQ').fill('20.01');
  await root.locator('[data-tca="pc"][data-v="p20_01"]').click();
  await root.locator('[data-tca="sc"][data-v="ext"]').click();
  await expect(root.locator('#tcIni')).toHaveValue('17:00');
  await expect(root.locator('#tcFin')).toHaveValue('19:00');
  await root.locator('#tcFin').fill('18:30');
  await root.locator('[data-tca="edOk"]').click();
  await expect.poll(async () => ((await dbDoc(page)).blq || []).map(b => `${b.pc} ${b.ini}-${b.fin}`)).toEqual(['p10_05 07:30-09:30', 'p10_06 09:30-12:00', 'p20_01 17:00-18:30']);
  noErrors(errors, 'atajos y cruces');
});

test('capataz: cruce en la línea de tiempo, «Revisar y enviar» lleva al cruce y la partida bloqueada no deja enviar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  const row = (ape, nom) => ({ ape, nom, cat: 'OP', cua: '', as: true, mot: '', alt: false, ini: '', fin: '', h: {}, trab: 0, ext: 0 });
  const extra = [...EXTRA.filter(x => x[0] !== 'tper'), ob('40000001', 'ALVA ROJAS', 'ANA', CAP), ob('40000002', 'BRAVO DIAZ', 'BETO', CAP),
    ['tareo', ID, { date: HOY, cap: CAP, st: 'bor', foto: [], hist: [], rows: { '40000001': row('ALVA ROJAS', 'ANA'), '40000002': row('BRAVO DIAZ', 'BETO') },
      blq: [{ id: 'a', pc: 'p10_05', ini: '07:30', fin: '12:00', dnis: ['40000001', '40000002'] },
        { id: 'b', pc: 'p10_06', ini: '11:00', fin: '17:00', dnis: ['40000001'] },
        { id: 'c', pc: 'p30_01', ini: '13:00', fin: '17:00', dnis: ['40000002'] }] }]];
  const errors = await openApp(page, { as: 'tcap', editar: false, extra });
  const root = page.locator('#tcRoot');
  await root.locator('.tc-foot [data-tcs="2"]').click();
  // la partida bloqueada se ve en rojo
  await expect(root.locator('.tc-blq[data-bid="c"]')).toHaveClass(/bad/);
  await expect(root.locator('.tc-blq[data-bid="c"]')).toContainText('Partida bloqueada por costos: cámbiala');
  // cruce marcado en la línea de tiempo de Ana
  const ana = root.locator('.tc-bar[data-dni="40000001"]');
  await expect(ana.locator('.tc-cxb')).toHaveCount(1);
  await expect(ana.locator('.tc-cxl')).toContainText('Se cruzan 10.05 7:30–12:00 y 10.06 11:00–17:00');
  // «Revisar y enviar» no avanza: abre las opciones del primer cruce
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('¿En qué trabajaron?');
  await expect(ana.locator('.tc-cxp')).toBeVisible();
  await ana.locator('[data-tca="tlIni"]').click();
  await expect(ana.locator('.tc-cxb')).toHaveCount(0);
  await expect.poll(async () => (await dbDoc(page)).blq.find(b => b.id === 'b').ini).toBe('12:00');
  // ahora lleva a la partida bloqueada; se cambia y recién pasa al paso 3
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('¿En qué trabajaron?');
  await root.locator('.tc-blq[data-bid="c"] [data-tca="edit"]').click();
  await expect(root.locator('#tcPcQ')).toBeVisible(); // la partida bloqueada se quita: hay que elegir otra
  await root.locator('#tcPcQ').fill('20.01');
  await root.locator('[data-tca="pc"][data-v="p20_01"]').click();
  await root.locator('[data-tca="edOk"]').click();
  await expect(root.locator('.tc-blq.bad')).toHaveCount(0);
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Revisar y enviar');
  await expect(root.locator('#tcSend')).toHaveText('Falta la foto');
  noErrors(errors, 'cruce en la línea de tiempo');
});

test('capataz sin obreros asignados: mensaje claro', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: EXTRA.filter(x => x[0] !== 'tper' || x[2].cap !== CAP) });
  const root = page.locator('#tcRoot');
  await expect(root.locator('.tc-none')).toContainText('No tienes obreros asignados');
  await expect(root.locator('.tc-none')).toContainText('Pide a la oficina que te los asigne en Personal');
  await expect(root.locator('[data-tca="addOn"]')).toBeVisible();
  noErrors(errors, 'sin obreros');
});

test('capataz: copia los trabajos de ayer y agrega un obrero de otro capataz', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  const AYER = '2026-09-30';
  const extra = [...EXTRA, ['tareo', `${AYER}_${CAP}`, { date: AYER, cap: CAP, st: 'env', rows: {}, foto: [], hist: [],
    blq: [{ id: 'x1', pc: 'p10_06', ini: '07:30', fin: '17:00', dnis: ['40000001', '40000002', '40000003', '40000004'] },
      { id: 'x2', pc: 'p30_01', ini: '17:00', fin: '18:00', dnis: ['40000001'] }] }]];
  const errors = await openApp(page, { as: 'tcap', editar: false, extra });
  const root = page.locator('#tcRoot');
  // ayer ya se envió: no se puede elegir
  await expect(root.locator(`[data-tcd="${AYER}"]`)).toBeDisabled();
  await root.locator('[data-tca="addOn"]').click();
  await root.locator('#tcAddQ').fill('zega');
  await root.locator('[data-tca="add"][data-v="40000009"]').click();
  await expect(root.locator('.tc-ob')).toHaveCount(5);
  await expect(root.locator('.tc-ob[data-dni="40000009"]')).toHaveClass(/si/); // agregado = vino
  await root.locator('[data-tca="todos"]').click();
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await root.locator('[data-tca="copy"]').click();
  await expect(root.locator('.tc-blq')).toHaveCount(1); // la de andamios (bloqueada) no se copia
  await expect(root.locator('.tc-bar.ok')).toHaveCount(4);
  await expect(root.locator('.tc-bar[data-dni="40000009"]')).toHaveClass(/bad/);
  await expect.poll(async () => ((await dbDoc(page)).blq || []).length).toBe(1);
  // en PC (ver como capataz) se ve centrado, como celular
  await page.setViewportSize({ width: 1280, height: 800 });
  const w = (await root.boundingBox()).width;
  expect(w).toBeLessThanOrEqual(482);
  noErrors(errors, 'copiar trabajos');
});

// ── Auditoría F2 (docs/ia/tareo.md «Correcciones de la auditoría F2 — capataz») ──
const fullRow = (ape, nom) => ({ ape, nom, cat: 'OP', cua: '', as: true, mot: '', alt: false, ini: '', fin: '', h: {}, trab: 0, ext: 0 });
const readyDoc = (date, extra = {}) => ({ date, cap: CAP, st: 'bor', foto: [], hist: [], rows: { '40000001': fullRow('ALVA ROJAS', 'ANA') },
  blq: [{ id: 'a', pc: 'p10_05', ini: '07:30', fin: '12:00', dnis: ['40000001'] }, { id: 'b', pc: 'p20_01', ini: '13:00', fin: '17:00', dnis: ['40000001'] }], ...extra });
const oneCrew = () => [...EXTRA.filter(x => x[0] !== 'tper'), ob('40000001', 'ALVA ROJAS', 'ANA', CAP)];
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
  const root = page.locator('#tcRoot');
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await expect(root.locator('.tc-step.on')).toContainText('Revisar y enviar');
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

test('F2 capataz: si el servidor rechaza el envío vuelve a borrador con el error; avisos «warn» no bloquean; guarda la jornada del día', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: [...oneCrew(), ['tareo', ID, readyDoc(HOY, { foto: [`${ID}_1`] })], ['tfot', `${ID}_1`, { date: HOY, cap: CAP, n: 1, d: 'data:image/png;base64,iVBORw0KGgo=' }]] });
  const root = page.locator('#tcRoot');
  await expect(root.locator('.tc-steps')).toBeVisible();
  await page.evaluate(() => {
    const o = tValida; window.tValida = d => [...o(d), { dni: '40000001', k: 'parc', warn: true, msg: 'Jornada parcial: ALVA ROJAS (4,5 h de 8,5 h).' }];
    if (typeof tCfgDia !== 'function') window.tCfgDia = f => ({ f, prueba: true });
  });
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await expect(root.locator('#tcWarns')).toContainText('Jornada parcial: ALVA ROJAS');
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
  expect(d.cfg).toBeTruthy();
  expect(d.hist.map(h => h.a)).toEqual(['env']);
  noErrors(errors, 'rechazo del envío');
});

test('F2 capataz: «Por corregir» lista los reabiertos de cualquier fecha; se corrige sin tocar el cotejo de la oficina', async ({ page }) => {
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
  // corrige: la tarde pasa a 10.06
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await root.locator('.tc-blq[data-bid="b"] [data-tca="edit"]').click();
  await root.locator('[data-tca="pcX"]').click();
  await root.locator('#tcPcQ').fill('10.06');
  await root.locator('[data-tca="pc"][data-v="p10_06"]').click();
  await root.locator('[data-tca="edOk"]').click();
  await expect.poll(async () => ((await dbDoc(page, VID)).blq || []).find(b => b.id === 'b')?.pc).toBe('p10_06');
  let d = await dbDoc(page, VID);
  expect(d.cot).toEqual(cot);
  expect(d.cotFot).toEqual([`${VID}_1`]);
  await root.locator('.tc-foot [data-tcs="3"]').click();
  await root.locator('#tcSend').click();
  await expect(root.locator('#tcSentB')).toContainText('Enviado ✓');
  d = await dbDoc(page, VID);
  expect(d.st).toBe('env');
  expect(d.cot).toEqual(cot);
  expect(d.hist.map(h => h.a)).toEqual(['env', 'reab', 'env']);
  await expect(root.locator('#tcPorCor')).toHaveCount(0);
  noErrors(errors, 'por corregir');
});
