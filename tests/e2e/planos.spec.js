// Módulo Planos (docs/ia/planos.md): selector de módulo, quién lo ve, lector de nombres, carga (PDF → mosaicos) y visor.
// Storage se simula en memoria (plPut/plGet); el lector de PDF (pdf.js) se sirve desde node_modules.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openApp, noErrors } from './helpers.js';

const NM = path.join(path.dirname(new URL(import.meta.url).pathname), 'node_modules', 'pdfjs-dist', 'build');
const tabsVisibles = page => page.$$eval('#tabs button[data-tab]', bs => bs.filter(b => !b.hidden).map(b => b.dataset.tab));

/** PDF mínimo de una página (A3 apaisado) con un marco, líneas y el rótulo «ARQUITECTURA · AG03» */
function pdfDemo() {
  const W = 1191, H = 842;
  const ops = ['2 w 20 20 ' + (W - 40) + ' ' + (H - 40) + ' re S'];
  for (let i = 1; i < 30; i++) ops.push(`0.5 w ${40 + i * 37} 60 m ${40 + i * 37} ${H - 60} l S`);
  ops.push('BT /F1 14 Tf 800 60 Td (ARQUITECTURA) Tj ET', 'BT /F1 48 Tf 1000 50 Td (AG03) Tj ET', 'BT /F1 9 Tf 60 400 Td (CUARTO DE BOMBAS) Tj ET');
  const content = ops.join('\n');
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n';const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

/** Storage en memoria y pdf.js local */
async function preparar(page) {
  await page.route(/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@[^/]+\/build\/(pdf(\.worker)?\.min\.js)/, r => {
    const f = r.request().url().match(/(pdf(\.worker)?\.min\.js)/)[1];
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(path.join(NM, f)) });
  });
}
const memStorage = () => {
  window.__ST = new Map(); window.__GETS = [];
  window.plPut = async (p, blob) => { window.__ST.set(p, blob); };
  window.plGet = async p => { window.__GETS.push(p); const b = window.__ST.get(p); if (!b) throw new Error('404 ' + p); return b; };
};

test('admin: módulo Planos en el selector, sin los controles de Last Planner', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', editar: false });
  await expect(page.locator('#modsel [data-mod="pla"]')).toBeVisible();
  await page.click('#modsel [data-mod="pla"]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'pbib');
  expect(await tabsVisibles(page)).toEqual(['pbib', 'pcar', 'p3d']); // «Modelo 3D (beta)»: solo el administrador
  for (const s of ['#fpiso', '#bundo', '#bexport', '#wprev']) await expect(page.locator(s), s).toBeHidden();
  await expect(page.locator('#pname')).toHaveText('Planos del proyecto');
  await expect(page.locator('#pllist')).toContainText('Aún no hay planos cargados');
  await expect(page.locator('#ploff')).toHaveCount(0); // «sin conexión» es solo para tablet
  // se recuerda al recargar y se vuelve a Last Planner y al Tareo
  await page.reload();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15_000 });
  expect(await page.evaluate(() => U.mod)).toBe('pla');
  await page.click('#modsel [data-mod="tar"]');
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  await page.click('#modsel [data-mod="lps"]');
  expect(await tabsVisibles(page)).toContain('look');
  noErrors(errors, 'admin');
});

test('quién ve el módulo: lector, SC y Calidad solo consultan; Oficina Técnica carga; capataz y tareo no lo ven', async ({ page }) => {
  for (const [as, ve, carga] of [['lector', true, false], ['sc', true, false], ['calidad', true, false], ['ot', true, true], ['editor', true, true], ['tcap', false, false]]) {
    const errors = await openApp(page, { as, editar: false });
    const st = await page.evaluate(() => ({ ve: canPla(), carga: plaEd(), mods: MODS().map(m => m[0]) }));
    expect(st.ve, as).toBe(ve); expect(st.carga, as).toBe(carga);
    if (ve) {
      await page.evaluate(() => goMod('pla'));
      expect(await tabsVisibles(page), as).toEqual(carga ? ['pbib', 'pcar'] : ['pbib']);
      await page.evaluate(() => { U.tab = 'pcar'; render(); });
      await expect(page.locator('#main'), as).toHaveAttribute('data-view', carga ? 'pcar' : 'pbib');
    } else expect(st.mods).not.toContain('pla');
    noErrors(errors, as);
  }
});

test('lector de nombres: código, especialidad, piso y tipo según la nomenclatura del proyecto', async ({ page }) => {
  await openApp(page, { as: 'admin', editar: false });
  const r = await page.evaluate(() => {
    const p1 = [...S.pis.values()][0];
    return {
      p1: p1.code,
      a: plParse('2459243-PTSA-XXX-P01-P2D-ARQ-E05-AG03_PLANTA_PRIMER_PISO-Model.pdf'),
      b: plParse('2459243-PTSA-XXX-ZZZ-P2D-AGDES-EO5-IS18_AGUA Y DESAGUE AREA DE SERVIDUMBRE_RAPM_220524.pdf'),
      c: plParse('244559243-PTSA-XXX-ZZZ-P2D-ARQ-E05-AG17-VIA DE ACCESO.pdf'),
      d: plParse('2459243-PTSA-XXX-ZZZ-P2D-ARQ-E05-AG10_CORTES I J K L 22.10.25.pdf'),
      e: plParse('plano suelto.pdf'),
    };
  });
  expect(r.a).toMatchObject({ cod: 'AG03', disc: 'ARQ', niv: 'P1', tipo: 'Planta', tit: 'PLANTA PRIMER PISO', eta: 'E05' });
  expect(r.b).toMatchObject({ cod: 'IS18', disc: 'IS', eta: 'E05', tit: 'AGUA Y DESAGUE AREA DE SERVIDUMBRE' });
  expect(r.c).toMatchObject({ cod: 'AG17', disc: 'ARQ', tit: 'VIA DE ACCESO' });
  expect(r.d).toMatchObject({ cod: 'AG10', tipo: 'Corte', tit: 'CORTES I J K L' });
  expect(r.e.cod).toBe('');
});

test('carga: el PDF se procesa en mosaicos, se registra y se ve en el visor; otra carga es nueva revisión', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await preparar(page); /* después de openApp: su ruta genérica a las CDN gana si se registra después */
  await page.evaluate(memStorage);
  await page.evaluate(() => goMod('pla'));
  await page.click('#tabs [data-tab="pcar"]');
  const pdf = pdfDemo();
  const name = '2459243-PTSA-XXX-P01-P2D-ARQ-E05-AG03_PLANTA PRIMER PISO.pdf';
  await page.setInputFiles('#plfile', { name, mimeType: 'application/pdf', buffer: pdf });
  await expect(page.locator('#plqtab tbody tr')).toHaveCount(1);
  await expect(page.locator('#plqtab tbody tr input[data-f="cod"]')).toHaveValue('AG03');
  await expect(page.locator('#plst0')).toHaveText('Nuevo');
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  const d = await page.evaluate(() => window.__dbGet('plb', 'ARQ_AG03'));
  expect(d).toMatchObject({ cod: 'AG03', disc: 'ARQ', rev: 1, base: 'planos/ARQ_AG03/r1', tipo: 'Planta', T: 1024, rot: { cod: 'AG03', ok: true } });
  expect(d.pisoId).toBe(await page.evaluate(() => [...S.pis.values()].find(p => p.code === 'P1')?.id || ''));
  // A3 a 300 dpi ≈ 4961 px de ancho → 4 niveles; están todos los mosaicos, la miniatura y el PDF original
  expect(d.W).toBeGreaterThan(4900); expect(d.Z).toBe(4);
  const files = await page.evaluate(() => [...window.__ST.keys()]);
  const exp = []; for (let z = 0; z < d.Z; z++) { const k = 2 ** z, nx = Math.ceil(Math.ceil(d.W / k) / 1024), ny = Math.ceil(Math.ceil(d.H / k) / 1024); for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) exp.push(`${d.base}/${z}/${x}_${y}.webp`); }
  expect(files.sort()).toEqual([...exp, d.base + '/th.webp', d.base + '/orig.pdf'].sort());
  // biblioteca → visor
  await page.click('#tabs [data-tab="pbib"]');
  await expect(page.locator('.plc[data-pl="ARQ_AG03"]')).toContainText('PLANTA PRIMER PISO');
  await expect(page.locator('.plc img.ok')).toHaveCount(1);
  await page.click('.plc[data-pl="ARQ_AG03"]');
  await expect(page.locator('#plv canvas.plcv')).toBeVisible();
  await expect.poll(() => page.evaluate(() => PLV.tv.loaded())).toBeGreaterThan(0);
  // al acercar se piden los mosaicos de detalle (nivel 0) de la zona visible, no todos
  await page.evaluate(() => { window.__GETS.length = 0; for (let i = 0; i < 6; i++) plvZoom(1.6); });
  await expect.poll(() => page.evaluate(() => window.__GETS.filter(p => /\/0\/\d+_\d+\.webp$/.test(p)).length)).toBeGreaterThan(0);
  const det = await page.evaluate(() => window.__GETS.filter(p => /\/0\//.test(p)).length);
  expect(det).toBeLessThan(exp.filter(p => /\/0\//.test(p)).length);
  await page.keyboard.press('Escape');
  await expect(page.locator('#plv')).toHaveCount(0);
  // otro archivo con el mismo código: nueva revisión (la anterior queda en el historial)
  await page.click('#tabs [data-tab="pcar"]');
  await page.setInputFiles('#plfile', { name: name.replace('.pdf', ' REV.pdf'), mimeType: 'application/pdf', buffer: pdf });
  await expect(page.locator('#plqtab tbody tr').last().locator('.plst')).toContainText('Nueva revisión');
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plqtab tbody tr').last().locator('.plst')).toContainText('rev. 2', { timeout: 90_000 });
  const d2 = await page.evaluate(() => window.__dbGet('plb', 'ARQ_AG03'));
  expect(d2.rev).toBe(2); expect(d2.base).toBe('planos/ARQ_AG03/r2'); expect(d2.revs.map(r => r.rev)).toEqual([1]);
  // el mismo archivo otra vez: «ya está cargado» y no se procesa
  await page.setInputFiles('#plfile', { name: name.replace('.pdf', ' REV.pdf'), mimeType: 'application/pdf', buffer: pdf });
  noErrors(errors, 'carga');
});

test.describe('sin conexión (tablet)', () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  test('en tablet guarda los planos de la lista completos y los marca; en PC no aparece', async ({ page }) => {
    test.setTimeout(120_000);
    const errors = await openApp(page, { as: 'admin', editar: false });
    await preparar(page);
    await page.evaluate(memStorage);
    expect(await page.evaluate(() => plTablet())).toBe(true);
    await page.evaluate(() => { goMod('pla'); U.tab = 'pcar'; render(); });
    await page.setInputFiles('#plfile', { name: '2459243-PTSA-XXX-P01-P2D-ARQ-E05-AG03_PLANTA PRIMER PISO.pdf', mimeType: 'application/pdf', buffer: pdfDemo() });
    await page.click('#plqbar [data-q="go"]');
    await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
    const d = await page.evaluate(() => window.__dbGet('plb', 'ARQ_AG03'));
    expect(d.sz).toBeGreaterThan(1000);
    await page.evaluate(() => { U.tab = 'pbib'; render(); window.__GETS.length = 0; });
    await page.click('#ploff');
    await page.click('#pop [data-do="sv"]');
    await expect(page.locator('.plc[data-pl="ARQ_AG03"]')).toContainText('sin conexión', { timeout: 30_000 });
    const r = await page.evaluate(() => ({ all: plPaths(PLB.get('ARQ_AG03')), got: [...new Set(window.__GETS)], off: PLOFF.ARQ_AG03 }));
    expect(r.got.sort()).toEqual(r.all.sort());
    expect(r.off).toMatchObject({ rev: 1, base: 'planos/ARQ_AG03/r1' });
    noErrors(errors, 'tablet');
  });
});

test('visor: panel ☰ Planos, otra especialidad en la misma zona y ▲▼ de piso sin salir', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await preparar(page);
  await page.evaluate(memStorage);
  await page.evaluate(() => { goMod('pla'); U.tab = 'pcar'; render(); });
  const pdf = pdfDemo();
  await page.setInputFiles('#plfile', [
    { name: '2459243-PTSA-XXX-P01-P2D-ARQ-E05-AG03_PLANTA PRIMER PISO.pdf', mimeType: 'application/pdf', buffer: pdf },
    { name: '2459243-PTSA-XXX-ZZZ-P2D-AFC-E05-IS06_PLANTA PRIMER PISO - REDES DE AGUA FRIA.pdf', mimeType: 'application/pdf', buffer: pdf },
    { name: '2459243-PTSA-XXX-ZZZ-P2D-AFC-E05-IS07_PLANTA SEGUNDO PISO - REDES DE AGUA FRIA.pdf', mimeType: 'application/pdf', buffer: pdf },
  ]);
  // el rótulo del PDF de prueba dice AG03: se corrigen los códigos de sanitarias en la tabla no hace falta (vienen del nombre)
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plqtab tr.ok')).toHaveCount(3, { timeout: 120_000 });
  await page.evaluate(() => { U.tab = 'pbib'; render(); });
  await page.click('.plc[data-pl="ARQ_AG03"]');
  // fila «mismo punto»: ARQ AG03 e IS IS06 (P1); ▲ P2 lleva a IS07 desde sanitarias
  await expect(page.locator('#plv .plvq [data-pj]')).toHaveCount(2);
  await page.waitForTimeout(300);
  await page.evaluate(() => { PLV.tv.setView({ nx: 0.3, ny: 0.4, k: 3 }); });
  const v0 = await page.evaluate(() => PLV.tv.getView());
  await page.click('#plv .plvq [data-pj="IS_IS06"]');
  await expect(page.locator('#plv .plvt b')).toHaveText('IS06');
  await page.waitForTimeout(300);
  const v1 = await page.evaluate(() => PLV.tv.getView());
  expect(Math.abs(v1.nx - v0.nx)).toBeLessThan(0.01); expect(Math.abs(v1.ny - v0.ny)).toBeLessThan(0.01); expect(Math.abs(v1.k - v0.k)).toBeLessThan(0.05);
  await page.click('#plv .plvq [data-pj="IS_IS07"]');
  await expect(page.locator('#plv .plvt b')).toHaveText('IS07');
  // panel: filtrar por piso y saltar a otro plano
  await page.click('#plv [data-pv="menu"]');
  await expect(page.locator('#plv .plvp .plvpr')).toHaveCount(1); // abre en el piso del plano actual (P2)
  await page.click('#plv .plvp [data-pf="piso:"]');
  await expect(page.locator('#plv .plvp .plvpr')).toHaveCount(3);
  await page.fill('#plv .plvp input', 'ag03');
  await expect(page.locator('#plv .plvp .plvpr')).toHaveCount(1);
  await page.click('#plv .plvp [data-pg="ARQ_AG03"]');
  await expect(page.locator('#plv .plvt b')).toHaveText('AG03');
  await page.keyboard.press('Escape'); // cierra primero el panel
  await expect(page.locator('#plv .plvp')).toHaveCount(0);
  await expect(page.locator('#plv')).toHaveCount(1);
  noErrors(errors, 'panel');
});

test('visor: al soltar un pellizco el zoom sigue un poco y frena (inercia)', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await preparar(page);
  await page.evaluate(memStorage);
  await page.evaluate(() => { goMod('pla'); U.tab = 'pcar'; render(); });
  await page.setInputFiles('#plfile', { name: '2459243-PTSA-XXX-P01-P2D-ARQ-E05-AG03_PLANTA PRIMER PISO.pdf', mimeType: 'application/pdf', buffer: pdfDemo() });
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await page.evaluate(() => { U.tab = 'pbib'; render(); });
  await page.click('.plc[data-pl="ARQ_AG03"]');
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const host = document.querySelector('.plvc'), b = host.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const ev = (type, id, x) => host.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: cy, pointerType: 'touch', bubbles: true }));
    const raf = () => new Promise(r => requestAnimationFrame(r));
    /* separación de los dedos que crece en proporción constante (gesto simétrico en escala logarítmica) */
    const hd = i => 40 * Math.pow(1.12, i);
    ev('pointerdown', 1, cx - hd(0)); ev('pointerdown', 2, cx + hd(0));
    for (let i = 1; i <= 8; i++) { ev('pointermove', 1, cx - hd(i)); ev('pointermove', 2, cx + hd(i)); await raf(); }
    const atRelease = PLV.tv.s; ev('pointerup', 1, cx - hd(8)); ev('pointerup', 2, cx + hd(8));
    const seq = []; for (let i = 0; i < 120; i++) { await raf(); seq.push(PLV.tv.s); }
    return { atRelease, seq };
  });
  expect(r.seq[5]).toBeGreaterThan(r.atRelease * 1.01);             // siguió acercando tras soltar
  expect(Math.abs(r.seq[119] / r.seq[118] - 1)).toBeLessThan(0.002); // ya casi detenido                       // y se detuvo
  // pellizco rápido desde la vista general en el que un dedo se levanta antes: el que queda no arrastra ni corta el zoom
  const q = await page.evaluate(async () => {
    const host = document.querySelector('.plvc'), b = host.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const ev = (type, id, x, y, prim) => host.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, pointerType: 'touch', isPrimary: !!prim, bubbles: true }));
    const raf = () => new Promise(r => requestAnimationFrame(r));
    PLV.tv.fitView(); await raf(); await raf(); const s0 = PLV.tv.s;
    const hd = i => 30 * Math.pow(1.25, i);
    ev('pointerdown', 60, cx - hd(0), cy, true); ev('pointerdown', 61, cx + hd(0), cy);
    for (let i = 1; i <= 6; i++) { ev('pointermove', 60, cx - hd(i), cy); ev('pointermove', 61, cx + hd(i), cy); if (i < 6) await raf(); }
    ev('pointerup', 61, cx + hd(6), cy); const sUp = PLV.tv.s;            /* un dedo sale primero, mientras se mueve… */
    window.__d1 = JSON.stringify(PLV.tv.dbg());
    const x0 = PLV.tv.x;
    for (let i = 1; i <= 4; i++) { ev('pointermove', 60, cx - hd(6) + i * 20, cy + i * 15); await raf(); } /* …y el otro se desliza al levantarse */
    ev('pointerup', 60, cx - hd(6) + 80, cy + 60);
    for (let i = 0; i < 30; i++) await raf();
    return { s0, sUp, s: PLV.tv.s, d1: window.__d1 };
  });
  expect(q.sUp).toBeGreaterThan(q.s0 * 3);
  expect(q.s, JSON.stringify(q)).toBeGreaterThan(q.sUp * 1.05); // la inercia del zoom siguió
  // dedo «fantasma»: un dedo que nunca avisó que se levantó no debe bloquear el siguiente pellizco
  const g = await page.evaluate(async () => {
    const host = document.querySelector('.plvc'), b = host.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const ev = (type, id, x, prim) => host.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: cy, pointerType: 'touch', isPrimary: !!prim, bubbles: true }));
    const raf = () => new Promise(r => requestAnimationFrame(r));
    PLV.tv.fitView(); await raf(); await raf();
    ev('pointerdown', 20, cx, true); ev('pointerdown', 21, cx + 50); /* nunca llegan sus pointerup */
    const s0 = PLV.tv.s;
    ev('pointerdown', 30, cx - 40, true); ev('pointerdown', 31, cx + 40);
    for (let i = 1; i <= 6; i++) { ev('pointermove', 30, cx - 40 - i * 10); ev('pointermove', 31, cx + 40 + i * 10); await raf(); }
    const s1 = PLV.tv.s; ev('pointerup', 30, cx - 100); ev('pointerup', 31, cx + 100);
    return { s0, s1 };
  });
  expect(g.s1, JSON.stringify(g)).toBeGreaterThan(g.s0 * 1.5);
  // doble toque acerca; un toque seguido de un pellizco ya no dispara el doble toque (antes «peleaban» y el zoom no respondía)
  const d2 = await page.evaluate(async () => {
    const host = document.querySelector('.plvc'), b = host.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const ev = (type, id, x, prim) => host.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: cy, pointerType: 'touch', isPrimary: !!prim, bubbles: true }));
    const raf = () => new Promise(r => requestAnimationFrame(r)); const wait = ms => new Promise(r => setTimeout(r, ms));
    PLV.tv.fitView(); await raf(); await raf(); const f = PLV.tv.s;
    ev('pointerdown', 40, cx, true); ev('pointerup', 40, cx); await wait(80); ev('pointerdown', 41, cx, true); ev('pointerup', 41, cx);
    for (let i = 0; i < 60; i++) await raf(); const dbl = PLV.tv.s / f;
    PLV.tv.fitView(); await raf(); await raf(); const f2 = PLV.tv.s;
    ev('pointerdown', 50, cx, true); ev('pointerup', 50, cx); await wait(60);
    ev('pointerdown', 51, cx - 40, true); ev('pointerdown', 52, cx + 40);
    for (let i = 1; i <= 6; i++) { ev('pointermove', 51, cx - 40 - i * 10); ev('pointermove', 52, cx + 40 + i * 10); await raf(); }
    const pin = PLV.tv.s / f2; ev('pointerup', 51, cx - 100); ev('pointerup', 52, cx + 100);
    return { dbl, pin };
  });
  expect(d2.dbl).toBeGreaterThan(1.8);
  expect(d2.pin).toBeGreaterThan(2.2); expect(d2.pin).toBeLessThan(2.8); // ≈ 200/80: solo el pellizco, sin el zoom del doble toque
  noErrors(errors, 'inercia');
});

test('modelo 3D (beta): solo el administrador ve la pestaña; especialidad desde el nombre del IFC', async ({ page }) => {
  await openApp(page, { as: 'editor', editar: false });
  await page.evaluate(() => goMod('pla'));
  expect(await tabsVisibles(page)).not.toContain('p3d');
  const r = await page.evaluate(() => [p3Disc('2459243-PTSA-XX-ZZZ-M3D-ARQ-E05.ifc'), p3Disc('2459243-PTSA-DC-ZZZ-M3D-HVAC-E05.ifc'), p3Disc('2459243-PTSA-XX-ZZZ-M3D-AFC-E05.ifc')]);
  expect(r).toEqual(['ARQ', 'HVAC', 'AFC']);
});

test('medir: las cuentas (distancia, poligonal, área) y calibrar una lámina para todo el equipo', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  // cuentas puras: 3-4-5, cuadrado de 10 × 10 y un triángulo
  const c = await page.evaluate(() => ({
    d: plmD({ x: 0, y: 0 }, { x: 3, y: 4 }),
    len: plmLen([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }]),
    lenC: plmLen([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], true),
    sq: plmArea([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]),
    tri: plmArea([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 8 }]),
    f: [plmFmtL(0.0345), plmFmtL(12.3456), plmFmtA(7.891)],
  }));
  expect(c.d).toBe(5); expect(c.len).toBe(11); expect(c.lenC).toBe(40); expect(c.sq).toBe(100); expect(c.tri).toBe(24);
  expect(c.f).toEqual(['3.5 cm', '12.35 m', '7.89 m²']);
  // en el visor: sin calibrar solo deja calibrar; se calibra con una cota real y las medidas salen en metros
  await preparar(page);
  await page.evaluate(memStorage);
  await page.evaluate(() => { goMod('pla'); U.tab = 'pcar'; render(); });
  await page.setInputFiles('#plfile', { name: '2459243-PTSA-XXX-P01-P2D-ARQ-E05-AG03_PLANTA PRIMER PISO.pdf', mimeType: 'application/pdf', buffer: pdfDemo() });
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await page.evaluate(() => { U.tab = 'pbib'; render(); });
  await page.click('.plc[data-pl="ARQ_AG03"]');
  await page.waitForTimeout(400);
  await page.click('#plv [data-pv="med"]');
  await expect(page.locator('#plv .plmbar')).toBeVisible();
  await expect(page.locator('#plv .plmbar [data-pm="dist"]')).toBeDisabled(); // sin calibrar
  await expect(page.locator('.plvc')).toHaveClass(/medir/);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.plvc')).cursor)).toMatch(/^url\(/); // cruz fina, no la manito
  const tap = (wx, wy) => page.evaluate(async ([wx, wy]) => {
    const host = document.querySelector('.plvc'), r = host.getBoundingClientRect(), s = PLV.tv.toScreen(wx, wy), x = r.left + s.x, y = r.top + s.y;
    const ev = (t) => host.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: x, clientY: y, pointerType: 'mouse', isPrimary: true, bubbles: true }));
    ev('pointerdown'); await new Promise(r => setTimeout(r, 30)); ev('pointerup'); await new Promise(r => requestAnimationFrame(r));
  }, [wx, wy]);
  const W = await page.evaluate(() => PLV.tv.W);
  // cota de 1000 px del plano = 10 m reales → 1 px = 1 cm
  await tap(W * 0.2, W * 0.1); await tap(W * 0.2 + 1000, W * 0.1);
  await page.fill('#plmL', '10');
  let aviso = '';
  page.once('dialog', d => { aviso = d.message(); d.accept(); }); // la lámina de prueba (A3) no está a 1/100: avisa y se calibra igual
  await page.click('#plv .plmbar [data-pm="calok"]');
  await expect.poll(() => page.evaluate(() => (PLB.get('ARQ_AG03').cal || {}).mpp)).toBeCloseTo(0.01, 4); // guardada para todos
  expect(await page.evaluate(() => PLB.get('ARQ_AG03').cal.rev)).toBe(1);
  expect(aviso).toContain('1/100');
  await expect(page.locator('#plv .plmbar [data-pm="dist"]')).toBeEnabled();
  await expect(page.locator('#plv .plmbar .plms')).toContainText('1 px = 1.00 cm');
  // distancia 3-4-5 = 500 px → 5.00 m; poligonal; área
  await tap(W * 0.3, W * 0.3); await tap(W * 0.3 + 300, W * 0.3 + 400);
  await expect(page.locator('#plmv')).toContainText('5.00 m');
  await page.click('#plv .plmbar [data-pm="poli"]');
  await tap(W * 0.3, W * 0.3); await tap(W * 0.3 + 300, W * 0.3); await tap(W * 0.3 + 300, W * 0.3 + 400);
  await expect(page.locator('#plmv')).toContainText('7.00 m');
  await page.click('#plv .plmbar [data-pm="area"]');
  await tap(W * 0.3, W * 0.3); await tap(W * 0.3 + 500, W * 0.3); await tap(W * 0.3 + 500, W * 0.3 + 200); await tap(W * 0.3, W * 0.3 + 200);
  await expect(page.locator('#plmv')).toContainText('10.00 m²'); // 5 m × 2 m
  // sobre un punto puesto el cursor pasa a «mover»; fuera de él vuelve a la cruz
  const sobre = await page.evaluate(() => { const q = PLM.L.area[0], r = document.querySelector('.plvc').getBoundingClientRect(), t = PLV.tv.toScreen(q.x, q.y); return { x: r.left + t.x, y: r.top + t.y }; });
  await page.mouse.move(sobre.x, sobre.y);
  await expect(page.locator('.plvc')).toHaveClass(/sobre/);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.plvc')).cursor)).toBe('move');
  await page.mouse.move(sobre.x + 120, sobre.y + 120);
  await expect(page.locator('.plvc')).not.toHaveClass(/sobre/);
  // acercar no cambia la medida (se guarda en coordenadas del plano); Esc sale de medir antes de cerrar el visor
  await page.evaluate(() => PLV.tv.zoomAt(2, 300, 300));
  await page.waitForTimeout(400);
  await expect(page.locator('#plmv')).toContainText('10.00 m²');
  await page.keyboard.press('Escape');
  await expect(page.locator('#plv .plmbar')).toHaveCount(0);
  await expect(page.locator('.plvc')).not.toHaveClass(/medir/); // vuelve la manito para mover el plano
  await expect(page.locator('#plv')).toHaveCount(1);
  noErrors(errors, 'medir');
});

test('vínculos: crear en el visor (zona, lámina destino y zona del destino), seguirlo con un toque, ← Volver y quitarlo', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await preparar(page);
  await page.evaluate(memStorage);
  await page.evaluate(() => { goMod('pla'); U.tab = 'pcar'; render(); });
  const pdf = pdfDemo();
  await page.setInputFiles('#plfile', [
    { name: '2459243-PTSA-XXX-P01-P2D-ARQ-E05-AG03_PLANTA PRIMER PISO.pdf', mimeType: 'application/pdf', buffer: pdf },
    { name: '2459243-PTSA-XXX-ZZZ-P2D-AFC-E05-IS06_PLANTA PRIMER PISO - REDES DE AGUA FRIA.pdf', mimeType: 'application/pdf', buffer: pdf },
  ]);
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plqtab tr.ok')).toHaveCount(2, { timeout: 120_000 });
  await page.evaluate(() => { U.tab = 'pbib'; render(); });
  await page.click('.plc[data-pl="ARQ_AG03"]');
  await page.waitForTimeout(400);
  const tap = (wx, wy) => page.evaluate(async ([wx, wy]) => {
    const host = document.querySelector('.plvc'), r = host.getBoundingClientRect(), s = PLV.tv.toScreen(wx, wy), x = r.left + s.x, y = r.top + s.y;
    const ev = (t) => host.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y, pointerType: 'mouse', isPrimary: true, bubbles: true }));
    ev('pointerdown'); await new Promise(r => setTimeout(r, 30)); ev('pointerup'); await new Promise(r => requestAnimationFrame(r));
  }, [wx, wy]);
  const W = await page.evaluate(() => PLV.tv.W);
  const nLk = () => page.evaluate(() => plkLinks(PLB.get('ARQ_AG03')).length);

  // sin vínculos, el modo editar se abre con el botón de la cabecera; Medir y Vincular no conviven
  await page.click('#plv [data-pv="lk"]');
  await expect(page.locator('#plv .plkbar')).toBeVisible();
  await expect(page.locator('.plvc')).toHaveClass(/vinc/);
  await page.click('#plv [data-pv="med"]');
  await expect(page.locator('#plv .plkbar')).toHaveCount(0);
  await expect(page.locator('#plv .plmbar')).toBeVisible();
  await page.click('#plv [data-pv="med"]');
  await expect(page.locator('#plv .plmbar')).toHaveCount(0);
  await page.click('#plv [data-pv="lk"]');
  await expect(page.locator('#plv .plkbar')).toBeVisible();

  // un toque sobre la marca → elegir lámina destino (con texto) → acercar la zona del destino y fijarla
  await tap(W * 0.32, W * 0.22);
  await expect(page.locator('#plv .plkch')).toBeVisible();
  await page.fill('#plkt', 'Corte Z');
  await page.fill('#plkq', 'IS06');
  await page.click('#plv .plkr[data-kc="IS_IS06"]');
  await expect(page.locator('#plv .plvt b')).toHaveText('IS06');
  await expect(page.locator('#plv .plkbar')).toContainText('Acerca la zona');
  await page.waitForTimeout(300);
  await page.evaluate(() => PLV.tv.setView({ nx: 0.6, ny: 0.5, k: 4 }));
  await page.click('#plv .plkbar [data-pk="fix"]');
  await expect(page.locator('#plv .plvt b')).toHaveText('AG03'); // vuelve a la lámina de origen
  await expect.poll(nLk).toBe(1);
  const lk = await page.evaluate(() => PLB.get('ARQ_AG03').lk[0]);
  expect(lk.to).toBe('IS_IS06'); expect(lk.t).toBe('Corte Z'); expect(lk.v.k).toBeCloseTo(4, 1); expect(lk.v.nx).toBeCloseTo(0.6, 2);
  expect((lk.x0 + lk.x1) / 2).toBeCloseTo(0.32, 2); expect(lk.x0).toBeLessThan(lk.x1); const zw = (lk.x1 - lk.x0) * W; expect(zw).toBeGreaterThanOrEqual(12); expect(zw).toBeLessThanOrEqual(80); // zona del tamaño de una burbuja (≈ 14 px de pantalla, tope 40 px del plano a cada lado)
  expect(lk.by).toBeTruthy(); expect(lk.arch).toBeUndefined();
  expect((await page.evaluate(() => __dbGet('plb', 'ARQ_AG03'))).lk.length).toBe(1); // guardado en la base
  await expect(page.locator('#plv .plkbar')).toContainText('Corte Z'); // queda elegido, listo para ajustarlo

  // «＋ Otra zona»: el otro extremo del corte, mismo destino, zona y texto, sin volver a elegir lámina
  await page.click('#plv .plkbar [data-pk="dup"]');
  await expect(page.locator('#plv .plkbar')).toContainText('Otra marca hacia');
  await tap(W * 0.62, W * 0.22);
  await expect.poll(nLk).toBe(2);
  await expect(page.locator('#plv .plkch')).toHaveCount(0);
  await expect(page.locator('#plv [data-pv="lk"]')).toContainText('2'); // el contador de la cabecera se actualiza
  const lk2 = await page.evaluate(() => PLB.get('ARQ_AG03').lk[1]);
  expect(lk2.to).toBe('IS_IS06'); expect(lk2.t).toBe('Corte Z'); expect(lk2.v).toEqual(lk.v); expect((lk2.x0 + lk2.x1) / 2).toBeCloseTo(0.62, 2);
  // con un vínculo elegido, tocar otra marca del plano empieza uno nuevo de inmediato (antes el toque solo lo soltaba)
  expect(await page.evaluate(() => PLK.sel)).toBeTruthy();
  await tap(W * 0.5, W * 0.5);
  await expect(page.locator('#plv .plkch')).toBeVisible();
  await page.click('#plv .plkch [data-kc="x"]');
  await expect(page.locator('#plv .plkch')).toHaveCount(0);
  expect(await nLk()).toBe(2);

  // salir de editar: por defecto los vínculos no se dibujan (plano limpio), pero un toque los sigue igual
  await page.click('#plv .plkbar [data-pk="off"]');
  await expect(page.locator('#plv .plkbar')).toHaveCount(0);
  expect(await page.evaluate(() => PLK.show)).toBe(false);
  await tap(W * 0.62, W * 0.22); // el otro extremo
  await expect(page.locator('#plv .plvt b')).toHaveText('IS06');
  await page.click('#plv .plback');
  await expect(page.locator('#plv .plvt b')).toHaveText('AG03');
  await page.evaluate(() => PLV.tv.setView({ nx: 0.4, ny: 0.3, k: 1 }));
  const v0 = await page.evaluate(() => PLV.tv.getView());
  await tap(W * 0.7, W * 0.4); // fuera de la zona: no navega (queda el doble toque de zoom)
  await expect(page.locator('#plv .plvt b')).toHaveText('AG03');
  await tap(W * 0.32, W * 0.22);
  await expect(page.locator('#plv .plvt b')).toHaveText('IS06');
  await page.waitForTimeout(300);
  const v1 = await page.evaluate(() => PLV.tv.getView());
  expect(Math.abs(v1.nx - 0.6)).toBeLessThan(0.01); expect(Math.abs(v1.k - 4)).toBeLessThan(0.05);
  await expect(page.locator('#plv .plback')).toContainText('AG03');
  await page.click('#plv .plback');
  await expect(page.locator('#plv .plvt b')).toHaveText('AG03');
  await page.waitForTimeout(300);
  const v2 = await page.evaluate(() => PLV.tv.getView());
  expect(Math.abs(v2.nx - v0.nx)).toBeLessThan(0.01); expect(Math.abs(v2.ny - v0.ny)).toBeLessThan(0.01); expect(Math.abs(v2.k - v0.k)).toBeLessThan(0.05);
  await expect(page.locator('#plv .plback')).toHaveCount(0); // ya no hay a dónde volver

  // quitar: se archiva (no se pierde) y deja de verse
  await page.click('#plv [data-pv="lk"]');
  await tap(W * 0.32, W * 0.22);
  await expect(page.locator('#plv .plkbar [data-pk="del"]')).toBeVisible();
  page.once('dialog', d => d.accept());
  await page.click('#plv .plkbar [data-pk="del"]');
  await expect.poll(nLk).toBe(1);
  const db = await page.evaluate(() => __dbGet('plb', 'ARQ_AG03'));
  expect(db.lk.length).toBe(2); expect(db.lk[0].arch && db.lk[0].arch.by).toBeTruthy(); expect(db.lk[1].arch).toBeUndefined();
  noErrors(errors, 'vínculos');
});

test.describe('vínculos en tablet (toque)', () => {
  test.use({ hasTouch: true });
  test('el clic fantasma tras el segundo toque no elige una lámina al azar; las dos flechas del corte llevan al mismo destino', async ({ page }) => {
    test.setTimeout(150_000);
    const errors = await openApp(page, { as: 'admin', editar: false });
    await preparar(page);
    await page.evaluate(memStorage);
    await page.evaluate(() => { goMod('pla'); U.tab = 'pcar'; render(); });
    const pdf = pdfDemo();
    await page.setInputFiles('#plfile', ['P01-P2D-ARQ-E05-AG03_PLANTA PRIMER PISO', 'ZZZ-P2D-ARQ-E05-AG07_CORTES A B', 'ZZZ-P2D-ARQ-E05-AG09_CORTES E F']
      .map(n => ({ name: `2459243-PTSA-XXX-${n}.pdf`, mimeType: 'application/pdf', buffer: pdf })));
    await page.click('#plqbar [data-q="go"]');
    await expect(page.locator('#plqtab tr.ok')).toHaveCount(3, { timeout: 120_000 });
    await page.evaluate(() => { U.tab = 'pbib'; render(); });
    await page.click('.plc[data-pl="ARQ_AG03"]');
    await page.waitForTimeout(500);
    await page.locator('#plv [data-pv="lk"]').tap();
    const r = await page.evaluate(() => document.querySelector('.plvc').getBoundingClientRect().toJSON());
    const ax = r.left + r.width / 2, ay = r.top + 200; // el toque cae justo donde aparece la lista de láminas (el clic fantasma de la tablet caería sobre ella)
    await page.touchscreen.tap(ax, ay);
    await page.waitForTimeout(800);
    await expect(page.locator('#plv .plkch')).toBeVisible(); // antes: se saltaba la lista y abría una lámina cualquiera
    await expect(page.locator('#plv .plvt b')).toHaveText('AG03');
    await page.locator('#plv .plkr[data-kc="ARQ_AG07"]').first().tap();
    await expect(page.locator('#plv .plvt b')).toHaveText('AG07');
    await page.waitForTimeout(700);
    await page.locator('#plv .plkbar [data-pk="fix"]').tap();
    await expect(page.locator('#plv .plvt b')).toHaveText('AG03');
    await expect.poll(() => page.evaluate(() => plkLinks(PLB.get('ARQ_AG03')).length)).toBe(1);
    // segunda «A» (el otro extremo del corte) con «＋ Otra zona»
    await page.waitForTimeout(700);
    await page.locator('#plv .plkbar [data-pk="dup"]').tap();
    const bx = r.left + r.width / 2 + 250, by = r.top + 200; // dentro de la hoja (la lámina de prueba es más angosta que la pantalla)
    await page.waitForTimeout(700);
    await page.touchscreen.tap(bx, by);
    await expect.poll(() => page.evaluate(() => plkLinks(PLB.get('ARQ_AG03')).map(l => l.to))).toEqual(['ARQ_AG07', 'ARQ_AG07']);
    // fuera de edición (vínculos ocultos), cada flecha abre AG07
    await page.waitForTimeout(700);
    await page.locator('#plv .plkbar [data-pk="off"]').tap();
    for (const [x, y] of [[ax - 10, ay - 10], [bx - 10, by - 10]]) {
      await page.waitForTimeout(500);
      await page.touchscreen.tap(x, y);
      await expect(page.locator('#plv .plvt b')).toHaveText('AG07');
      await page.waitForTimeout(500);
      await page.locator('#plv .plback').tap();
      await expect(page.locator('#plv .plvt b')).toHaveText('AG03');
    }
    noErrors(errors, 'vínculos tablet');
  });
});

test('vínculos: la ventana de confirmar (Borrar, Texto) y los avisos se ven encima del visor', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await preparar(page);
  await page.evaluate(memStorage);
  await page.evaluate(() => { goMod('pla'); U.tab = 'pcar'; render(); });
  const pdf = pdfDemo();
  await page.setInputFiles('#plfile', ['P01-P2D-ARQ-E05-AG03_PLANTA PRIMER PISO', 'ZZZ-P2D-ARQ-E05-AG07_CORTES A B']
    .map(n => ({ name: `2459243-PTSA-XXX-${n}.pdf`, mimeType: 'application/pdf', buffer: pdf })));
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plqtab tr.ok')).toHaveCount(2, { timeout: 120_000 });
  // un vínculo ya guardado en la lámina
  await page.evaluate(() => fcol('plb').doc('ARQ_AG03').update({ lk: [{ id: 'k1', x0: 0.3, y0: 0.2, x1: 0.34, y1: 0.24, to: 'ARQ_AG07', v: null, t: '' }] }));
  await page.evaluate(() => { U.tab = 'pbib'; render(); window.__uiAskReal = true; }); // la ventana real, no la del navegador
  await page.click('.plc[data-pl="ARQ_AG03"]');
  await page.waitForTimeout(400);
  await page.click('#plv [data-pv="lk"]');
  await page.evaluate(async () => {
    const host = document.querySelector('.plvc'), r = host.getBoundingClientRect(), s = PLV.tv.toScreen(PLV.tv.W * 0.32, PLV.tv.H * 0.22 / (PLV.tv.H / PLV.tv.H));
    const y = PLV.tv.toScreen(0, 0.22 * PLV.tv.H).y;
    const ev = t => host.dispatchEvent(new PointerEvent(t, { pointerId: 5, clientX: r.left + s.x, clientY: r.top + y, pointerType: 'mouse', isPrimary: true, bubbles: true }));
    ev('pointerdown'); await new Promise(r => setTimeout(r, 30)); ev('pointerup');
  });
  await expect(page.locator('#plv .plkbar [data-pk="del"]')).toBeVisible();
  // Texto: la ventana con campo se ve y se puede escribir
  await page.click('#plv .plkbar [data-pk="txt"]');
  await page.fill('#uask textarea', 'Corte A');
  await page.click('#uask [data-ua="si"]'); // antes: quedaba detrás del visor y este clic no llegaba
  await expect.poll(() => page.evaluate(() => PLB.get('ARQ_AG03').lk[0].t)).toBe('Corte A');
  // Borrar: confirmar en la ventana real y el aviso «Vínculo quitado» encima del visor
  await page.click('#plv .plkbar [data-pk="del"]');
  await page.click('#uask [data-ua="si"]');
  await expect.poll(() => page.evaluate(() => plkLinks(PLB.get('ARQ_AG03')).length)).toBe(0);
  await expect(page.locator('#toast')).toContainText('Vínculo quitado');
  const top = await page.evaluate(() => { const t = document.getElementById('toast').getBoundingClientRect(); const el = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2); return !!el && !!el.closest('#toast'); });
  expect(top).toBe(true);
  noErrors(errors, 'vínculos ventana');
});

test('nitidez: con zoom profundo, al detenerse se redibuja la pantalla desde el PDF original; al moverse se cancela', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await openApp(page, { as: 'admin', editar: false });
  await preparar(page);
  await page.evaluate(memStorage);
  await page.evaluate(() => { goMod('pla'); U.tab = 'pcar'; render(); });
  await page.setInputFiles('#plfile', { name: '2459243-PTSA-XXX-P01-P2D-ARQ-E05-AG03_PLANTA PRIMER PISO.pdf', mimeType: 'application/pdf', buffer: pdfDemo() });
  await page.click('#plqbar [data-q="go"]');
  await expect(page.locator('#plst0')).toContainText('Listo', { timeout: 90_000 });
  await page.evaluate(() => { U.tab = 'pbib'; render(); window.__GETS.length = 0; });
  await page.click('.plc[data-pl="ARQ_AG03"]');
  await page.waitForTimeout(600);
  // vista general: los mosaicos alcanzan, no se baja el PDF
  expect(await page.evaluate(() => PLV.tv.sharp())).toBeNull();
  expect(await page.evaluate(() => __GETS.some(p => p.endsWith('orig.pdf')))).toBe(false);
  // zoom profundo y quieto: aparece la capa nítida, dibujada con la vista actual
  await page.evaluate(() => PLV.tv.setView({ nx: 0.4, ny: 0.5, k: 12 }));
  await expect.poll(() => page.evaluate(() => PLV.tv.sharp()), { timeout: 15_000 }).not.toBeNull();
  const a = await page.evaluate(() => ({ sh: PLV.tv.sharp(), s: PLV.tv.s, x: PLV.tv.x, dpr: devicePixelRatio, cw: document.querySelector('.plvc').clientWidth }));
  expect(a.sh.s).toBe(a.s); expect(a.sh.x).toBe(a.x);
  // dibuja con margen alrededor de la pantalla (para desplazarse sin ver el cambio a baja resolución)
  expect(a.sh.w).toBeGreaterThan(a.cw * a.dpr * 1.3); expect(a.sh.rect.x).toBeLessThan(0); expect(a.sh.rect.x + a.sh.rect.w).toBeGreaterThan(a.cw);
  expect(await page.evaluate(() => __GETS.filter(p => p.endsWith('orig.pdf')).length)).toBe(1);
  // con el dedo/ratón apoyado no se dibuja nada nuevo (no compite con el gesto)
  await page.evaluate(() => { const h = document.querySelector('.plvc'), r = h.getBoundingClientRect();
    h.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, clientX: r.left + 300, clientY: r.top + 300, pointerType: 'mouse', isPrimary: true, bubbles: true }));
    h.dispatchEvent(new PointerEvent('pointermove', { pointerId: 3, clientX: r.left + 200, clientY: r.top + 250, pointerType: 'mouse', isPrimary: true, bubbles: true })); });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => PLV.tv.sharpBusy())).toBe(false);
  expect((await page.evaluate(() => PLV.tv.sharp())).x).toBe(a.x); // la capa anterior sigue (se mueve con el plano), no se rehízo
  await page.evaluate(() => { const h = document.querySelector('.plvc'), r = h.getBoundingClientRect();
    h.dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, clientX: r.left + 200, clientY: r.top + 250, pointerType: 'mouse', isPrimary: true, bubbles: true })); });
  // un desplazamiento corto queda dentro de la zona nítida: al soltar no se redibuja nada (sin parpadeo)
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => PLV.tv.sharpBusy())).toBe(false);
  expect((await page.evaluate(() => PLV.tv.sharp())).n).toBe(a.sh.n);
  // uno largo sale de la zona: al detenerse se redibuja en la nueva posición (el PDF ya no se vuelve a bajar)
  await page.evaluate(() => { const v = PLV.tv.getView(); PLV.tv.setView({ ...v, nx: v.nx - 0.08 }); });
  await expect.poll(() => page.evaluate(() => { const s = PLV.tv.sharp(); return s && s.x === PLV.tv.x && s.y === PLV.tv.y; }), { timeout: 15_000 }).toBe(true);
  expect(await page.evaluate(() => __GETS.filter(p => p.endsWith('orig.pdf')).length)).toBe(1);
  // al alejar a la vista general se suelta (memoria)
  await page.evaluate(() => PLV.tv.fitView());
  await expect.poll(() => page.evaluate(() => PLV.tv.sharp())).toBeNull();
  noErrors(errors, 'nitidez');
});
