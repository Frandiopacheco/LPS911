// Módulo Avance (avance*.js, docs/ia/avance.md): planilla única por partida. Filas por piso › sector › ambiente con unidad y metrado,
// etapas definidas en la misma fila, registro diario en cantidad o en % y filas nuevas desde la tabla.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const PM = { v: 2, nom: 'Mobiliario', d0: '2026-09-21', d1: '2026-10-31', corte: '2026-09-20', ord: 0, arch: null };
const PP = { v: 2, nom: 'Pintura', d0: '2026-09-21', d1: '2026-10-31', corte: '2026-09-20', ord: 1, arch: null };
const ET = [{ id: '_', n: 'Empaste', w: 40 }, { id: 'e2', n: '1.ª mano', w: 30 }, { id: 'e3', n: '2.ª mano', w: 30 }];
const extra = [
  ['avp', 'pm', PM], ['avp', 'pp', PP], ['avp', 'viejo', { nom: 'Formato anterior', et: [{ id: 'e1', nom: 'x', peso: 100 }], arch: null }],
  ['avm', 'pm_p1', { p: 'pm', piso: 'p1', r: { r1: { amb: 'a1', sec: '', desc: 'EO-1 · Escritorio', und: 'und', q: 10, et: null, o: 1, an: 'Dpto 101' }, r2: { amb: 'a2', sec: '', desc: 'SO-3 · Silla', und: 'und', q: 4, et: null, o: 2, an: 'Dpto 102' } } }],
  ['avm', 'pm_p2', { p: 'pm', piso: 'p2', r: { r3: { amb: 'a3', sec: '', desc: 'EO-1 · Escritorio', und: 'und', q: 6, et: null, o: 3, an: 'Dpto 103' } } }],
  ['ava', 'pm_p1_ini', { p: 'pm', piso: 'p1', w: 'ini', c: { ini: { r1: { _: 2 } } }, log: [] }],
  ['avm', 'pp_p1', { p: 'pp', piso: 'p1', r: { q1: { amb: 'a1', sec: '', desc: 'Látex en muros', und: 'm²', q: 100, et: ET, o: 1 }, q2: { amb: 'a1', sec: '', desc: 'Contrazócalo', und: 'ml', q: 20, et: null, o: 2 }, q3: { amb: '', sec: 's1', desc: 'Fachada del sector', und: 'm²', q: 50, et: null, o: 3 } } }],
  ['ava', 'pp_p1_2026-09-28', { p: 'pp', piso: 'p1', w: '2026-09-28', c: { '2026-09-29': { q1: { _: 100, e2: 50 }, q3: { _: 5 } } }, log: [] }],
];
const abrir = async (page, o = {}) => { const errors = await openApp(page, { extra, ...o }); await page.evaluate(() => { U.piso = ''; U.avPct = false; goMod('ava'); }); await expect(page.locator('#main')).toHaveAttribute('data-view', 'areg'); return errors; };
const celda = (page, k) => page.locator(`.aved[data-k="${k}"]`);
const escribir = async (page, k, v) => { await celda(page, k).click(); await page.keyboard.press('Control+A'); await page.keyboard.type(String(v)); await page.keyboard.press('Tab'); };
const SEM = 'pm_p1_2026-09-28';

test('Avance: cálculo por fila, etapas con peso, grupos con una o varias unidades', async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(() => {
    const et = [{ id: '_', n: 'a', w: 40 }, { id: 'b', n: 'b', w: 30 }, { id: 'c', n: 'c', w: 30 }];
    const ex = { r1: { _: { ini: 60, '2026-10-01': 40 }, b: { '2026-10-02': 50 } }, r2: { _: { ini: 999 } }, r3: { _: { '2026-10-01': 3 } } };
    const r1 = { id: 'r1', und: 'm²', q: 100, et }, r2 = { id: 'r2', und: 'm²', q: 60, et: null }, r3 = { id: 'r3', und: 'und', q: 7, et: null };
    return { fila: avRowPct(ex, r1), hasta: avRowPct(ex, r1, '2026-10-01'), tope: avRowPct(ex, r2), und: avRowPct(ex, r3), dia: avRowDay(ex, r1, '2026-10-01'),
      igual: avGrpPct(ex, [r1, r2]), mezcla: avGrpPct(ex, [r1, r3]), same: [avSame([r1, r2]), avSame([r1, r3])],
      w: avSetW(et, 'b', 50).map(e => e.w), w2: avSetW([{ id: '_', w: 1 }, { id: 'x', w: 1 }, { id: 'y', w: 1 }], 'x', 40).map(e => e.w),
      num: [avNum('6,5'), avNum('1,473.5'), avNum('50 %'), avNum('x')], csv: avCsv('a;b\r\n"x;1";"di ""jo"""\n\n3;4') };
  });
  expect(r.fila).toBeCloseTo(0.55, 6);          // ejemplo del dueño: empaste 100 %, 1.ª mano 50 %, 2.ª mano 0 → 55 %
  expect(r.hasta).toBeCloseTo(0.40, 6);
  expect(r.tope).toBe(1);                       // superar el metrado no pasa de 100 %
  expect(r.und).toBeCloseTo(3 / 7, 6);          // 3 de 7 muebles
  expect(r.dia).toBeCloseTo(0.16, 6);           // 40 m² de empaste (peso 40 %) sobre 100 m²
  expect(r.igual).toBeCloseTo((100 * 0.55 + 60 * 1) / 160, 6);   // misma unidad: ponderado por metrado
  expect(r.mezcla).toBeCloseTo((0.55 + 3 / 7) / 2, 6);           // unidades distintas: promedio simple, no se suman
  expect(r.same).toEqual([true, false]);
  expect(r.w[1]).toBe(50); expect(r.w[0] + r.w[2]).toBeCloseTo(50, 2); expect(r.w[0] / r.w[2]).toBeCloseTo(40 / 30, 2);
  expect(r.w2).toEqual([30, 40, 30]);
  expect(r.num).toEqual([6.5, 1473.5, 50, 0]);
  expect(r.csv).toEqual([['a', 'b'], ['x;1', 'di "jo"'], ['3', '4']]);
  noErrors(errors, 'calculo');
});

test('Avance: el ingeniero registra el día; historial por celda, aviso al superar el metrado y fracción de unidad', async ({ page }) => {
  const errors = await abrir(page, { as: 'campo' });
  await expect(page.locator('#avp option')).toHaveCount(2);           // la partida del formato anterior no se muestra
  await expect(page.locator('tr.avrw')).toHaveCount(3);
  await expect(page.locator('tr.avse')).toHaveCount(0);               // un solo sector por piso: sin nivel «sector»
  // campo registra, pero no agrega filas ni cambia unidad o metrado
  await expect(page.locator('.aved[data-k^="q|"], .aved[data-k^="u|"], tr.avgho, .avmb')).toHaveCount(0);
  await escribir(page, `c|r1|_|${HOY}`, 3);
  await expect.poll(() => page.evaluate(k => (__dbGet('ava', k) || {}).c, SEM)).toEqual({ [HOY]: { r1: { _: 3 } } });
  const log = await page.evaluate(k => __dbGet('ava', k).log, SEM);
  expect(log).toHaveLength(1); expect(log[0]).toMatchObject({ d: HOY, r: 'r1', e: '_', q: 3, a: 0, by: 'campo@obra.pe' });
  const fila = page.locator('tr.avrw', { hasText: 'EO-1' }).first();
  await expect(fila).toContainText('50 %'); await expect(fila.locator('.avdt')).toHaveCount(0);   // 2 del corte + 3 = 5 de 10
  // supera el metrado: cancelar no guarda; aceptar guarda y avisa
  await escribir(page, `c|r1|_|${HOY}`, 20);
  await expect(page.locator('#lqm')).toContainText('el acumulado sería 22 y el metrado es 10');
  await expect(page.locator('#lqm [data-avo="grow"]')).toHaveCount(0);   // campo no cambia el metrado: solo puede ajustar el día
  await page.click('#lqm [data-avo="x"]');
  await expect(celda(page, `c|r1|_|${HOY}`)).toHaveText('3');
  expect(await page.evaluate(k => __dbGet('ava', k).c['2026-10-01'].r1._, SEM)).toBe(3);
  // por defecto: el día se ajusta para cuadrar con el metrado (10 − 2 del corte = 8)
  await escribir(page, `c|r1|_|${HOY}`, 20);
  await expect(page.locator('#avofit')).toBeFocused(); await page.click('#avofit');
  await expect.poll(() => page.evaluate(k => __dbGet('ava', k).c['2026-10-01'].r1._, SEM)).toBe(8);
  await expect(celda(page, `c|r1|_|${HOY}`)).toHaveText('8'); await expect(fila).toContainText('100 %');
  await expect(fila.locator('.avdt')).toHaveCount(0);
  // 2,5 sillas: se guarda y se avisa, no se bloquea
  await escribir(page, `c|r2|_|${HOY}`, '2,5');
  await expect.poll(() => page.evaluate(k => __dbGet('ava', k).c['2026-10-01'].r2._, SEM)).toBe(2.5);
  await expect(page.locator('tr.avrw', { hasText: 'SO-3' }).locator('.avdt[title*="racción de unidad"]')).toHaveCount(1);
  // historial y días futuros
  await celda(page, `c|r1|_|${HOY}`).click({ button: 'right' });
  await expect(page.locator('#pop .avhist')).toContainText('3 → 8');
  // los días que vienen también se llenan (dentro del rango de la partida) y la columna de corte solo sale si hay datos de corte
  await escribir(page, 'c|r2|_|2026-10-02', 1);
  await expect.poll(() => page.evaluate(k => (__dbGet('ava', k).c['2026-10-02'] || {}).r2, SEM)).toEqual({ _: 1 });
  await expect(page.locator('.avgr thead')).toContainText('Corte inicial');
  await expect(page.locator('[data-avv]')).toHaveCount(0);            // sin botón Celular: se detecta solo
  noErrors(errors, 'registro');
});

test('Avance: interruptor Cantidad | %, etapas con peso y unidades mezcladas', async ({ page }) => {
  const errors = await abrir(page);
  await page.selectOption('#avp', 'pp');
  await expect(page.locator('tr.avse')).toContainText('Sector 1');     // hay una fila a nivel de sector: aparece el nivel
  const madre = page.locator('tr.avmad');
  await expect(page.locator('.avgr thead')).not.toContainText('Corte inicial');
  await expect(madre).toContainText('55 %'); await expect(page.locator('tr.avet')).toHaveCount(3);
  // las etapas se pliegan con la flecha de su fila o con el botón de la barra; la fila sigue mostrando su % combinado
  await madre.locator('.avetg').click(); await expect(page.locator('tr.avet')).toHaveCount(0); await expect(madre).toContainText('55 %');
  await page.click('[data-av="ets"]'); await expect(page.locator('tr.avet')).toHaveCount(3);
  await page.click('[data-av="ets"]'); await expect(page.locator('tr.avet')).toHaveCount(0);
  await madre.locator('.avetg').click(); await expect(page.locator('tr.avet')).toHaveCount(3);
  await expect(madre.locator('.aved[data-k^="c|"]')).toHaveCount(0);    // la fila con etapas se llena por sus etapas
  await expect(madre.locator('td.avro')).toHaveText(Array(await madre.locator('td.avro').count()).fill(''));   // en cantidad sus días van en blanco
  await expect(page.locator('tr.avgho')).toHaveCount(0);                // sin «Editar filas» no hay líneas en blanco
  await page.click('[data-av="edf"]'); await expect(page.locator('tr.avgho[data-g]')).toHaveCount(2); await page.click('[data-av="edf"]');
  await expect(page.locator('tr.avam')).toContainText('varias');        // m² y ml en el mismo ambiente: no se suma el metrado
  // en %: 50 sobre 20 ml son 10 ml; se guarda la cantidad
  await page.click('[data-avpct="1"]');
  await escribir(page, `c|q2|_|${HOY}`, 50);
  await expect.poll(() => page.evaluate(() => ((__dbGet('ava', 'pp_p1_2026-09-28').c || {})['2026-10-01'] || {}).q2)).toEqual({ _: 10 });
  await expect(celda(page, `c|q2|_|${HOY}`)).toHaveText('50');
  await page.click('[data-avpct="0"]');
  await expect(celda(page, `c|q2|_|${HOY}`)).toHaveText('10');
  // peso de una etapa: las demás se reparten el resto en su proporción
  await escribir(page, 'w|q1|e2', 50);
  await expect.poll(() => page.evaluate(() => __dbGet('avm', 'pp_p1').r.q1.et.map(e => e.w))).toEqual([28.57, 50, 21.43]);
  await expect(madre).toContainText('54 %');                            // 28,57 × 100 % + 50 × 50 % = 53,6 %
  // «50 %» tipeado en modo Cantidad no se guarda como 50 unidades
  await celda(page, `c|q2|_|${HOY}`).click(); await page.keyboard.press('Control+A'); await page.keyboard.type('50%'); await page.keyboard.press('Tab');
  await expect(celda(page, `c|q2|_|${HOY}`)).toHaveText('10');
  expect(await page.evaluate(() => __dbGet('ava', 'pp_p1_2026-09-28').c['2026-10-01'].q2._)).toBe(10);
  // quitar las etapas y volver a ponerlas: la fila conserva lo de su primera etapa y el avance de la etapa quitada no revive
  let ok = true; page.on('dialog', d => ok ? d.accept() : d.dismiss());
  await madre.locator('.avmb').click(); await page.click('[data-avmk="noet"]');
  await expect(page.locator('tr.avet')).toHaveCount(0);
  await expect(page.locator('tr.avrw', { hasText: 'Látex en muros' })).toContainText('100 %');     // lo de '_' (Empaste): 100 de 100
  await page.locator('tr.avrw', { hasText: 'Látex en muros' }).locator('.avmb').click();
  await page.fill('#avme', 'Base'); await page.click('[data-avmk="eta"]'); await expect(page.locator('#lqm')).toContainText('Etapas: Base');
  await page.fill('#avme', '1.ª mano'); await page.click('[data-avmk="eta"]'); await expect(page.locator('#lqm')).toContainText('Base, 1.ª mano');
  const et2 = await page.evaluate(() => __dbGet('avm', 'pp_p1').r.q1.et);
  expect(et2[0].id).toBe('_'); expect(['e2', 'e3', '_']).not.toContain(et2[1].id);
  // aplicar etapas a filas que ya tienen avance pide confirmar (su % baja): cancelar no cambia nada
  ok = false; await page.click('[data-avmk="copy"]');
  expect(await page.evaluate(() => __dbGet('avm', 'pp_p1').r.q3.et)).toBeNull();
  await page.click('#lqm [data-lqx]');
  await expect(page.locator('tr.avmad')).toContainText('50 %');           // Base 100 % + 1.ª mano nueva 0 %: los 50 m² de la anterior no cuentan
  // como en Excel: flechas entre celdas, renombrar la etapa en su celda y pegar un bloque
  await celda(page, `c|q2|_|${HOY}`).click(); await page.keyboard.press('ArrowRight');
  await expect(celda(page, 'c|q2|_|2026-10-02')).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowUp');
  await expect(page.locator(`tr.avet .aved[data-k$="|${HOY}"]`).last()).toBeFocused();          // sube a la última etapa de la fila de arriba
  const e2 = et2[1].id;
  await celda(page, `n|q1|${e2}`).click(); await page.keyboard.press('Control+A'); await page.keyboard.type('Primera mano'); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => __dbGet('avm', 'pp_p1').r.q1.et.map(e => e.n))).toEqual(['Base', 'Primera mano']);
  await celda(page, 'c|q1|_|2026-09-22').click();
  await page.evaluate(() => { const dt = new DataTransfer(); dt.setData('text', '1\t2\r\n3\t4\r\n'); document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
  await expect.poll(() => page.evaluate(() => { const c = (__dbGet('ava', 'pp_p1_2026-09-21') || {}).c || {}; return [c['2026-09-22'], c['2026-09-23']].map(x => x && x.q1); })).toEqual([{ [e2]: 3 }, { [e2]: 4 }]);   // «Base» ya está al 100 %: sus dos celdas se ajustan y no se escriben
  await expect(page.locator('#toast')).toContainText('2 ajustadas para no superar el metrado');
  expect(await page.evaluate(() => __dbGet('ava', 'pp_p1_2026-09-21').log.length)).toBe(2);     // cada celda pegada deja su historial
  // dejar vacío el nombre de una etapa la quita (pide confirmar); la primera no se quita sola
  ok = true; await celda(page, `n|q1|${e2}`).click(); await page.keyboard.press('Delete'); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => __dbGet('avm', 'pp_p1').r.q1.et.map(e => e.id))).toEqual(['_']);
  // unidad y metrado se corrigen en la misma tabla
  await escribir(page, 'q|q2', 40); await expect.poll(() => page.evaluate(() => __dbGet('avm', 'pp_p1').r.q2.q)).toBe(40);
  await celda(page, 'u|q2').click(); await page.keyboard.press('Control+A'); await page.keyboard.type('m'); await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => __dbGet('avm', 'pp_p1').r.q2)).toMatchObject({ und: 'm', q: 40, amb: 'a1', desc: 'Contrazócalo' });
  noErrors(errors, 'porcentaje');
  // lector y subcontratista solo leen
  for (const as of ['lector', 'sc']) { const e2 = await abrir(page, { as }); await page.selectOption('#avp', 'pm'); await expect(page.locator('tr.avrw')).toHaveCount(3); await expect(page.locator('.aved, tr.avgho, .avmb, [data-av="new"]')).toHaveCount(0); noErrors(e2, as); }
});

test('Avance: partida nueva, filas desde la tabla y etapas agregadas en la fila', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor' });
  await page.evaluate(() => { U.piso = ''; U.avPct = false; goMod('ava'); });
  await expect(page.locator('#main')).toContainText('Todavía no hay partidas');
  await page.click('[data-av="new"]'); await page.fill('#avfnom', 'Enchape'); await page.click('[data-avfk="ok"]');
  await expect(page.locator('#lqm')).toHaveCount(0);
  const pid = await page.evaluate(() => { const p = Object.entries(__dbAll('avp'))[0]; return p[1].v === 2 && p[1].nom === 'Enchape' ? p[0] : ''; });
  expect(pid).not.toBe('');
  // se elige el ambiente y se escribe en su línea en blanco: Enter crea la fila y deja lista la siguiente
  await expect(page.locator('.avemp')).toContainText('aún no tiene filas');
  await page.click('.avemp [data-av="edf"]');                           // «Agregar filas a mano» enciende «Editar filas»
  await page.selectOption('[data-avadd="p1"]', 'A:a2');
  await expect(page.locator('tr.avgho[data-g="p1||a2"] .gd')).toBeFocused();
  await page.keyboard.type('Porcelanato 60x60'); await page.keyboard.press('Tab'); await page.keyboard.press('Control+A'); await page.keyboard.type('m²'); await page.keyboard.press('Tab'); await page.keyboard.type('85.5'); await page.keyboard.press('Enter');
  await expect(page.locator('tr.avrw')).toHaveCount(1);
  await expect(page.locator('tr.avgho[data-g="p1||a2"] .gd')).toBeFocused();
  await page.keyboard.type('Zócalo'); await page.keyboard.press('Enter'); await page.keyboard.type('30'); await page.keyboard.press('Enter');
  await expect(page.locator('tr.avrw')).toHaveCount(2);
  const filas = await page.evaluate(id => Object.values(__dbGet('avm', id + '_p1').r).sort((a, b) => a.o - b.o), pid);
  expect(filas).toMatchObject([{ amb: 'a2', desc: 'Porcelanato 60x60', und: 'm²', q: 85.5, an: 'Dpto 102' }, { amb: 'a2', desc: 'Zócalo', und: 'm²', q: 30 }]);   // la unidad sugerida es la de la fila anterior
  // una fila sin ambiente: de todo el piso
  await page.selectOption('[data-avadd="p2"]', 'P:');
  await expect(page.locator('tr.avgho[data-g="p2||"] .gd')).toBeFocused();
  await page.keyboard.type('Limpieza final'); await page.keyboard.press('Enter'); await page.keyboard.type('1'); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(id => Object.values((__dbGet('avm', id + '_p2') || { r: {} }).r).map(r => r.amb + '|' + r.sec + '|' + r.desc), pid)).toEqual(['||Limpieza final']);
  // se registra avance en la fila y luego se le agregan etapas: lo registrado pasa a la primera
  const rid = await page.evaluate(id => Object.entries(__dbGet('avm', id + '_p1').r).find(x => x[1].desc === 'Zócalo')[0], pid);
  await escribir(page, `c|${rid}|_|${HOY}`, 12);
  await page.locator('tr.avrw', { hasText: 'Zócalo' }).locator('.avmb').click();
  await page.fill('#avme', 'Colocación'); await page.click('[data-avmk="eta"]');
  await expect(page.locator('#lqm')).toContainText('Etapas: Colocación');
  await page.fill('#avme', 'Fragua'); await page.click('[data-avmk="eta"]');
  await expect(page.locator('#lqm')).toContainText('Colocación, Fragua');
  await page.click('[data-avmk="copy"]');                               // a la otra fila en m² que no tiene etapas
  await expect(page.locator('#lqm')).toHaveCount(0);
  const R = await page.evaluate(id => __dbGet('avm', id + '_p1').r, pid);
  expect(R[rid].et.map(e => [e.id === '_', e.n, e.w])).toEqual([[true, 'Colocación', 1], [false, 'Fragua', 1]]);
  const otra = Object.values(R).find(r => r.desc === 'Porcelanato 60x60');
  expect(otra.et.map(e => e.n)).toEqual(['Colocación', 'Fragua']); expect(otra.et[0].id).toBe('_'); expect(otra.et[1].id).not.toBe(R[rid].et[1].id);
  await expect(page.locator('tr.avet')).toHaveCount(4);
  await expect(page.locator('tr.avmad', { hasText: 'Zócalo' })).toContainText('20 %');   // 12 de 30 en Colocación (peso 50 %)
  noErrors(errors, 'filas');
});

test('Avance: «Traer ambientes» crea la misma fila en los ambientes del Lookahead, por metrar y sin duplicar', async ({ page }) => {
  const errors = await abrir(page);
  await page.click('[data-av="amb"]');
  await expect(page.locator('#avago')).toHaveText('Crear 3 filas');
  await page.fill('#avad', 'Pintura de puertas'); await page.fill('#avau', 'und');
  await page.uncheck('#avac_a2'); await expect(page.locator('#avago')).toHaveText('Crear 2 filas');
  await page.click('#avago'); await expect(page.locator('#lqm')).toHaveCount(0);
  const nuevas = () => page.evaluate(() => ['pm_p1', 'pm_p2'].flatMap(d => Object.entries(__dbGet('avm', d).r).filter(x => x[1].desc.toLowerCase() === 'pintura de puertas').map(x => ({ id: x[0], ...x[1] }))));
  const N = await nuevas();
  expect(N).toMatchObject([{ amb: 'a1', und: 'und', q: 0, et: null, an: 'Dpto 101' }, { amb: 'a3', und: 'und', q: 0, an: 'Dpto 103' }]);
  // «por metrar»: no cuenta en el avance ni deja registrar hasta tener metrado
  const f1 = page.locator('tr.avrw', { hasText: 'Pintura de puertas' }).first();
  await expect(f1).toContainText('por metrar'); await expect(f1.locator('.aved[data-k^="c|"]')).toHaveCount(0);
  await expect(page.locator('tr.avpi').first()).toContainText('14');           // metrado del piso: 10 + 4, sin la fila nueva
  // pegar un bloque no corre las líneas ni las columnas: la fila sin metrado y la semana plegada quedan «sin pegar»
  const pegar = txt => page.evaluate(x => { const dt = new DataTransfer(); dt.setData('text', x); document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, txt);
  await celda(page, `c|r1|_|${HOY}`).click(); await pegar('1\n2\n3');
  await expect.poll(() => page.evaluate(k => ((__dbGet('ava', k) || {}).c || {})['2026-10-01'], SEM)).toEqual({ r1: { _: 1 }, r2: { _: 3 } });   // el 2 era de la fila por metrar
  await expect(page.locator('#toast')).toContainText('1 sin pegar');
  await celda(page, 'c|r2|_|2026-10-04').click(); await pegar('1\t9');                // el domingo es el último día de la semana abierta
  await expect.poll(() => page.evaluate(k => (__dbGet('ava', k).c['2026-10-04'] || {}).r2, SEM)).toEqual({ _: 1 });
  expect(await page.evaluate(() => __dbGet('ava', 'pm_p1_2026-10-05'))).toBeUndefined();
  // Ctrl+Z deshace el pegado entero (una acción) y luego el anterior; Ctrl+Y lo rehace; deshacer escribe, no borra
  await page.locator('.avtot').click(); await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(k => __dbGet('ava', k).c['2026-10-04'].r2._, SEM)).toBe(0);
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(k => __dbGet('ava', k).c['2026-10-01'], SEM)).toEqual({ r1: { _: 0 }, r2: { _: 0 } });
  await page.keyboard.press('Control+y');
  await expect.poll(() => page.evaluate(k => __dbGet('ava', k).c['2026-10-01'], SEM)).toEqual({ r1: { _: 1 }, r2: { _: 3 } });
  expect(await page.evaluate(k => __dbGet('ava', k).log.filter(x => x.r === 'r1').map(x => x.q), SEM)).toEqual([1, 0, 1]);
  // deshacer «Traer ambientes» archiva las filas creadas (no las borra) y rehacer las repone
  await page.keyboard.press('Control+y');                                // rehace el pegado del domingo
  for (let i = 0; i < 3; i++) await page.click('[data-av="undo"]');      // los dos pegados y la creación de las 2 filas
  await expect(page.locator('tr.avrw', { hasText: 'Pintura de puertas' })).toHaveCount(0);
  expect((await nuevas()).every(r => r.arch && r.arch.by)).toBe(true);
  await expect(page.locator('[data-av="undo"]')).toBeDisabled();
  for (let i = 0; i < 3; i++) await page.click('[data-av="redo"]');
  await expect(page.locator('tr.avrw', { hasText: 'Pintura de puertas' })).toHaveCount(2);
  // Enter en la última fila de la tabla también guarda
  await celda(page, `c|r3|_|${HOY}`).click(); await page.keyboard.type('2'); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => ((__dbGet('ava', 'pm_p2_2026-09-28') || {}).c || {})['2026-10-01'])).toEqual({ r3: { _: 2 } });
  // se llena el metrado bajando con Enter por la columna
  await celda(page, `q|${N[0].id}`).click(); await page.keyboard.type('6'); await page.keyboard.press('Enter');
  await expect(celda(page, 'q|r2')).toBeFocused();
  await expect.poll(async () => (await nuevas())[0].q).toBe(6);
  await expect(f1.locator('.aved[data-k^="c|"]').first()).toBeVisible(); await expect(f1).not.toContainText('por metrar');
  // repetirlo no duplica: solo crea la del ambiente que faltaba
  await page.click('[data-av="amb"]'); await page.fill('#avad', 'pintura de PUERTAS'); await page.fill('#avau', 'und'); await page.click('#avago');
  await expect.poll(async () => (await nuevas()).map(r => r.amb).sort()).toEqual(['a1', 'a2', 'a3']);
  expect(await page.evaluate(() => Object.keys(__dbAll('ambientes')).length)).toBe(3);
  noErrors(errors, 'traer ambientes');
});

test('Avance: fila de total, buscar, reordenar filas y rango seleccionado (copiar, vaciar, deshacer)', async ({ page }) => {
  const errors = await abrir(page);
  const total = page.locator('tr.avtt');
  await expect(total).toContainText('Total de la partida'); await expect(total).toContainText('20');     // 10 + 4 + 6 und
  // nombres largos: completos al pasar el mouse y, con «Ajustar texto», en varias líneas (se recuerda)
  await expect(page.locator('tr.avrw .avnm').first()).toHaveAttribute('title', 'EO-1 · Escritorio');
  await page.click('[data-av="wrap"]'); await expect(page.locator('table.avgr.avwr')).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lps911.ui')).avWrap)).toBe(true);
  await page.click('[data-av="wrap"]'); await expect(page.locator('table.avgr.avwr')).toHaveCount(0);
  await page.fill('#avq', 'silla'); await expect(page.locator('tr.avrw')).toHaveCount(1);
  await expect(total).toContainText('Total de lo buscado'); await expect(page.locator('#avq')).toBeFocused();
  await page.fill('#avq', 'dpto 103'); await expect(page.locator('tr.avrw')).toContainText('EO-1');      // también busca por ambiente
  await page.fill('#avq', ''); await expect(page.locator('tr.avrw')).toHaveCount(3);
  // reordenar dentro del ambiente
  await page.selectOption('#avp', 'pp');
  await page.locator('tr.avrw', { hasText: 'Contrazócalo' }).locator('.avmb').click(); await page.click('[data-avmk="up"]'); await page.click('#lqm [data-lqx]');
  await expect.poll(() => page.evaluate(() => { const r = __dbGet('avm', 'pp_p1').r; return r.q2.o < r.q1.o; })).toBe(true);
  await expect(page.locator('tr.avam + tr.avrw')).toContainText('Contrazócalo');
  // rango: Mayús+flecha selecciona, Supr lo vacía como una sola acción y Ctrl+Z lo repone
  await escribir(page, `c|q2|_|${HOY}`, 5); await escribir(page, 'c|q2|_|2026-10-02', 6);
  await expect.poll(() => page.evaluate(() => { const c = __dbGet('ava', 'pp_p1_2026-09-28').c; return [c['2026-10-01'].q2._, c['2026-10-02'].q2._]; })).toEqual([5, 6]);
  await celda(page, `c|q2|_|${HOY}`).click(); await page.keyboard.press('Shift+ArrowRight');
  await expect(page.locator('.avsel')).toHaveCount(2);
  await page.keyboard.press('Delete');
  await expect.poll(() => page.evaluate(() => { const c = __dbGet('ava', 'pp_p1_2026-09-28').c; return [c['2026-10-01'].q2._, c['2026-10-02'].q2._]; })).toEqual([0, 0]);
  await page.locator('.avtot').click(); await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => { const c = __dbGet('ava', 'pp_p1_2026-09-28').c; return [c['2026-10-01'].q2._, c['2026-10-02'].q2._]; })).toEqual([5, 6]);
  // superar el metrado como administrador: se puede aumentar el metrado, con segunda confirmación; es una sola acción para Ctrl+Z
  let sube = false; page.on('dialog', d => sube ? d.accept() : d.dismiss());
  await escribir(page, 'c|q2|_|2026-10-03', 12);                          // 5 + 6 + 12 = 23 sobre 20 ml
  await page.click('#lqm [data-avo="grow"]');                            // la segunda confirmación se rechaza: no cambia nada
  await expect(page.locator('#lqm')).toHaveCount(0);
  expect(await page.evaluate(() => [__dbGet('avm', 'pp_p1').r.q2.q, (__dbGet('ava', 'pp_p1_2026-09-28').c['2026-10-03'] || {}).q2])).toEqual([20, undefined]);
  sube = true; await escribir(page, 'c|q2|_|2026-10-03', 12); await page.click('#lqm [data-avo="grow"]');
  await expect.poll(() => page.evaluate(() => [__dbGet('avm', 'pp_p1').r.q2.q, __dbGet('ava', 'pp_p1_2026-09-28').c['2026-10-03'].q2._])).toEqual([23, 12]);
  await page.locator('.avtot').click(); await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => [__dbGet('avm', 'pp_p1').r.q2.q, __dbGet('ava', 'pp_p1_2026-09-28').c['2026-10-03'].q2._])).toEqual([20, 0]);
  // pegar un bloque que superaría el metrado: se ajusta sin preguntar y se avisa
  await celda(page, 'c|q2|_|2026-10-03').click();
  await page.evaluate(() => { const dt = new DataTransfer(); dt.setData('text', '30\t4'); document.activeElement.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
  await expect(page.locator('#toast')).toContainText('2 ajustadas para no superar el metrado');
  await expect.poll(() => page.evaluate(() => { const c = __dbGet('ava', 'pp_p1_2026-09-28').c; return [c['2026-10-03'].q2._, (c['2026-10-04'] || {}).q2]; })).toEqual([9, undefined]);   // 20 − 5 − 6 = 9 y ya no cabe nada el día siguiente
  await page.locator('.avtot').click(); await page.keyboard.press('Control+z');
  // deshacer no pisa lo que cambió otra persona después: esa celda no se toca y se avisa
  await escribir(page, `c|q2|_|${HOY}`, 7);
  await expect.poll(() => page.evaluate(() => __dbGet('ava', 'pp_p1_2026-09-28').c['2026-10-01'].q2._)).toBe(7);
  await page.evaluate(() => { window.__dbRemote = true; return firebase.firestore().collection('ava').doc('pp_p1_2026-09-28').set({ c: { '2026-10-01': { q2: { _: 9 } } } }, { merge: true }); });
  await expect(celda(page, `c|q2|_|${HOY}`)).toHaveText('9');
  await page.evaluate(() => { window.__dbRemote = false; });
  await page.locator('.avtot').click(); await page.keyboard.press('Control+z');
  await expect(page.locator('#toast')).toContainText('otra persona');
  expect(await page.evaluate(() => __dbGet('ava', 'pp_p1_2026-09-28').c['2026-10-01'].q2._)).toBe(9);
  noErrors(errors, 'total y rango');
});

test('Avance: importar filas con el cuadro de equivalencias, sin crear ambientes ni duplicar', async ({ page }) => {
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
  expect(d.m1.r.r1).toMatchObject({ q: 12, desc: 'EO-1 · Escritorio' });      // la fila que ya existía cambia de metrado y conserva su id y su nombre
  expect(Object.values(d.m1.r).filter(r => r.desc === 'M-1 · MESA CUADRADA')).toMatchObject([{ amb: 'a2', und: 'und', q: 5, et: null }]);
  expect(Object.values(d.m2.r).filter(r => r.desc === 'M-1 · MESA CUADRADA')).toMatchObject([{ amb: 'a3', q: 2 }]);
  expect(Object.keys(d.m1.r)).toHaveLength(3);
  expect(d.p.eq.niv['piso 2']).toBe('p2'); expect(d.p.nom).toBe('Mobiliario');
  // segunda carga del mismo archivo: las equivalencias quedaron guardadas y no hay nada nuevo
  await page.click('[data-av="imp"]'); await page.fill('#avitxt', csv); await page.click('[data-avi="read"]');
  await expect(page.locator('.avisum')).toContainText('0 filas nuevas'); await expect(page.locator('.avisum')).toContainText('3 iguales'); await expect(go).toBeDisabled();
  noErrors(errors, 'importar');
});

test('Avance › Resumen: avance por partida y piso, por semana, global con pesos y hoja para Excel', async ({ page }) => {
  const errors = await abrir(page);
  await page.click('#tabs [data-tab="ares"]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'ares');
  const fila = n => page.locator('.avrtb').first().locator('tbody tr', { hasText: n });
  await expect(fila('Mobiliario')).toContainText('10 %');               // 2 de 20 und (el corte inicial cuenta)
  await expect(fila('Mobiliario')).toContainText('14 %');               // Primer piso: 2 de 14
  await expect(fila('Pintura')).toContainText('22 %');                  // m² y ml mezclados: promedio de (55 + 0 + 10) / 3
  await expect(page.locator('.avtile').first()).toContainText('16 %');  // global con pesos iguales: (10 + 21,7) / 2
  await expect(page.locator('#avp option')).toHaveCount(0);             // la partida del formato anterior tampoco entra aquí
  const r = await page.evaluate(() => { const R = avResData(), x = R.act.find(y => y.p.id === 'pp'), w = R.wk(x); return { n: R.act.length, g: R.g, sem: w[w.length - 1], gsem: R.gWk[R.gWk.length - 1], suma: w.reduce((s, v) => s + v, 0) + avGrpPct(x.ex, x.rows, addD(R.Ws[0], -1)), pct: x.pct }; });
  expect(r.n).toBe(2); expect(r.g).toBeCloseTo((0.10 + 0.65 / 3) / 2, 6);
  expect(r.sem).toBeCloseTo(0.65 / 3, 6);                               // todo lo de Pintura se registró esta semana
  expect(r.gsem).toBeCloseTo(0.65 / 3 / 2, 6);
  expect(r.suma).toBeCloseTo(r.pct, 6);                                 // lo avanzado por semana suma el acumulado
  // el peso cambia el global y se guarda en la partida
  await page.fill('[data-arpw="pm"]', '3'); await page.locator('[data-arpw="pm"]').blur();
  await expect.poll(() => page.evaluate(() => __dbGet('avp', 'pm').peso)).toBe(3);
  await expect(page.locator('.avtile').first()).toContainText('13 %');  // (3 × 10 + 21,7) / 4
  // hoja de la partida para Excel: una fila por etapa y una columna por día
  const A = await page.evaluate(() => { const B = ARS.by.get('pp'); return avResAoa(AVP.get('pp'), B.rows, B.ex); });
  expect(A[0].slice(0, 9)).toEqual(['Piso', 'Sector', 'Ambiente', 'Descripción', 'Etapa', 'Und', 'Metrado', 'Acumulado', '% avance']);
  const dia = A[0].indexOf('29/09');
  const emp = A.find(x => x[3] === 'Látex en muros' && x[4] === 'Empaste');
  expect([emp[0], emp[2], emp[7], emp[8], emp[dia]]).toEqual(['Primer piso', 'Dpto 101', 100, 100, 100]);
  expect(A.find(x => x[3] === 'Látex en muros' && x[4] === '(todas)').slice(6, 9)).toEqual([100, 55, 55]);
  expect(A.find(x => x[3] === 'Fachada del sector').slice(1, 3)).toEqual(['Sector 1', '']);
  // de una partida se pasa a su planilla; lector también ve el resumen, sin editar pesos
  await page.click('[data-argo="pp"]'); await expect(page.locator('#avp')).toHaveValue('pp');
  noErrors(errors, 'resumen');
  const e2 = await abrir(page, { as: 'lector' }); await page.click('#tabs [data-tab="ares"]');
  await expect(page.locator('.avrtb').first()).toContainText('Mobiliario'); await expect(page.locator('[data-arpw]')).toHaveCount(0); noErrors(e2, 'resumen lector');
});

test('Avance en el celular: piso → ambiente → filas con lo ejecutado hoy, en cantidad o en %', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await abrir(page, { as: 'campo' });
  await expect(page.locator('.avcel')).toHaveCount(1);
  await expect(page.locator('.avcard')).toHaveCount(3);                 // sin piso elegido se ven los ambientes de todos los pisos
  await page.click('.avcard[data-avgrp="p1~Aa1"]');
  await page.click('[data-avst="1"]'); await page.click('[data-avst="1"]');
  await expect.poll(() => page.evaluate(k => ((__dbGet('ava', k) || {}).c || {})['2026-10-01'], SEM)).toEqual({ r1: { _: 2 } });
  await page.click('[data-avpct="1"]'); await page.click('[data-avst="1"]');     // en %: cada toque suma 10 % del metrado (1 de 10)
  await expect.poll(() => page.evaluate(k => __dbGet('ava', k).c['2026-10-01'].r1._, SEM)).toBe(3);
  // otro día del rango, con el selector de fecha
  await page.fill('[data-avday]', '2026-09-25'); await page.locator('[data-avday]').blur(); await page.click('[data-avpct="0"]');
  await page.fill('[data-avin="r1|_"]', '1'); await page.locator('[data-avin="r1|_"]').blur();
  await expect.poll(() => page.evaluate(() => ((__dbGet('ava', 'pm_p1_2026-09-21') || {}).c || {})['2026-09-25'])).toEqual({ r1: { _: 1 } });
  // de vuelta en hoy: «Todo lo que falta» completa justo hasta el metrado (10 − 2 del corte − 1 del 25 = 7 hoy)
  await page.click(`[data-avd="${HOY}"]`); await page.click('[data-av="todo"]');
  await expect.poll(() => page.evaluate(k => __dbGet('ava', k).c['2026-10-01'].r1._, SEM)).toBe(7);
  await expect(page.locator('.avcrow')).toContainText('10 de 10');
  // un toque más supera el metrado: la ventana ofrece dejar el día como estaba
  await page.click('[data-avst="1"]'); await expect(page.locator('#avofit')).toContainText('ya está completa'); await page.click('#avofit');
  await expect(page.locator('#lqm')).toHaveCount(0);
  expect(await page.evaluate(k => __dbGet('ava', k).c['2026-10-01'].r1._, SEM)).toBe(7);
  noErrors(errors, 'celular');
});
