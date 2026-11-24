// Módulo Avance (avance*.js, docs/ia/avance.md): partidas configurables, metrado por ambiente, registro diario por etapa y «Llegó».
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const P1 = { nom: 'Mobiliario', und: 'und', sum: true, ubi: [], et: [{ id: 'e1', nom: 'Instalación', peso: 100 }], items: { i1: { cod: 'EO-1', des: 'Escritorio en L', ord: 0 }, i2: { cod: 'SO-3', des: 'Silla giratoria', ord: 1 } }, peso: 30, glob: true, d0: '2026-09-21', d1: '2026-10-31', corte: '2026-09-20', ord: 0, arch: null };
const P2 = { nom: 'Pintura', und: 'm²', sum: false, ubi: ['Muro'], et: [{ id: 'e1', nom: 'Empaste', peso: 40 }, { id: 'e2', nom: '1.ª mano', peso: 30 }, { id: 'e3', nom: '2.ª mano', peso: 30 }], items: { i1: { cod: 'PL', des: 'Látex', ord: 0 } }, peso: 70, glob: true, d0: '2026-09-21', d1: '2026-10-31', corte: '2026-09-20', ord: 1, arch: null };
const extra = [
  ['avp', 'pm', P1], ['avp', 'pp', P2],
  ['avm', 'pm_p1', { p: 'pm', piso: 'p1', r: { r1: { it: 'i1', amb: 'a1', ub: '', q: 10, an: 'Dpto 101' }, r2: { it: 'i2', amb: 'a2', ub: '', q: 4, an: 'Dpto 102' } }, ll: { r1: 6 } }],
  ['avm', 'pm_p2', { p: 'pm', piso: 'p2', r: { r3: { it: 'i1', amb: 'a3', ub: '', q: 6, an: 'Dpto 103' } } }],
  ['ava', 'pm_p1_ini', { p: 'pm', piso: 'p1', w: 'ini', c: { ini: { r1: { e1: 2 } } }, log: [] }],
  ['avm', 'pp_p1', { p: 'pp', piso: 'p1', r: { q1: { it: 'i1', amb: 'a1', ub: 'Muro', q: 100, an: 'Dpto 101' } } }],
  ['ava', 'pp_p1_2026-09-28', { p: 'pp', piso: 'p1', w: '2026-09-28', c: { '2026-09-29': { q1: { e1: 100, e2: 50 } } }, log: [] }],
];
const abrir = async (page, o = {}) => { const errors = await openApp(page, { extra, ...o }); await page.evaluate(() => { U.piso = ''; goMod('ava'); }); await expect(page.locator('#main')).toHaveAttribute('data-view', 'areg'); return errors; };
const celda = (page, k) => page.locator(`.aved[data-k="${k}"]`);
const escribir = async (page, k, v) => { await celda(page, k).click(); await page.keyboard.press('Control+A'); await page.keyboard.type(String(v)); await page.keyboard.press('Tab'); };

test('Avance: cálculo del avance ponderado, por grupo y global', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const et = [{ id: 'a', peso: 40 }, { id: 'b', peso: 30 }, { id: 'c', peso: 30 }];
    const ex = { r1: { a: { ini: 60, '2026-10-01': 40 }, b: { '2026-10-02': 50 } }, r2: { a: { ini: 999 } } };
    const rows = [{ id: 'r1', q: 100, ll: 30 }, { id: 'r2', q: 60, ll: 90 }];
    return { fila: avRowPct(et, ex, rows[0]), hasta: avRowPct(et, ex, rows[0], '2026-10-01'), tope: avRowPct(et, ex, rows[1]), grupo: avGrpPct(et, ex, rows), etapa: avEtPct(ex, rows, 'a'), ll: avLlPct(rows),
      pesos: [avPesosOk(et), avPesosOk([{ peso: 50 }, { peso: 40 }])], glob: avGlobal([{ peso: 30, pct: .2, has: true }, { peso: 40, pct: .55, has: true }, { peso: 30, pct: 1, has: false }]),
      num: [avNum('6,5'), avNum('1,473.5'), avNum(' 12 '), avNum('x')], csv: avCsv('a;b\r\n"x;1";"di ""jo"""\n\n3;4') };
  });
  expect(r.fila).toBeCloseTo(0.55, 6);       // ejemplo del dueño: empaste 100 %, 1.ª mano 50 %, 2.ª mano 0 → 55 %
  expect(r.hasta).toBeCloseTo(0.40, 6);      // la curva: hasta una fecha (el corte inicial siempre cuenta)
  expect(r.tope).toBeCloseTo(0.40, 6);       // una etapa nunca pasa de 100 % aunque supere el metrado
  expect(r.grupo).toBeCloseTo((100 * 0.55 + 60 * 0.4) / 160, 6);
  expect(r.etapa).toBeCloseTo(1, 6);
  expect(r.ll).toBeCloseTo((30 + 60) / 160, 6);
  expect(r.pesos).toEqual([true, false]);
  expect(r.glob).toBeCloseTo((0.2 * 30 + 0.55 * 40) / 70, 6);   // la partida sin metrado no entra y su peso se reparte
  expect(r.num).toEqual([6.5, 1473.5, 12, 0]);
  expect(r.csv).toEqual([['a', 'b'], ['x;1', 'di "jo"'], ['3', '4']]);
  noErrors(errors, 'calculo');
});

test('Avance: el ingeniero registra el día, la celda guarda su historial y superar el metrado pide confirmar', async ({ page }) => {
  const errors = await abrir(page, { as: 'campo' });
  await expect(page.locator('#modsel [data-mod="ava"]')).toHaveCount(1);
  await expect(page.locator('tr.avrw')).toHaveCount(3);
  await expect(page.locator('tr.avpi').first()).toContainText('Primer piso');
  // campo no cambia el metrado, sí «Llegó» y los días
  await expect(celda(page, 'q|r1')).toHaveCount(0);
  await escribir(page, `c|r1|${HOY}`, 3);
  await expect.poll(() => page.evaluate(() => (__dbGet('ava', 'pm_p1_2026-09-28') || {}).c)).toEqual({ [HOY]: { r1: { e1: 3 } } });
  const log = await page.evaluate(() => __dbGet('ava', 'pm_p1_2026-09-28').log);
  expect(log).toHaveLength(1); expect(log[0]).toMatchObject({ d: HOY, r: 'r1', e: 'e1', q: 3, a: 0, by: 'campo@obra.pe' });
  // acumulado 2 (corte) + 3 = 5 de 10; llegó 6 → sin alerta
  const fila = page.locator('tr.avrw', { hasText: 'EO-1' }).first();
  await expect(fila).toContainText('50 %'); await expect(fila.locator('.avtg')).toHaveCount(0);
  // supera el metrado: cancelar no guarda; aceptar guarda y avisa
  let acepta = false; page.on('dialog', d => acepta ? d.accept() : d.dismiss());
  await escribir(page, `c|r1|${HOY}`, 20);
  await expect(celda(page, `c|r1|${HOY}`)).toHaveText('3');
  expect(await page.evaluate(() => __dbGet('ava', 'pm_p1_2026-09-28').c['2026-10-01'].r1.e1)).toBe(3);
  acepta = true; await escribir(page, `c|r1|${HOY}`, 20);
  await expect.poll(() => page.evaluate(() => __dbGet('ava', 'pm_p1_2026-09-28').c['2026-10-01'].r1.e1)).toBe(20);
  await expect(fila.locator('.avtg.w')).toContainText('supera el metrado');
  await expect(fila.locator('.avtg.b')).toContainText('más de lo llegado');
  // «Llegó» por fila
  await escribir(page, 'l|r1', 22);
  await expect.poll(() => page.evaluate(() => __dbGet('avm', 'pm_p1').ll.r1)).toBe(22);
  await expect(fila.locator('.avtg.b')).toHaveCount(0);
  // historial de la celda
  await celda(page, `c|r1|${HOY}`).click({ button: 'right' });
  await expect(page.locator('#pop .avhist')).toContainText('3 → 20');
  // un día futuro no se puede llenar
  await expect(celda(page, 'c|r1|2026-10-02')).toHaveCount(0);
  noErrors(errors, 'registro');
});

test('Avance: etapas con peso, resumen ponderado y permisos por rol', async ({ page }) => {
  const errors = await abrir(page);
  await page.selectOption('#avp', 'pp');
  await expect(page.locator('[data-ave]')).toHaveCount(4);            // 3 etapas + Resumen
  await expect(page.locator('.avtot')).toContainText('55 %');
  await page.click('[data-ave="e2"]');
  await expect(page.locator('tr.avrw').first()).toContainText('50 %');
  await page.click('[data-ave="*"]');
  await expect(page.locator('tr.avrw').first()).toContainText('55 %');
  await expect(page.locator('.aved')).toHaveCount(0);
  // el administrador corrige el metrado en la misma tabla
  await page.click('[data-ave="e1"]'); await escribir(page, 'q|q1', 200);
  await expect.poll(() => page.evaluate(() => __dbGet('avm', 'pp_p1').r.q1.q)).toBe(200);
  expect(await page.evaluate(() => __dbGet('avm', 'pp_p1').r.q1.amb)).toBe('a1');   // el resto de la fila no se toca
  noErrors(errors, 'etapas');
  for (const as of ['lector', 'sc']) { const e2 = await abrir(page, { as }); await page.selectOption('#avp', 'pm'); await expect(page.locator('tr.avrw')).toHaveCount(3); await expect(page.locator('.aved')).toHaveCount(0); await expect(page.locator('[data-av="new"]')).toHaveCount(0); noErrors(e2, as); }
});

test('Avance: crear una partida desde plantilla y agregarle una fila', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor' });
  await page.evaluate(() => { U.piso = ''; goMod('ava'); });
  await expect(page.locator('#main')).toContainText('Todavía no hay partidas');
  await page.click('[data-av="new"]'); await page.click('#pop [data-do="t1"]');
  await expect(page.locator('#avfnom')).toHaveValue('Pintura');
  await expect(page.locator('#avfsum')).toContainText('100');
  // pesos que no suman 100 no se guardan
  await page.fill('#avfep0', '50'); await expect(page.locator('#avfsum')).toContainText('110');
  await page.click('[data-avfk="ok"]'); expect(await page.evaluate(() => Object.keys(__dbAll('avp')).length)).toBe(0);
  await page.fill('#avfep0', '40'); await page.fill('#avfit', 'PL-M\tLátex muros\nPL-C;Látex cielo raso'); await page.click('[data-avfk="ok"]');
  await expect(page.locator('#lqm')).toHaveCount(0);
  const p = await page.evaluate(() => Object.values(__dbAll('avp'))[0]);
  expect(p.et.map(e => [e.nom, e.peso])).toEqual([['Empaste', 40], ['1.ª mano', 30], ['2.ª mano', 30]]);
  expect(Object.values(p.items).map(i => i.cod + '|' + i.des).sort()).toEqual(['PL-C|Látex cielo raso', 'PL-M|Látex muros']);
  expect(p.ubi).toEqual(['Muro', 'Cielo raso']);
  await page.click('[data-av="row"]'); await page.selectOption('#avrpiso', 'p1'); await page.selectOption('#avramb', 'a2'); await page.fill('#avrq', '85.5'); await page.click('[data-avrk="ok"]');
  await page.click('#lqm [data-lqx]');
  await expect(page.locator('tr.avrw')).toHaveCount(1); await expect(page.locator('tr.avam')).toContainText('Dpto 102');
  const m = await page.evaluate(() => Object.values(__dbAll('avm'))[0]);
  expect(Object.values(m.r)[0]).toMatchObject({ amb: 'a2', ub: 'Muro', q: 85.5, an: 'Dpto 102' });
  noErrors(errors, 'partida');
});

test('Avance: importar el metrado con el cuadro de equivalencias, sin crear ambientes ni duplicar', async ({ page }) => {
  const errors = await abrir(page);
  const csv = ['partida,codigo,descripcion,unidad,plano,nivel,ambiente,cantidad', 'Mobiliario,EO-1,ESCRITORIO,und,AB-02,PRIMER PISO,DPTO 101,12', 'Mobiliario,M-1,MESA CUADRADA,und,AB-02,PRIMER PISO,Depto. 102,5',
    'Mobiliario,M-1,MESA CUADRADA,und,AB-03,Piso 2,Dpto 103,2', 'Mobiliario,M-1,MESA,und,AB-03,Piso 2,Sala que no existe,7', 'Mobiliario,SO-3,SILLA,und,AB-02,Primer piso,Dpto 102,x'].join('\n');
  await page.click('[data-av="imp"]'); await page.fill('#avitxt', csv); await page.click('[data-avi="read"]');
  const go = page.locator('[data-avi="go"]');
  await expect(go).toBeDisabled();                                   // «Piso 2» y dos ambientes sin par
  await page.selectOption('[data-avn]:has(option[value="p2"]) >> nth=1', 'p2');
  await page.selectOption('[data-avia^="p1|"]', 'a2');
  await expect(go).toBeDisabled();
  await page.selectOption('[data-avia^="p2|"]', '-');                // la sala que no existe: no importar
  await expect(go).toBeEnabled(); await expect(page.locator('.avisum')).toContainText('2 filas nuevas'); await expect(page.locator('.avisum')).toContainText('1 cambian');
  await expect(page.locator('.avierr')).toContainText('1 fila con error');
  const ambs = await page.evaluate(() => Object.keys(__dbAll('ambientes')).length);
  await go.click(); await expect(page.locator('#lqm')).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(__dbAll('ambientes')).length)).toBe(ambs);
  const d = await page.evaluate(() => ({ p: __dbGet('avp', 'pm'), m1: __dbGet('avm', 'pm_p1'), m2: __dbGet('avm', 'pm_p2') }));
  const m1 = Object.entries(d.p.items).find(x => x[1].cod === 'M-1')[0];
  expect(d.m1.r.r1.q).toBe(12);                                     // la fila que ya existía cambia de metrado y conserva su id
  expect(Object.values(d.m1.r).filter(r => r.it === m1)).toMatchObject([{ amb: 'a2', q: 5 }]);
  expect(Object.values(d.m2.r).filter(r => r.it === m1)).toMatchObject([{ amb: 'a3', q: 2 }]);
  expect(Object.keys(d.m1.r)).toHaveLength(3); expect(d.m1.ll).toEqual({ r1: 6 });
  expect(d.p.eq.niv['piso 2']).toBe('p2');
  // segunda carga del mismo archivo: las equivalencias quedaron guardadas y no hay nada nuevo
  await page.click('[data-av="imp"]'); await page.fill('#avitxt', csv); await page.click('[data-avi="read"]');
  await expect(page.locator('.avisum')).toContainText('0 filas nuevas'); await expect(page.locator('.avisum')).toContainText('3 iguales'); await expect(go).toBeDisabled();
  noErrors(errors, 'importar');
});

test('Avance en el celular: piso → ambiente → ítems con la cantidad de hoy', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await abrir(page, { as: 'campo' });
  await expect(page.locator('.avcel')).toHaveCount(1);
  await page.click('.avcard[data-avamb="a1"]');
  await page.click('[data-avst="1"]'); await page.click('[data-avst="1"]');
  await expect.poll(() => page.evaluate(() => ((__dbGet('ava', 'pm_p1_2026-09-28') || {}).c || {})['2026-10-01'])).toEqual({ r1: { e1: 2 } });
  await page.click('[data-av="todo"]');
  await expect.poll(() => page.evaluate(() => __dbGet('ava', 'pm_p1_2026-09-28').c['2026-10-01'].r1.e1)).toBe(8);   // 10 − 2 del corte inicial
  await expect(page.locator('.avcrow')).toContainText('10 de 10');
  noErrors(errors, 'celular');
});
