// Tareo del capataz en el celular (fase 1, docs/ia/tareo.md «Contrato de F1»): asistencia, trabajos por bloques, foto y envío.
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
];
/* foto de prueba: PNG pequeño dibujado en el navegador */
const png = async page => Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; const g = c.getContext('2d'); g.fillStyle = '#c33'; g.fillRect(0, 0, 40, 30); return c.toDataURL('image/png').split(',')[1]; }), 'base64');

test('capataz: asistencia, dos trabajos, foto obligatoria, envío y reapertura', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tcap', editar: false, extra: EXTRA });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  const root = page.locator('#tcRoot');
  await expect(root).toBeVisible();

  // paso 1: su cuadrilla precargada (solo los suyos), todos «vino»
  const rows = root.locator('.tc-ob');
  await expect(rows).toHaveCount(4);
  await expect(root).not.toContainText('ZEGARRA');
  await expect(root.locator('.tc-date.on')).toContainText('Hoy');
  // botones grandes para el dedo
  expect((await root.locator('.tc-as').first().boundingBox()).height).toBeGreaterThanOrEqual(44);
  // Daniel faltó por descanso médico
  const dan = root.locator('.tc-ob[data-dni="40000004"]');
  await dan.locator('[data-tca="as"]').click();
  await expect(dan).toHaveClass(/off/);
  await expect(dan).toContainText('Elige el motivo');
  await dan.locator('[data-tca="mot"][data-v="DM"]').click();
  await expect(dan.locator('.tc-mot.on')).toContainText('DM');
  // Ana trabajó en altura
  await root.locator('.tc-ob[data-dni="40000001"] input[data-tca="alt"]').check();

  // se guarda solo como borrador
  await expect.poll(() => page.evaluate(id => (window.__dbGet('tareo', id) || {}).st, ID)).toBe('bor');
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
  // a todos les faltan horas: barras en rojo
  await expect(root.locator('.tc-bar.bad')).toHaveCount(3);

  // tarde: tarrajeo, sin Carlos
  await root.locator('[data-tca="new"]').click();
  await root.locator('#tcPcQ').fill('20.01');
  await root.locator('[data-tca="pc"][data-v="p20_01"]').click();
  await root.locator('[data-tca="sc"][data-v="tar"]').click();
  await root.locator('[data-tca="who"][data-v="40000003"]').click();
  await expect(root.locator('.tc-pp.on')).toHaveCount(2);
  await root.locator('[data-tca="edOk"]').click();
  await expect(root.locator('.tc-blq')).toHaveCount(2);
  await expect(root.locator('.tc-bar.ok')).toHaveCount(2);
  await expect(root.locator('.tc-bar[data-dni="40000003"]')).toHaveClass(/bad/);

  // paso 3: sin foto no se puede enviar
  await root.locator('.tc-foot [data-tcs="3"]').click();
  const send = root.locator('#tcSend');
  await expect(send).toBeDisabled();
  await expect(root).toContainText('Toma una foto del formato');
  await root.locator('#tcFile').setInputFiles({ name: 'formato.png', mimeType: 'image/png', buffer: await png(page) });
  await expect(root.locator('.tc-th')).toHaveCount(1);
  await expect(send).toBeEnabled();
  await expect(send).toHaveText('Enviar tareo');
  await send.click();

  await expect.poll(() => page.evaluate(id => (window.__dbGet('tareo', id) || {}).st, ID)).toBe('env');
  const doc = await page.evaluate(id => window.__dbGet('tareo', id), ID);
  expect(doc).toMatchObject({ date: HOY, cap: CAP, envBy: CAP });
  expect(doc.hist.map(h => h.a)).toEqual(['env']);
  expect(doc.blq).toHaveLength(2);
  const r = doc.rows;
  expect(r['40000001']).toMatchObject({ as: true, alt: true, ini: '07:30', fin: '17:00', trab: 8.5, ext: 0, h: { p10_05: 4.5, p20_01: 4 } });
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
  await expect(root.locator('.tc-ob [data-tca="as"]').first()).toBeEnabled();
  noErrors(errors, 'tareo del capataz');
});

test('capataz: copia los trabajos de ayer y agrega un obrero de otro capataz', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  page.on('dialog', d => d.accept());
  const AYER = '2026-09-30';
  const extra = [...EXTRA, ['tareo', `${AYER}_${CAP}`, { date: AYER, cap: CAP, st: 'env', rows: {}, foto: [], hist: [],
    blq: [{ id: 'x1', pc: 'p10_06', ini: '07:30', fin: '17:00', dnis: ['40000001', '40000002', '40000003', '40000004'] }] }]];
  const errors = await openApp(page, { as: 'tcap', editar: false, extra });
  const root = page.locator('#tcRoot');
  // ayer ya se envió: no se puede elegir
  await expect(root.locator(`[data-tcd="${AYER}"]`)).toBeDisabled();
  await root.locator('[data-tca="addOn"]').click();
  await root.locator('#tcAddQ').fill('zega');
  await root.locator('[data-tca="add"][data-v="40000009"]').click();
  await expect(root.locator('.tc-ob')).toHaveCount(5);
  await root.locator('.tc-foot [data-tcs="2"]').click();
  await root.locator('[data-tca="copy"]').click();
  await expect(root.locator('.tc-blq')).toHaveCount(1);
  await expect(root.locator('.tc-bar.ok')).toHaveCount(4);
  await expect(root.locator('.tc-bar[data-dni="40000009"]')).toHaveClass(/bad/);
  await expect.poll(() => page.evaluate(id => ((window.__dbGet('tareo', id) || {}).blq || []).length, ID)).toBe(1);
  // en PC (ver como capataz) se ve centrado, como celular
  await page.setViewportSize({ width: 1280, height: 800 });
  const w = (await root.boundingBox()).width;
  expect(w).toBeLessThanOrEqual(482);
  noErrors(errors, 'copiar trabajos');
});
