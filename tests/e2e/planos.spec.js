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
  expect(await tabsVisibles(page)).toEqual(['pbib', 'pcar']);
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
  await expect(page.locator('#plv .plvc img').first()).toBeVisible();
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
