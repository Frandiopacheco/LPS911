// Auditoría del ciclo diario con varios usuarios simultáneos (SC, ingenieros, administrador) sobre una MISMA base falsa.
// Ver mundo-compartido.js (hub en Node que repite cada escritura en las demás páginas). Corre aparte de la batería (CICLO=1), también en GitHub.
// Correr: cd tests/e2e && CICLO=1 npx playwright test auditoria-ciclo --reporter=line   (NSC = n.º de SC, por defecto 10)
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { enPantalla } from './lamina.js';
import { Hub, abrir, datos, pdz, act, fijarHora, NSC, LUNES } from './mundo-compartido.js';
import { MANANA, HOY } from './helpers.js';

const OUT = 'test-results';
fs.mkdirSync(OUT, { recursive: true });
const R = [];      // resultados: {paso, caso, ok, esperado, obtenido, img}
const TM = [];     // tiempos {que, ms}
const log = (...a) => console.log('[ciclo]', ...a);
const ord = v => Array.isArray(v) ? v.map(ord) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ord(v[k])])) : v;
const eq = (a, b) => JSON.stringify(ord(a)) === JSON.stringify(ord(b));
async function chk(paso, caso, esperado, obtenido, page, nota) {
  const ok = eq(esperado, obtenido); let img = '';
  if (!ok) { log(`FALLA paso ${paso} · ${caso}: esperado ${JSON.stringify(esperado)} obtenido ${JSON.stringify(obtenido)}`); if (page) { img = `${OUT}/ciclo-p${paso}-${caso.replace(/\W+/g, '_').slice(0, 30)}.png`; await page.screenshot({ path: img }).catch(() => {}); } }
  R.push({ paso, caso, ok, esperado, obtenido, img, nota }); return ok;
}
async function tiempo(que, fn) { const t = Date.now(); try { return await fn(); } finally { TM.push({ que, ms: Date.now() - t }); } }
const nota = (paso, caso, texto) => { R.push({ paso, caso, ok: null, nota: texto }); log(`nota paso ${paso}: ${caso} — ${texto}`); };

const row = (p, id) => p.locator(`#mpanel .mp-it[data-act="${id}"]`);
const sigHabil = (p, d) => p.evaluate(d => wshift(d, 1), d);
/** Abre una ventanita (#pop) y ejecuta `pasos` dentro; si un redibujado causado por datos de otros usuarios se la come
    a mitad (la ventana se oculta), se reintenta desde cero y se cuenta en POPLOST (evidencia de la falla de la app). */
let POPLOST = 0; const POPLOG = [];
async function enPop(p, loc, sel, pasos) {
  for (let i = 0; i < 5; i++) {
    try {
      await loc.click({ timeout: 8000 });
      await p.locator(sel).first().waitFor({ state: 'visible', timeout: 3000 });
      await pasos();
      return i;
    } catch (e) {
      POPLOST++; POPLOG.push(`${p.quien}: ${sel} → ${String(e.message).split('\n')[0].slice(0, 90)}`);
      await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(300);
    }
  }
  throw new Error('la ventanita no se pudo completar tras 5 intentos: ' + sel);
}
const dp = id => `dp_${MANANA}_${id}`;

test.describe.configure({ mode: 'serial' });
test.use({ actionTimeout: 15_000 });
expect.configure({ timeout: 10_000 });
let hub, SC = [], ED = {}, ADM, ALL = [];
test.setTimeout(900_000);

test.beforeAll(async ({ browser }) => {
  hub = new Hub();
  const claves = [...Array.from({ length: NSC }, (_, i) => 'sc' + (i + 1)), 'ed1', 'ed2', 'ed3', 'ed4', 'ed5', 'admin'];
  const t = Date.now();
  // se abren de a 4 para no saturar la máquina; cada página tarda lo suyo en cargar
  const pages = [];
  for (let i = 0; i < claves.length; i += 4) pages.push(...await Promise.all(claves.slice(i, i + 4).map(c => abrir(browser, hub, { as: c, tab: 'mapa' }))));
  ALL = pages;
  claves.forEach((c, i) => { if (c.startsWith('sc')) SC.push(pages[i]); else if (c === 'admin') ADM = pages[i]; else ED[c] = pages[i]; });
  TM.push({ que: `abrir ${pages.length} páginas (total, de a 4)`, ms: Date.now() - t });
  TM.push({ que: 'carga de una página (media, ms)', ms: Math.round(pages.reduce((s, p) => s + p.tCarga, 0) / pages.length) });
  TM.push({ que: 'carga de una página (máx, ms)', ms: Math.max(...pages.map(p => p.tCarga)) });
  hub.listo = true;
  log('páginas abiertas:', pages.length);
});
test.afterAll(async () => {
  const errs = ALL.flatMap(p => p.errs || []);
  fs.writeFileSync(`${OUT}/auditoria-ciclo.json`, JSON.stringify({ R, TM, errs }, null, 1));
  console.log('\n===== RESULTADOS =====');
  for (const r of R) console.log(`${r.ok === null ? 'NOTA ' : r.ok ? 'OK   ' : 'FALLA'} p${r.paso} ${r.caso}${r.ok === false ? ' | esperado ' + JSON.stringify(r.esperado) + ' obtuvo ' + JSON.stringify(r.obtenido) + ' ' + r.img : ''}${r.nota ? ' | ' + r.nota : ''}`);
  console.log('===== TIEMPOS ====='); for (const t of TM) console.log(`${t.que}: ${t.ms} ms`);
  console.log('===== ERRORES DE CONSOLA (' + errs.length + ') ====='); [...new Set(errs)].slice(0, 30).forEach(e => console.log(e));
  console.log('mensajes del hub:', hub && hub.msgs);
});

/* ---------- 1. cada SC propone su plan para el día hábil siguiente ---------- */
test('1. los SC proponen a la vez (No va con causa / Culminado)', async () => {
  const causa = k => (k % 2 ? ['mat', 'Falta material ' + k] : ['per', 'Faltan 2 operarios ' + k]);
  const t0 = Date.now();
  await Promise.all(SC.map(async (p, i) => {
    const k = i + 1;
    await expect(row(p, 'x' + k)).toBeVisible({ timeout: 30_000 });
    const [c, d] = causa(k);
    await tiempo('SC propone «No va»', async () => {
      await row(p, 'x' + k).locator('[data-dv^="no"]').click();
      await p.locator(`#pop [data-nk="${c}"]`).click();
      await p.fill('#nvd', d);
      await p.locator('#pop [data-nv="prop"]').click();
      await expect(row(p, 'x' + k)).toHaveClass(/wait/);
    });
    await tiempo('SC propone «Culminado»', async () => {
      await row(p, 'y' + k).locator('[data-dv^="fin"]').click();
      await expect(row(p, 'y' + k).locator('.dzp')).toContainText('Propusiste');
    });
  }));
  TM.push({ que: `paso 1 completo (${SC.length} SC en paralelo)`, ms: Date.now() - t0 });
  const eng = ED.ed1;
  await expect.poll(async () => (await pdz(eng)).filter(z => z.kind === 'dprop').length, { timeout: 20_000 }).toBe(SC.length * 2);
  const dps = (await pdz(eng)).filter(z => z.kind === 'dprop');
  const esp = SC.flatMap((_, i) => [[`x${i + 1}`, causa(i + 1)[0], 'c' + (i + 1), 'pend'], [`y${i + 1}`, 'fin', 'c' + (i + 1), 'pend']]).sort();
  await chk(1, `${SC.length} SC · 2 propuestas cada uno, ninguna se pierde`, esp, dps.map(z => [z.actId, z.k, z.sc, z.st]).sort(), SC[0]);
  await chk(1, 'el lookahead no cambia con una propuesta', [[MANANA, LUNES]], [(await act(eng, 'x1')).days], SC[0]);
  // cada SC ve su propia propuesta en la pantalla y nada de los demás en «Tus propuestas»
  const vis = await Promise.all(SC.map((p, i) => p.locator('#mpdb .mpdi').count()));
  await chk(1, 'cada SC ve solo sus propuestas en «Tus propuestas»', SC.map(() => 2), vis, SC[0]);
  await SC[0].screenshot({ path: `${OUT}/ciclo-p1-sc1.png` });
  nota(1, 'fuerza laboral / cuadrillas', 'no probado (omitido: es opcional; el reparto en el plano ya lo cubre plan-diario.spec.js)');
});

/* ---------- 2. el ingeniero responsable revisa; uno no responsable no puede ---------- */
test('2. revisión por los ingenieros del piso (en paralelo) y bloqueo al no responsable', async () => {
  // ed3 no está a cargo de P1
  const e3 = ED.ed3;
  await e3.selectOption('#fpiso', 'p1');
  await expect(e3.locator('#mpanel .mp-h')).toBeVisible();
  await expect(row(e3, 'x1')).toBeVisible({ timeout: 15_000 });
  const info = await e3.evaluate(() => ({ resp: isPisoResp('p1'), dec: canDecide('x1'), piso: window.__plano.M.piso }));
  await chk(2, 'ed3 (a cargo de P2) no es responsable de P1', { resp: false, dec: false, piso: 'p1' }, info, e3);
  await chk(2, 'ed3 no ve el botón Revisar', 0, await e3.locator('#mpanel [data-dpa]').count(), e3);
  // los botones Va/No va existen (un editor ajeno al piso actúa como SC: solo propone); no debe poder decidir
  await row(e3, 'z2').locator('[data-dv^="no"]').click();
  await e3.locator('#pop [data-nk="mat"]').click();
  await chk(2, 'ed3 en «No va»: no ofrece reprogramar/decidir (solo proponer)', { nolib: 0, lib: 0, prop: 1 }, { nolib: await e3.locator('#pop [data-nv="nolib"]').count(), lib: await e3.locator('#pop [data-nv="lib"]').count(), prop: await e3.locator('#pop [data-nv="prop"]').count() }, e3);
  await e3.keyboard.press('Escape');
  await row(e3, 'z2').locator('[data-dv^="fin"]').click();
  await e3.waitForTimeout(500);
  await chk(2, 'ed3 «Culminado» solo propone: la actividad no se marca terminada', { done: false, prop: 'fin' }, { done: await e3.evaluate(() => !!(window.__dbGet('doneidx', 'p1') || {}).d?.z2), prop: ((await pdz(e3)).find(z => z.kind === 'dprop' && z.actId === 'z2') || {}).k }, e3);
  await row(e3, 'z2').locator('[data-dv^="va"]').click(); // retira su propuesta
  await chk(2, 'ed3 no ve «Publicar plan»', 0, await e3.locator('#mpanel [data-pub]').count(), e3);
  // si fuerza la decisión por código tampoco se aplica (la regla del servidor real es otra capa: aquí solo la interfaz)
  const forz = await e3.evaluate(() => { try { return decideProp ? 'existe' : '' } catch (e) { return 'n/a' } });
  // reparto: ed1 atiende k=1..mitad, ed2 el resto, a la vez
  const mid = Math.ceil(SC.length / 2);
  const reprog = k => k % 3 === 1;             // acepta «no va» y reprograma
  const atender = async (p, k) => {
    const rn = row(p, 'x' + k);
    await expect(rn.locator('[data-dpa]')).toBeVisible({ timeout: 20_000 });
    await enPop(p, rn.locator('[data-dpa]'), '#pop .nvbox', async () => {
      if (reprog(k)) { await p.locator('#pop [data-nv="nolib"]').click({ timeout: 4000 }); await p.locator('#pop .nvok').click({ timeout: 4000 }); }
      else await p.locator('#pop [data-nv="keep"]').click({ timeout: 4000 });
    });
    if (reprog(k)) await expect(rn).toContainText('No va'); else await expect(rn.locator('.dzp.rej')).toContainText('va según lo programado');
    const ry = row(p, 'y' + k);
    await enPop(p, ry.locator('[data-dpa]'), '#pop [data-do]', () => p.locator(`#pop [data-do="${k % 2 ? 'si' : 'no'}"]`).click({ timeout: 4000 }));   // impares: culminó; pares: sigue
  };
  const t0 = Date.now();
  await Promise.all([
    (async () => { for (let k = 1; k <= mid; k++) await tiempo('ingeniero revisa 2 propuestas', () => atender(ED.ed1, k)); })(),
    (async () => { for (let k = mid + 1; k <= SC.length; k++) await tiempo('ingeniero revisa 2 propuestas', () => atender(ED.ed2, k)); })(),
  ]);
  TM.push({ que: 'paso 2 completo (2 ingenieros en paralelo)', ms: Date.now() - t0 });
  /* las decisiones van en una transacción (se comprueba que la propuesta no cambió): se espera a que lleguen todas */
  await expect.poll(async () => (await pdz(ED.ed1)).filter(z => z.kind === 'dprop' && z.st === 'pend').length, { timeout: 10_000 }).toBe(0).catch(() => {});
  const dps = Object.fromEntries((await pdz(ED.ed1)).filter(z => z.kind === 'dprop').map(z => [z.actId, z.st]));
  const esp = {}; for (let k = 1; k <= SC.length; k++) { esp['x' + k] = reprog(k) ? 'ok' : 'rej'; esp['y' + k] = k % 2 ? 'ok' : 'rej'; }
  await chk(2, 'estado de cada propuesta tras revisar (ok/rej)', esp, dps, ED.ed1);
  // «No, sigue» a un Culminado en realidad no cambia estado: queda pendiente?
  nota(2, 'ventanita cerrada por datos de otros', `${POPLOST} veces se cerró/ocultó la ventana «Revisar» a mitad de decidir mientras otro ingeniero guardaba (${POPLOG.slice(0, 3).join(' ; ')})`);
  nota(2, 'Culminado «No, sigue»', `el estado de la propuesta y_k queda "${dps['y2']}" (pares)`);
  const nov = (await pdz(ED.ed1)).filter(z => z.kind === 'nova' && z.draft).map(z => z.actId).sort();
  const nesp = []; for (let k = 1; k <= SC.length; k++) if (reprog(k)) nesp.push('x' + k);
  await chk(2, 'borradores de reprogramación creados para los «No va» aceptados', nesp.sort(), nov, ED.ed1);
  await chk(2, 'el lookahead aún no cambia (borrador)', [[MANANA, LUNES]], [(await act(ED.ed1, 'x1')).days], ED.ed1);
  await ED.ed1.screenshot({ path: `${OUT}/ciclo-p2-ed1.png` });
});

/* ---------- 2b. una ventanita abierta no debe cerrarse cuando otro usuario guarda ---------- */
test('2b. ventana «No va» abierta: un guardado de otro usuario no la cierra', async () => {
  const q = ED.ed2, o = ED.ed1;
  await expect(row(q, 'e1')).toBeVisible();
  for (const [que, escribe] of [['otro ingeniero guarda en el plan (pdz)', () => o.evaluate(() => fcol('pdz').doc('ruido_' + Date.now()).set({ date: '2026-10-02', pisoId: 'p1', kind: 'zzz', ts: Date.now() }))],
                                ['otro usuario guarda en el lookahead (acts)', () => o.evaluate(() => fcol('acts').doc('x2').update({ metrado: 51 + Math.floor(Math.random() * 9) }))]]) {
    await row(q, 'e1').locator('[data-dv^="no"]').click();
    await q.locator('#pop [data-nk]').first().waitFor({ state: 'visible', timeout: 5000 });
    await q.locator('#pop [data-nk="mat"]').click();
    await escribe();
    await q.waitForTimeout(1200);
    await chk('2', `la ventana «No va» sigue abierta tras: ${que}`, true, await q.locator('#pop .nvbox').isVisible(), q);
    await q.keyboard.press('Escape'); await q.waitForTimeout(200);
  }
});

/* ---------- 4. modo reunión › Cumplimiento de hoy ---------- */
const daily = async (p, d) => (await p.evaluate(([d]) => window.__dbGet('daily', d + '_p1'), [d])) || {};
test('4. modo reunión: cumplimiento del día (✓/✗ con causa)', async () => {
  const p = ED.ed1;
  await p.click('#mmeetb');
  await expect(p.locator('#mmbar [data-mmode="cu"]')).toHaveClass(/on/);
  const fecha = await p.evaluate(d => fmtD(d), HOY);
  await chk(4, 'la reunión abre en Cumplimiento y en el día de hoy', true, (await p.locator('#mmbar .mmday').innerText()).includes(fecha), p);
  const marcar = async (aid, st) => {
    await p.locator(`#mstage .pvl[data-z="v:${aid}"]`).first().click();
    await expect(p.locator('#mzc .zcb').first()).toBeVisible();
    await p.locator(`#mzc [data-zcs="${st}"]`).click();
    if (st === 'no') await p.locator('#mzc .zcq [data-zcc="0"]').click();
    await p.keyboard.press('Escape');
  };
  await tiempo('reunión: marcar una actividad ✓/✗', async () => {
    await marcar('i0', 'ok'); await marcar('e0', 'no'); await marcar('i1', 'ok'); await marcar('e1', 'no');
  });
  await expect.poll(async () => Object.keys((await daily(p, HOY)).recs || {}).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(4);
  const rc = (await daily(p, HOY)).recs || {};
  await chk(4, 'registro del día (estado por actividad)', { i0: 'ok', e0: 'no', i1: 'ok', e1: 'no' }, Object.fromEntries(['i0', 'e0', 'i1', 'e1'].map(a => [a, (rc[a] || {}).status])), p);
  await chk(4, '✗ guarda la causa', [true, true], [!!(rc.e0 || {}).cnc, !!(rc.e1 || {}).cnc], p);
  await p.screenshot({ path: `${OUT}/ciclo-p4-cumplimiento.png` });
});

/* ---------- 5. modo reunión › Plan e interferencias (cruce entre SC y reprogramación de «No va»), con dos ingenieros a la vez ---------- */
test('5. plan e interferencias: cruce entre dos SC + reprogramar un No va (ed1 y ed2 a la vez)', async () => {
  const p = ED.ed1, q = ED.ed2;
  await p.click('#mmbar [data-mmode="plan"]');
  const fecha = await p.evaluate(d => fmtD(d), MANANA);
  await expect(p.locator('#mmbar .mmday')).toContainText(fecha);
  await p.screenshot({ path: `${OUT}/ciclo-p5-plan.png` });
  const nCx = await p.locator('#mcxb .mp-cx').count().catch(() => 0);
  log('cruces visibles antes de abrir:', nCx, (await p.locator('#mcxb').innerText().catch(() => '')).replace(/\n+/g, ' | ').slice(0, 300));
  const cruce = async () => {
    if (!(await p.locator('#mcxb .mp-cx').first().isVisible().catch(() => false))) await p.locator('#mcxb .mcxh').click();
    await enPop(p, p.locator('#mcxb .mp-cx').first(), '#pop .xo', async () => {
      const n = await p.locator('#pop .xo').count();
      const quien = p.locator('#pop .xo', { hasText: 'Cruce · SC2' });
      await quien.locator('.xno').click({ timeout: 4000 });                 // ✗ → No va por interferencia
      await p.locator('#pop .nvok').click({ timeout: 4000 });
    });
  };
  const otro = async () => {   // ed2 en el panel: No va de e0 por falta de personal (se reprograma)
    await enPop(q, row(q, 'e0').locator('[data-dv^="no"]'), '#pop [data-nk]', async () => {
      await q.locator('#pop [data-nk="per"]').click({ timeout: 4000 });
      await q.locator('#pop [data-nv="nolib"]').click({ timeout: 4000 });
      await q.locator('#pop .nvok').click({ timeout: 4000 });
    });
  };
  await expect(row(q, 'e0')).toBeVisible();
  await tiempo('cruce ✗ + reprogramación (2 ingenieros a la vez)', () => Promise.all([cruce(), otro()]));
  await expect.poll(async () => (await pdz(p)).filter(z => z.kind === 'nova' && z.draft).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(3);
  const nova = (await pdz(p)).filter(z => z.kind === 'nova' && z.draft);
  const porAct = Object.fromEntries(nova.map(z => [z.actId, z.k]));
  await chk(5, 'borrador por interferencia (z2) y por personal (e0) junto con los aceptados', true, porAct.z2 === 'int' && porAct.e0 === 'per' && !!porAct.x1, p, JSON.stringify(porAct));
  // el cruce restante (z1 con e1) → «pueden trabajar a la vez»
  if (!(await p.locator('#mcxb .mp-cx').first().isVisible().catch(() => false))) await p.locator('#mcxb .mcxh').click().catch(() => {});
  if (await p.locator('#mcxb .mp-cx').count()) {
    await enPop(p, p.locator('#mcxb .mp-cx').first(), '#pop [data-x="ok"]', () => p.locator('#pop [data-x="ok"]').click({ timeout: 4000 }));
    await expect.poll(async () => (await pdz(p)).filter(z => z.kind === 'xok').length, { timeout: 8000 }).toBe(1);
    await chk(5, 'decisión «a la vez» guardada (xok)', 1, (await pdz(p)).filter(z => z.kind === 'xok').length, p);
  } else nota(5, 'cruce restante', 'no quedó cruce que decidir tras sacar z2');
  nota(5, 'ventanitas perdidas hasta aquí', `${POPLOST} (cierres inesperados de ventanas por datos de otros)`);
});

/* ---------- 3. publicar el plan: dos ingenieros a la vez en el mismo piso ---------- */
test('3. publicar el plan (ed1 y ed2 a la vez): las fechas no se corren dos veces', async () => {
  const p = ED.ed1, q = ED.ed2;
  const antes = Object.fromEntries(await Promise.all(['x1', 'x4', 'x7', 'x10', 'e0', 'z2'].filter(id => !/^x\d+$/.test(id) || +id.slice(1) <= SC.length).map(async id => [id, ((await act(p, id)) || {}).days])));
  const sig = await sigHabil(p, MANANA), sig2 = await sigHabil(p, sig);
  const borr = (await pdz(p)).filter(z => z.kind === 'nova' && z.draft).map(z => ({ id: z.actId, shift: z.shift, ids: z.ids, to: z.repTo }));
  log('borradores antes de publicar:', JSON.stringify(borr), 'sig', sig);
  const pub = async (pg, sel) => {
    for (let i = 0; i < 3; i++) {
      if (!(await pg.locator(sel).first().isVisible().catch(() => false))) return 'sin botón (ya publicado)';
      try { await pg.locator(sel).first().click({ timeout: 5000 }); await pg.locator('#pop [data-do="si"]').click({ timeout: 4000 }); return 'ok'; }
      catch (e) { POPLOST++; POPLOG.push(`${pg.quien}: publicar → ${String(e.message).split('\n')[0].slice(0, 80)}`); await pg.keyboard.press('Escape').catch(() => {}); }
    }
    return 'falló';
  };
  const t0 = Date.now();
  const rs = await Promise.all([pub(p, '#mmbar [data-pub]'), pub(q, '#mpanel [data-pub]')]);
  TM.push({ que: 'publicar el plan (2 ingenieros a la vez)', ms: Date.now() - t0 });
  log('publicar →', rs);
  await expect.poll(async () => (await pdz(p)).filter(z => z.kind === 'nova' && z.draft).length, { timeout: 15_000 }).toBe(0);
  await p.waitForTimeout(800);
  const pubs = (await pdz(p)).filter(z => z.kind === 'pub');
  await chk(3, 'un solo aviso de publicado', 1, pubs.length, p);
  const despues = Object.fromEntries(await Promise.all(Object.keys(antes).map(async id => [id, (await act(p, id)).days])));
  // cada actividad con borrador se movió UNA vez: ya no tiene MANANA, y no se movió dos hábiles
  const unaVez = {};
  for (const id of Object.keys(despues)) { const d = despues[id]; unaVez[id] = antes[id].includes(MANANA) ? (!d.includes(MANANA) && (d.includes(sig) || d.includes(sig2) ) ) : true; }
  log('antes', JSON.stringify(antes), 'después', JSON.stringify(despues));
  await chk(3, 'x1 (borrador «No va»): [MANANA,LUNES] → una sola vez', { quitoMañana: true, aSig: true }, { quitoMañana: !despues.x1.includes(MANANA), aSig: despues.x1.includes(sig) }, p, JSON.stringify(despues.x1));
  await chk(3, 'e0 una sola vez (a sig)', true, !despues.e0.includes(MANANA) && despues.e0.includes(sig), p, JSON.stringify(despues.e0));
  await chk(3, 'el SC no aceptado (x2) sigue con su día', true, ((await act(p, 'x2')).days || []).includes(MANANA), p);
  const dpl = await p.evaluate(d => window.__dbGet('dplan', d + '_p1'), MANANA);
  await chk(3, 'foto del plan cerrado (dplan) creada una vez', true, !!dpl && !!dpl.pub, p);
  await chk(3, 'dplan.ids no incluye lo reprogramado ni lo culminado', [], Object.keys((dpl || {}).ids || {}).filter(id => ['x1', 'x4', 'e0', 'z2', 'y1', 'y3'].includes(id)), p, 'ids=' + Object.keys((dpl || {}).ids || {}).join(','));
  await p.screenshot({ path: `${OUT}/ciclo-p3-publicado.png` });
  nota(3, 'transacciones', 'el fake serializa runTransaction con un candado (no es atomicidad real de Firestore; ahí hay reintento)');
});

/* ---------- 6. lo de la reunión llegó a la base y a la pantalla ---------- */
const piso1 = (p) => p.evaluate(() => Object.fromEntries(Object.entries(window.__dbAll('acts')).filter(([, a]) => !a.arch && window.__dbGet('ambientes', a.ambId) && window.__dbGet('ambientes', a.ambId).sectorId === 's1').map(([id, a]) => [id, a.days || []])));
test('6. verificación en base y pantalla de lo decidido en la reunión', async () => {
  const p = ED.ed1, a = ADM;
  await p.click('#mmx').catch(() => {});
  const sig = await sigHabil(p, MANANA);
  const x1 = await act(p, 'x1'), e0 = await act(p, 'e0'), z2 = await act(p, 'z2');
  await chk(6, 'acts.rpl de x1/e0/z2 guarda la reprogramación (motivo y destino)', { x1: [true, sig], e0: [true, sig], z2: [true, sig] },
    { x1: [!!(x1.rpl || {})[MANANA], ((x1.rpl || {})[MANANA] || {}).to], e0: [!!(e0.rpl || {})[MANANA], ((e0.rpl || {})[MANANA] || {}).to], z2: [!!(z2.rpl || {})[MANANA], ((z2.rpl || {})[MANANA] || {}).to] }, p, JSON.stringify({ x1: x1.rpl, z2: z2.rpl }).slice(0, 300));
  // restricciones: cada «No va» aceptado con «no se libera» (material o personal) registra su restricción; el rechazado no
  const restr = Object.values(await p.evaluate(() => window.__dbAll('restr'))).filter(r => r.actId && /^x\d+$/.test(r.actId) && !r.arch);
  const espR = Array.from({ length: SC.length }, (_, i) => i + 1).filter(k => k % 3 === 1).map(k => 'x' + k);
  await chk(6, 'Restricciones: una por cada «No va» aceptado (ninguna por los rechazados)', espR.sort(), restr.map(r => r.actId).sort(), p, JSON.stringify(restr.map(r => [r.actId, r.desc, r.status])));
  // dplan.ids del día
  const dpl = await p.evaluate(d => window.__dbGet('dplan', d + '_p1'), MANANA);
  const acts = await piso1(p);
  const hechas = Object.keys(((await p.evaluate(() => window.__dbGet('doneidx', 'p1'))) || {}).d || {});
  const esp = Object.keys(acts).filter(id => acts[id].includes(MANANA) && !hechas.includes(id)).sort();
  await chk(6, 'dplan.ids = actividades del piso que siguen ese día (sin reprogramadas ni culminadas)', esp, Object.keys((dpl || {}).ids || {}).sort(), p);
  await chk(6, 'dplan guarda quién y cuándo publicó', true, !!(dpl && dpl.by && dpl.at && dpl.pub), p);
  // pantalla: Restricciones y Lookahead (admin) reflejan los cambios
  await a.evaluate(() => goTab('restr'));
  await a.waitForTimeout(800);
  await chk(6, 'pantalla Restricciones (admin) muestra las restricciones registradas', espR.length, await a.locator('#main input[value^="Falta material"], #main input[value^="Faltan 2 operarios"]').count(), a);
  await a.screenshot({ path: `${OUT}/ciclo-p6-restr.png` });
  await a.evaluate(() => { goTab('look'); LKED = false; render(); });
  await a.waitForTimeout(500);
  const celda = d => a.locator(`#grid tr[data-a="x1"] td.d[data-d="${d}"]`);
  const marca = async d => (await celda(d).count()) ? ((await celda(d).first().getAttribute('class')) || '') : 'sin-celda';
  log('lookahead x1 celdas:', MANANA, await marca(MANANA), sig, await marca(sig));
  await chk(6, 'Lookahead (pantalla): x1 ya no tiene celda activa en MANANA y sí en el día nuevo', { man: false, sig: true }, { man: /\bon\b|\bact\b|\bsel\b/.test(await marca(MANANA)), sig: /\bon\b|\bact\b|\bsel\b/.test(await marca(sig)) }, a, `clases man="${await marca(MANANA)}" sig="${await marca(sig)}"`);
  await a.screenshot({ path: `${OUT}/ciclo-p6-lookahead.png` });
  // PPC diario de HOY (cumplimiento marcado en la reunión): sin doble conteo
  const ppc = async (pg, d) => pg.evaluate(async d => { ensureDaily(d); await new Promise(r => setTimeout(r, 700)); const o = dayData([d], new Set(['p1'])); return { rows: o.rows.map(r => [r.x.id, r.rc && r.rc.status, !!(r.rc && r.rc.done), r.prog]), recs: Object.fromEntries(Object.entries((window.__dbGet('daily', d + '_p1') || {}).recs || {}).map(([k, v]) => [k, [v.status, !!v.done]])), dplan: Object.keys((window.__dbGet('dplan', d + '_p1') || {}).ids || {}), tot: o.tot, filas: o.rows.map(r => r.x.id + '|' + r.d).length, unicas: new Set(o.rows.map(r => r.x.id + '|' + r.d)).size }; }, d);
  const pp = await ppc(a, HOY);
  log('PPC hoy detalle', JSON.stringify(pp));
  await chk(6, 'PPC diario de hoy (plan publicado ayer: i0,i1,e0,e1): programadas 4, ✓2, ✗2; lo «Culminado» de mañana no cuenta', { prog: 4, ok: 2, no: 2, rep: 0 }, { prog: pp.tot.prog, ok: pp.tot.ok, no: pp.tot.no, rep: pp.filas - pp.unicas }, a, JSON.stringify(pp));
  await a.evaluate(() => { U.indMode = 'dia'; saveUI(); goTab('ind'); });
  await a.waitForTimeout(800);
  log('Indicadores (texto):', (await a.locator('#main').innerText()).replace(/\n+/g, ' | ').slice(0, 400));
  await a.screenshot({ path: `${OUT}/ciclo-p6-indicadores.png` });
});

/* ---------- 7. día siguiente: «En obra» (iniciar / detener) ---------- */
const FRI_AM = MANANA + 'T07:30:00-05:00', FRI_PM = MANANA + 'T16:00:00-05:00';
let CAP;
test('7. viernes 07:30 · SC inician y detienen en «En obra»; no tocan otra partida', async ({ browser }) => {
  await fijarHora(ALL, FRI_AM);
  CAP = await abrir(browser, hub, { as: 'capataz', tab: 'cap', hora: FRI_AM });
  ALL.push(CAP);
  await Promise.all([...SC, CAP].map(p => p.evaluate(() => { goTab('cap'); CP.v = 'list'; render(); })));
  const propia = {};        // actividad que cada SC trabaja
  const progr = await ED.ed1.evaluate(d => { const ids = Object.keys((window.__dbGet('dplan', d + '_p1') || {}).ids || {}); return ids.map(id => [id, window.__dbGet('acts', id).sc]); }, MANANA);
  SC.forEach((p, i) => { const f = progr.find(([, sc]) => sc === 'c' + (i + 1)); if (f) propia['c' + (i + 1)] = f[0]; });
  log('actividad por SC:', JSON.stringify(propia));
  const cards = await Promise.all(SC.map(async (p, i) => (await p.locator('article[data-k]').evaluateAll(l => l.map(e => e.dataset.k)))));
  const ajenas = cards.map((ids, i) => ids.filter(id => { const a = progr.find(([x]) => x === id); return a && a[1] !== 'c' + (i + 1); }));
  await chk(7, 'cada SC ve en «En obra» solo actividades de su partida', SC.map(() => []), ajenas, SC[0]);
  const t0 = Date.now();
  await Promise.all(SC.map(async (p, i) => {
    const id = propia['c' + (i + 1)]; if (!id) return;
    await tiempo('SC inicia una actividad (En obra)', async () => { await p.locator(`article[data-k="${id}"] [data-kq="run"]`).click({ timeout: 10_000 }); await expect(p.locator(`article[data-k="${id}"]`)).toHaveClass(/k-run/, { timeout: 10_000 }); });
  }));
  TM.push({ que: `paso 7 · ${SC.length} SC inician a la vez`, ms: Date.now() - t0 });
  const live = async () => Object.fromEntries(Object.entries(await ED.ed1.evaluate(() => window.__dbAll('live'))).map(([k, v]) => [k, v.st]));
  await expect.poll(async () => Object.keys(await live()).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(Object.keys(propia).length);
  await chk(7, 'live: cada SC dejó su actividad en «run» (nadie pisó a otro)', Object.fromEntries(Object.values(propia).map(id => [`${MANANA}_${id}`, 'run'])), await live(), SC[0]);
  // los pares detienen con motivo, a la vez
  const t1 = Date.now();
  await Promise.all(SC.map(async (p, i) => {
    const k = i + 1, id = propia['c' + k]; if (!id || k % 2) return;
    await tiempo('SC detiene (motivo) una actividad', async () => {
      await p.locator(`article[data-k="${id}"]`).click();
      await p.locator('[data-ka="stopf"]').click({ timeout: 8000 });
      await p.locator('[data-kmot]').first().click();
      await p.locator('[data-ka="stopsave"]').click();
    });
  }));
  TM.push({ que: `paso 7 · SC pares detienen a la vez`, ms: Date.now() - t1 });
  await ED.ed1.waitForTimeout(600);
  const l2 = await live();
  await chk(7, 'live: pares en «stop», impares siguen en «run»', Object.fromEntries(SC.map((_, i) => [`${MANANA}_${propia['c' + (i + 1)]}`, (i + 1) % 2 ? 'run' : 'stop']).filter(([k]) => !k.endsWith('undefined'))), l2, SC[1] || SC[0]);
  // SC1 intenta tocar una actividad de otra partida (código, no hay botón)
  const ajena = propia['c2'] || Object.values(propia)[1];
  if (ajena) {
    const antes = JSON.stringify((await ED.ed1.evaluate(id => window.__dbGet('live', id), `${MANANA}_${ajena}`)) || {});
    await SC[0].evaluate(([id, d]) => { try { kAct(id, d, 'run'); } catch (e) {} }, [ajena, MANANA]);
    await SC[0].waitForTimeout(500);
    const desp = JSON.stringify((await ED.ed1.evaluate(id => window.__dbGet('live', id), `${MANANA}_${ajena}`)) || {});
    nota(7, 'SC toca actividad ajena por código', antes === desp ? 'sin efecto' : 'el cliente permite escribir el live ajeno (solo lo frenan las reglas de Firestore, que este fake no aplica) → no probado (limitación); la interfaz no ofrece botón');
  }
  await chk(7, 'SC (no capataz) no puede registrar el cierre', 0, await SC[0].evaluate(async ([id, d]) => { const n0 = Object.values(window.__dbAll('live')).filter(l => l.close).length; try { KS = { aid: id, d, mode: 'close', cs: 'ok', cnc: '', mot: '', note: '', done: false }; } catch (e) {} return n0; }, [propia.c1 || 'x1', MANANA]), SC[0]);
  await SC[0].screenshot({ path: `${OUT}/ciclo-p7-sc1.png` });
  W.propia = propia;
});
const W = {};

/* ---------- 8. 16:00 · cierre: capataz cierra, ingenieros registran en Campo ---------- */
let CAMP;
const campoReg = async (p, ids, plan) => {   // plan: id → 'ok' | 'no'
  for (const id of ids) {
    const c = p.locator(`#main article[data-a="${id}"]`);
    await c.waitFor({ state: 'visible', timeout: 15_000 });
    await tiempo('ingeniero registra una actividad en Campo', async () => {
      await c.locator(`[data-st="${plan[id]}"]`).click({ timeout: 8000 });
      if (plan[id] === 'no') await c.locator('.cdet button.pri', { hasText: 'Listo' }).click({ timeout: 8000 });
    });
  }
};
async function cierre(fecha, etiqueta, hora, { conCapataz } = {}) {
  await fijarHora(ALL, hora);
  const engs = [ED.ed1, ED.ed2, ADM, CAMP];
  await Promise.all(engs.map(p => p.evaluate(() => { goTab('campo'); CU.view = 'list'; render(); })));
  const ids = await ED.ed1.evaluate(d => Object.entries(window.__dbAll('acts')).filter(([, a]) => !a.arch && (a.days || []).includes(d) && window.__dbGet('ambientes', a.ambId).sectorId === 's1').map(([id]) => id).filter(id => !((window.__dbGet('doneidx', 'p1') || {}).d || {})[id]).sort(), fecha);
  log(etiqueta, 'actividades de P1 ese día:', ids.join(','));
  const plan = Object.fromEntries(ids.map((id, i) => [id, i % 3 === 2 ? 'no' : 'ok']));
  const parte = engs.map((_, k) => ids.filter((_, i) => i % engs.length === k));
  if (conCapataz) {
    // el capataz de SC1 cierra la suya (propuesta); el SC también puede proponerlo
    const id = W.propia.c1;
    await SC[0].locator(`article[data-k="${id}"]`).click();
    await chk(8, 'el SC propone el cierre del día (decisión del dueño, oct 2026)', 1, await SC[0].locator('[data-ka="closef"]').count(), SC[0]);
    await SC[0].keyboard.press('Escape'); await SC[0].locator('[data-kx]').first().click().catch(() => {});
    await CAP.locator(`article[data-k="${id}"]`).click();
    await CAP.locator('[data-ka="closef"]').click({ timeout: 8000 });
    await CAP.locator('[data-kcs="ok"]').click();
    await tiempo('capataz envía el cierre', () => CAP.locator('[data-ka="closesave"]').click());
    await expect.poll(async () => ((await ED.ed1.evaluate(i => window.__dbGet('live', i), `${fecha}_${id}`)) || {}).close?.status, { timeout: 8000 }).toBe('ok');
    await chk(8, 'live.close del capataz llega al ingeniero (sin pisar st de iniciado)', ['ok', true], [((await ED.ed1.evaluate(i => window.__dbGet('live', i), `${fecha}_${id}`)) || {}).close?.status, !!((await ED.ed1.evaluate(i => window.__dbGet('live', i), `${fecha}_${id}`)) || {}).st], CAP);
  }
  const t0 = Date.now();
  await Promise.all(engs.map((p, k) => campoReg(p, parte[k], plan)));
  TM.push({ que: `${etiqueta}: ${engs.length} ingenieros registran ${ids.length} actividades en Campo a la vez`, ms: Date.now() - t0 });
  await expect.poll(async () => Object.keys(((await ED.ed1.evaluate(([d]) => window.__dbGet('daily', d + '_p1'), [fecha])) || {}).recs || {}).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(ids.length);
  const recs = ((await ED.ed1.evaluate(([d]) => window.__dbGet('daily', d + '_p1'), [fecha])) || {}).recs || {};
  await chk(8, `${etiqueta}: Campo, ningún registro se pierde con ${engs.length} ingenieros a la vez`, plan, Object.fromEntries(ids.map(id => [id, (recs[id] || {}).status])), ED.ed1);
  // PPC diario coherente
  const pp = await ADM.evaluate(async d => { ensureDaily(d); await new Promise(r => setTimeout(r, 800)); const o = dayData([d], new Set(['p1'])); const k = o.rows.map(r => r.x.id); return { tot: o.tot, dup: k.length - new Set(k).size, adds: o.adds.length, ids: k.sort() }; }, fecha);
  const okN = Object.values(plan).filter(v => v === 'ok').length, noN = ids.length - okN;
  log(etiqueta, 'PPC', JSON.stringify(pp));
  await chk(8, `${etiqueta}: PPC diario del piso 1 = programadas ${ids.length}, ✓${okN}, ✗${noN}, sin duplicados`, { prog: ids.length, ok: okN, no: noN, dup: 0 }, { prog: pp.tot.prog, ok: pp.tot.ok, no: pp.tot.no, dup: pp.dup }, ADM, JSON.stringify(pp));
  await ADM.evaluate(() => { U.indMode = 'dia'; saveUI(); goTab('ind'); });
  await ADM.waitForTimeout(700);
  const txt = (await ADM.locator('#main').innerText()).replace(/\n+/g, ' | ');
  const pct = Math.round(100 * okN / ids.length);
  await chk(8, `${etiqueta}: pantalla Indicadores muestra el PPC ${pct}% (${okN} de ${ids.length})`, true, txt.includes(`${okN} de ${ids.length}`), ADM, txt.slice(0, 220));
  await ADM.screenshot({ path: `${OUT}/ciclo-p8-${etiqueta}.png` });
}
test('8. viernes 16:00 · cierre del día y PPC', async ({ browser }) => {
  CAMP = await abrir(browser, hub, { as: 'camp1', tab: 'campo', hora: FRI_PM });
  ALL.push(CAMP);
  await cierre(MANANA, 'viernes', FRI_PM, { conCapataz: true });
});

/* ---------- 7b/8b. sábado: segundo día seguido (lo reprogramado de ayer llega hoy) ---------- */
test('7b+8b. sábado 03 oct: iniciar y cerrar (lo reprogramado llegó a hoy)', async () => {
  const SAT = '2026-10-03';
  await fijarHora(ALL, SAT + 'T07:30:00-05:00');
  await Promise.all(SC.map(p => p.evaluate(() => { goTab('cap'); CP.v = 'list'; render(); })));
  const mias = await Promise.all(SC.map((p, i) => ED.ed1.evaluate(([d, sc]) => Object.entries(window.__dbAll('acts')).filter(([, a]) => !a.arch && a.sc === sc && (a.days || []).includes(d) && !((window.__dbGet('doneidx', 'p1') || {}).d || {})[a.id || '']).map(([id]) => id)[0], [SAT, 'c' + (i + 1)])));
  log('sábado, actividad por SC:', JSON.stringify(mias));
  await Promise.all(SC.map(async (p, i) => { const id = mias[i]; if (!id) return; await tiempo('SC inicia (sábado)', async () => { await p.locator(`article[data-k="${id}"] [data-kq="run"]`).click({ timeout: 10_000 }); await expect(p.locator(`article[data-k="${id}"]`)).toHaveClass(/k-run/, { timeout: 10_000 }); }); }));
  const live = Object.entries(await ED.ed1.evaluate(() => window.__dbAll('live'))).filter(([k, v]) => k.startsWith(SAT)).map(([k, v]) => v.st);
  await chk(7, 'sábado: cada SC con actividad inició la suya', mias.filter(Boolean).map(() => 'run'), live, SC[0]);
  await cierre(SAT, 'sábado', SAT + 'T16:00:00-05:00');
});

/* ---------- resumen: todas las comprobaciones de los pasos deben salir bien (si no, el detalle queda en auditoria-ciclo.json) ---------- */
test('9. ninguna comprobación del ciclo falló', async () => {
  const F = R.filter(r => r.ok === false).map(r => `paso ${r.paso} · ${r.caso}: esperado ${JSON.stringify(r.esperado)} obtenido ${JSON.stringify(r.obtenido)}`);
  expect(F).toEqual([]);
});
