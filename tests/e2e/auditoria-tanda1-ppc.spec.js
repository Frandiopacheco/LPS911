// Tanda 1 de correcciones (frente B: PPC coherente, congelado, nombres de lo pasado). Regresiones de la simulación de obra
// (auditorías sobre 491ef73; fallaban en 13fc4dd) más las de C-05, C-06, C-07, LPS-13 y C-32. Hoy = 1-oct-2026 (jue, semana 58).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY, MANANA } from './helpers.js';

const IT = (sc, i, days = ['2026-09-29']) => ({ sc, sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Tarea ' + i, days, ord: i });
/** semana congelada del piso: n compromisos de `sc`, `ok` cumplidos, `no` incumplidos, el resto sin evaluar */
function sem(n, pid, sc, tot, ok, no = 0, extra = {}) {
  const items = {}, res = {};
  for (let i = 0; i < tot; i++) { const id = `w${n}${pid}_${i}`; items[id] = IT(sc, i); if (i < ok) res[id] = { ok: true, cnc: '', note: '' }; else if (i < ok + no) res[id] = { ok: false, cnc: 'Materiales', note: 'x' }; }
  return ['weeks', `${n}_${pid}`, { n, pisoId: pid, frozenAt: new Date(Date.parse('2026-09-26T13:00:00-05:00') + n * 6048e5 - 58 * 6048e5).toISOString(), items, res, ...extra }];
}
const pct = v => (v == null ? null : Math.round(v * 1000) / 10);

/* ================= LPS-1 ================= */
test('LPS-1 · una semana pasada descongelada y sin re-congelar no puede desaparecer en silencio del PPC (se cuenta o se avisa)', async ({ page }) => {
  // semana 57 (pasada): P1 cumplió 4/4 y P2 solo 1/4; el ingeniero de P2 la descongela "para corregir" y la deja
  const extra = [sem(57, 'p1', 'c1', 4, 4), sem(57, 'p2', 'c1', 4, 1, 3)];
  const errors = await openApp(page, { tab: 'plan', extra });
  const antes = await page.evaluate(() => ppcWeekAgg(57, new Set(['p1', 'p2'])));
  expect(pct(antes.ppc)).toBe(62.5);
  await page.evaluate(() => unfreezeWeek(57, 'p2'));
  await expect.poll(() => page.evaluate(() => !!S.wk.get('57_p2').unfrozenAt && !S.wk.get('57_p2').frozenAt)).toBe(true);
  const despues = await page.evaluate(() => ppcWeekAgg(57, new Set(['p1', 'p2'])));
  /* semana ya cerrada (hoy es la 58): P2 sigue descongelada. Invariante: o cuenta (8 compromisos) o hay un aviso visible */
  const textos = [];
  for (const t of ['hoy', 'ind', 'dash']) { await page.evaluate(([t]) => { U.indMode = 'sem'; U.week = 57; goTab(t); }, [t]); await page.waitForTimeout(250); textos.push(await page.locator('#main').innerText()); }
  const avisa = textos.some(x => /descongelad/i.test(x));
  const cuenta = despues && despues.n === 8;
  expect(cuenta || avisa, `PPC global sem 57: antes ${pct(antes.ppc)}% (n=${antes.n}), después ${pct(despues && despues.ppc)}% (n=${despues && despues.n}); ¿aviso de piso descongelado en Hoy/Indicadores/Tablero? ${avisa}`).toBe(true);
  noErrors(errors, 'LPS-1');
});

/* ================= LPS-2 ================= */
test('LPS-2 · descongelar y volver a congelar a mitad de semana no debe perder la falla ya reprogramada (ni su causa)', async ({ page }) => {
  // semana 58 (en curso, hoy jueves): congelada con e0 (Entubado) e i0. e0 no se hizo (Materiales) y el plan diario lo reprogramó a la semana siguiente.
  const W = ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00.000Z',
    items: { e0: { sc: 'c2', sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Entubado empotrado', days: ['2026-09-29', '2026-09-30'], ord: 1 },
             i0: { sc: 'c1', sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Redes empotradas', days: ['2026-09-30', HOY], ord: 2 } },
    res: { e0: { ok: false, cnc: 'Materiales', note: 'No llegó el tubo' }, i0: { ok: true, cnc: '', note: '' } } }];
  const errors = await openApp(page, { tab: 'plan', extra: [W] });
  page.on('dialog', d => d.accept());
  // «No va» publicado el martes: e0 ya no tiene días en la semana 58 (los pasó al lunes 5-oct)
  await page.evaluate(() => { const x = S.act.get('e0'); S.act.set('e0', { ...x, days: ['2026-10-05', '2026-10-06'] }); });
  await page.evaluate(() => { U.week = 58; render(); });
  await page.locator('section[data-pid="p1"] [data-unfreeze]').click();
  await expect.poll(() => page.evaluate(() => !S.wk.get('58_p1').frozenAt)).toBe(true);
  await page.locator('section[data-pid="p1"] [data-freeze]').click();   // «Congelar P1» (botón principal, sin «Recuperar»)
  await expect.poll(() => page.evaluate(() => !!S.wk.get('58_p1').frozenAt)).toBe(true);
  const w = await page.evaluate(() => window.__dbGet('weeks', '58_p1'));
  const st = `items=${Object.keys(w.items).join(',')} · res=${JSON.stringify(w.res)}`;
  expect(w.items.e0, 'la falla de e0 salió del compromiso de la semana: ' + st).toBeTruthy();
  expect(w.res.e0 && w.res.e0.ok, 'e0 perdió su evaluación «No cumplido» y su causa: ' + st).toBe(false);
  noErrors(errors, 'LPS-2');
});

/* ================= LPS-3 ================= */
test('LPS-3 · Tablero «PPC por subcontratista · 4 semanas» no cuenta la semana en curso sin evaluar', async ({ page }) => {
  // c1 cumplió 10/10 en las semanas 55, 56 y 57; la semana 58 (en curso) tiene 10 compromisos todavía sin evaluar
  const extra = [sem(55, 'p1', 'c1', 10, 10), sem(56, 'p1', 'c1', 10, 10), sem(57, 'p1', 'c1', 10, 10), sem(58, 'p1', 'c1', 10, 0)];
  const errors = await openApp(page, { tab: 'dash', extra, editar: false });
  await page.evaluate(() => render());
  const txt = await page.locator('#main').innerText();
  const m = txt.match(/PPC POR SUBCONTRATISTA[\s\S]*?SC SANITARIAS\s*(\d+)%/i);
  expect(m, 'no se encontró la fila del SC en el Tablero:\n' + txt.slice(0, 800)).toBeTruthy();
  /* invariante: solo semanas ya evaluadas (55–57) → 100 %; con el bug la semana 58 sin evaluar entra al denominador → 75 % */
  expect(+m[1], 'PPC del SC que mostró el Tablero (semanas 55-57 al 100 %, semana 58 sin evaluar)').toBe(100);
  noErrors(errors, 'LPS-3');
});

/* ================= LPS-4 ================= */
test('LPS-4 · los tres «PPC promedio» (Indicadores, Presentar, Tablero) salen de la misma fórmula', async ({ page }) => {
  // semanas 50–54 cargadas a mano (70 %), 55: 10/10, 56: 20/40, 57: 10/10 congeladas
  const man = {}; for (let w = 50; w <= 54; w++) man[w] = { a: 0.7, b: null };
  const extra = [['meta', 'project', { name: 'Obra de prueba', code: 'OP', refWeek: 58, refDate: '2026-09-28', ppcHist: man }],
    sem(55, 'p1', 'c1', 10, 10), sem(56, 'p1', 'c1', 40, 20, 20), sem(57, 'p1', 'c1', 10, 10)];
  const errors = await openApp(page, { tab: 'ind', extra, editar: false });
  await page.evaluate(() => { U.indMode = 'sem'; U.week = 57; U.piso = ''; U.pisoAll = true; render(); });
  await page.waitForTimeout(300);
  const ind = await page.locator('#main').innerText();
  const pres = await page.evaluate(() => iprData(57).avg);
  await page.evaluate(() => goTab('dash')); await page.waitForTimeout(300);
  const tab = await page.locator('#main').innerText();
  const num = (s, re) => { const m = String(s || '').match(re); return m ? +m[1].replace(',', '.') : null; };
  const vals = { indicadores: num(ind, /PPC promedio\s*(\d+(?:[.,]\d+)?)\s*%/i), presentar: pct(pres), tablero: num(tab, /PPC promedio 4 semanas\s*(\d+(?:[.,]\d+)?)\s*%/i) };
  expect(Object.values(vals).every(v => v != null), 'no se pudo leer algún promedio: ' + JSON.stringify({ ind, pres, tab })).toBe(true);
  /* C-01: una sola fórmula (promedio simple de las semanas evaluadas por completo, con las cargadas a mano). Indicadores y Presentar
     usan todas (5×70, 100, 50, 100 → 75 %); el Tablero, las 4 últimas con la misma fórmula (70, 100, 50, 100 → 80 %) */
  expect(Math.round(vals.indicadores), JSON.stringify(vals)).toBe(75);
  expect(Math.round(vals.presentar), JSON.stringify(vals)).toBe(75);
  expect(Math.round(vals.tablero), JSON.stringify(vals)).toBe(80);
  expect(await page.evaluate(() => Math.round(ppcAvg(ppcHistAll([55, 56, 57].map(k => ({ ...ppcWeekAgg(k, histPisoSet()), wk: k }))), 4).avg * 100))).toBe(80);
  noErrors(errors, 'LPS-4');
});

/* ================= CON-01 ================= */
const AMB = [
  ['ambientes', 'a1', { sectorId: 's1', code: 'A-1', name: 'Dpto 101', order: 0, geo: { L1: [100, 100, 300, 100, 300, 300, 100, 300] } }],
  ['ambientes', 'a2', { sectorId: 's1', code: 'A-2', name: 'Dpto 102', order: 1, geo: { L1: [400, 100, 600, 100, 600, 300, 400, 300] } }],
];
const MXNA = [
  ['mcat', 'k2', { name: 'Entubado empotrado', sc: 'c2', cl: 't', al: ['entubado empotrado'], ord: 20 }],
  ['mamb', 'a1', { c: { k2: 'n' }, by: 'ing@obra.pe', t: 1 }],   // Matriz: «Entubado empotrado» NO APLICA en Dpto 101 (confirmado)
];
async function publicar(page) { await page.locator('#mbar [data-pub]').first().click(); await page.locator('#pop [data-do="si"]').click(); }

test('DAT-02 · renombrar un SC no cambia el nombre en las semanas ya congeladas (Plan semanal e Indicadores de la semana 57)', async ({ page }) => {
  /* la semana 57 se congeló con el nombre de entonces (scn, C-29); la 58 se congela ahora desde la página */
  const s57 = sem(57, 'p1', 'c1', 6, 5, 1); Object.values(s57[2].items).forEach(it => { it.scn = 'SC SANITARIAS'; });
  const extra = [s57];
  const errors = await openApp(page, { tab: 'plan', extra });
  await page.evaluate(() => freezeWeek(58, 'p1'));
  await expect.poll(() => page.evaluate(() => { const w = window.__dbGet('weeks', '58_p1'); return w && Object.values(w.items).filter(i => i.sc === 'c1').map(i => i.scn)[0]; })).toBe('SC SANITARIAS');
  const ver = async () => {
    const t = {};
    await page.evaluate(() => { U.week = 57; U.piso = ''; U.pisoAll = true; goTab('plan'); }); await page.waitForTimeout(250); t.plan = await page.locator('#main').innerText();
    await page.evaluate(() => { U.indMode = 'sem'; U.week = 57; goTab('ind'); }); await page.waitForTimeout(250); t.ind = await page.locator('#main').innerText();
    return t;
  };
  const antes = await ver();
  expect(antes.plan).toContain('SC SANITARIAS');
  expect(antes.ind).toContain('SC SANITARIAS');
  // el dueño divide/renombra la partida (caso ICR → ICR-ACI)
  await page.evaluate(() => apply([op('contractors', 'c1', { ...S.con.get('c1'), name: 'ICR-ACI' })]));
  await expect.poll(() => page.evaluate(() => conOf('c1').name)).toBe('ICR-ACI');
  const despues = await ver();
  const r = { plan_vieja: despues.plan.includes('SC SANITARIAS'), plan_nueva: despues.plan.includes('ICR-ACI'), ind_vieja: despues.ind.includes('SC SANITARIAS'), ind_nueva: despues.ind.includes('ICR-ACI') };
  expect(r, 'la semana 57 (congelada antes del renombre) debe seguir mostrando el nombre de entonces: ' + JSON.stringify(r)).toEqual({ plan_vieja: true, plan_nueva: false, ind_vieja: true, ind_nueva: false });
  noErrors(errors, 'DAT-02');
});


/* ================= C-05 ================= */
test('C-05 · el Excel del PPC cliente exporta «Pendiente» (no «No») para lo aún sin evaluar', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind' });
  const out = await page.evaluate(() => {
    const keep = window.cliPpc; window.cliPpc = () => ({ W: [{ w: 58, ver: { id: 'v', label: 'V' }, n: 3, ok: 1, ppc: 1 / 3, cur: true, items: [
      { x: { ambId: 'a1', name: 'A', sc: 'c1' }, pid: 'p1', days: ['2026-09-29'], ok: true, st: 'ok' },
      { x: { ambId: 'a1', name: 'B', sc: 'c1' }, pid: 'p1', days: ['2026-09-29'], ok: false, st: 'no' },
      { x: { ambId: 'a1', name: 'C', sc: 'c1' }, pid: 'p1', days: ['2026-09-29'], ok: false, st: 'pend' }] }] });
    try { return cliPpcAoa().sum.filter(r => ['A', 'B', 'C'].includes(r[4])).map(r => r[4] + ':' + r[7]); } finally { window.cliPpc = keep; }
  });
  expect(out).toEqual(['A:Sí', 'B:No', 'C:Pendiente']);
  noErrors(errors, 'C-05');
});

/* ================= C-06 ================= */
test('C-06 · el Cumplido del SC cuenta sin confirmación en el Plan semanal, el Tablero, Indicadores y Hoy', async ({ page }) => {
  const items = { i0: { sc: 'c1', sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Redes empotradas', days: [HOY], ord: 1 } };
  const W = ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00.000Z', items, res: {} }];
  const LV = ['live', HOY + '_i0', { date: HOY, actId: 'i0', pisoId: 'p1', sc: 'c1', close: { status: 'ok', done: true, by: 'u_cap1', n: 'Pedro', t: 1 } }];
  const errors = await openApp(page, { tab: 'plan', extra: [W, LV] });
  const r = await page.evaluate(d => {
    const sg = fieldSug('i0', S.wk.get('58_p1').items.i0);
    const D = dayData([d], new Set(['p1'])).rows.find(x => x.x.id === 'i0');
    const av = dashAvance(58, new Set(['p1']), d).sc.c1;
    return { sug: sg && sg.ok, prop: sg && sg.prop, dia: D && D.rc && D.rc.status, real: av && av.real, campo: hoyCards().find(c => c.k === 'campo') };
  }, HOY);
  expect(r.sug).toBe(true);
  expect(r.prop).toBe(1); // queda marcado como reportado por el SC (para auditar)
  expect(r.dia).toBe('ok');
  expect(r.real).toBe(1);
  expect(r.campo.sub).toContain('1 cerrada por el SC/capataz');
  expect(r.campo.sub).not.toContain('por confirmar');
  noErrors(errors, 'C-06');
});

/* ================= C-07 ================= */
test('C-07 · cambiar la causa en Indicadores › No cumplidos recalcula la imputabilidad (como el Plan semanal)', async ({ page }) => {
  const items = { i0: { sc: 'c1', sector: 'S1', code: 'A-1', amb: 'Dpto 101', act: 'Redes empotradas', days: ['2026-09-29'], ord: 1 } };
  const W = ['weeks', '58_p1', { n: 58, pisoId: 'p1', frozenAt: '2026-09-26T18:00:00.000Z', items, res: { i0: { ok: false, cnc: 'Materiales', imp: false, note: '' } } }];
  const errors = await openApp(page, { tab: 'ind', extra: [W] });
  await page.evaluate(() => { U.indMode = 'sem'; U.week = 58; render(); });
  const imputable = await page.evaluate(() => (P().cnc || []).find(c => cncImp(c)));
  const sel = page.locator('#nccard select[data-ncf="cnc"]');
  await sel.selectOption(imputable);
  await expect.poll(() => page.evaluate(() => { const r = window.__dbGet('weeks', '58_p1').res.i0; return [r.cnc, r.imp]; })).toEqual([imputable, null]);
  expect(await page.evaluate(() => resNimp(S.wk.get('58_p1').res.i0))).toBe(false);
  noErrors(errors, 'C-07');
});

/* ================= LPS-13 ================= */
test('LPS-13 · «Frente no entregado» que le cuenta a otra partida: el total del piso del Diario aplica la regla del Semanal', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind' });
  const r = await page.evaluate(() => {
    const p = { id: 'p1' }; const row = (sc, rc) => ({ p, sc, rc });
    const A = dayAgg([row('c1', { status: 'ok' }), row('c3', { status: 'no', cnc: 'Subcontratas', imp: false, rsc: 'c1', pc: true }), row('c3', { status: 'no', cnc: 'Materiales', imp: false })]);
    return { tot: A.tot.nimp, piso: A.piA.p1.nimp, sc: A.scA.c3.nimp };
  });
  expect(r).toEqual({ tot: 1, piso: 1, sc: 2 }); // para el piso, la que le cuenta a c1 es imputable; para c3 (el afectado) no
  noErrors(errors, 'LPS-13');
});

/* ================= C-32 ================= */
test('C-32 · el PPC diario pasado conserva el nombre de actividad y ambiente que guardó el registro', async ({ page }) => {
  const errors = await openApp(page, { tab: 'ind' });
  const ayer = '2026-09-30';
  await page.evaluate(() => { const x = S.act.get('i1'); S.act = new Map(S.act); S.act.set('i1', { ...x, name: 'Redes empotradas — renombrada', ambId: 'a1' }); DV++; });
  const r = await page.evaluate(d => { const row = dayData([d], new Set(['p1'])).rows.find(x => x.x.id === 'i1'); return { nm: row.x.name, amb: row.a.id, vivo: S.act.get('i1').name }; }, ayer);
  expect(r).toEqual({ nm: 'Redes empotradas', amb: 'a2', vivo: 'Redes empotradas — renombrada' });
  noErrors(errors, 'C-32');
});

/* ================= C-03 ================= */
test('C-03 · Hoy avisa la semana descongelada y cuándo se vuelve a congelar sola', async ({ page }) => {
  const errors = await openApp(page, { tab: 'hoy', extra: [sem(57, 'p2', 'c1', 4, 1, 3)] });
  await page.evaluate(() => unfreezeWeek(57, 'p2'));
  await page.evaluate(() => goTab('hoy'));
  const card = page.locator('[data-hoy="pdesc"]');
  await expect(card).toContainText('Semana 57');
  await expect(card).toContainText('se congela sola');
  await card.locator('[data-hgo]').click();
  await expect.poll(() => page.evaluate(() => [U.tab, U.week])).toEqual(['plan', 57]);
  await expect(page.locator('section[data-pid="p2"] .callout')).toContainText('se congela sola tal como estaba');
  noErrors(errors, 'C-03');
});
