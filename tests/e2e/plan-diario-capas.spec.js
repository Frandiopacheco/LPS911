// Plan diario › Capas desde el módulo Planos (docs/ia/plan-diario.md «Capas»): las plantas del piso salen de Planos agrupadas
// por especialidad, se dibujan encima de la base sin copiar nada a `laminas`, y la alineación se guarda en el plano (`plb.pd`).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, openTab } from './helpers.js';
import zlib from 'node:zlib';

function png(w, h) {
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0xe8)])));
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const ch = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
}
const B64 = png(20, 12).toString('base64');
const plb = (cod, disc, tit, more) => ({ cod, disc, pisoId: 'p1', tit, tipo: 'Planta', rev: 1, base: `planos/${disc}_${cod}.k1/r1`, W: 800, H: 480, Z: 1, mm: [1200, 900], revs: [], ...more });
const DATOS = [
  ['laminas', 'L1', { pisoId: 'p1', esp: 'ARQ', name: 'Planta P1', base: true, w: 1000, h: 600, lw: 1000, lh: 600, fmt: 'image/png', nf: 1, nl: 1, rev: 1, order: 1 }],
  ['lamimg', 'L1_1_l_0', { d: B64 }], ['lamimg', 'L1_1_f_0', { d: B64 }],
  /* especialidad cargada a mano antes: ya no se muestra, pero no se borra */
  ['laminas', 'L2', { pisoId: 'p1', esp: 'IISS', name: 'IISS vieja', base: false, baseId: 'L1', aligned: true, T: { a: 1, b: 0, e: 0, f: 0 }, w: 1000, h: 600, lw: 1000, lh: 600, fmt: 'image/png', nf: 1, nl: 1, rev: 1, order: 2 }],
  ['lamimg', 'L2_1_l_0', { d: B64 }], ['lamimg', 'L2_1_f_0', { d: B64 }],
  ['plb', 'IS_IS03', plb('IS03', 'IS', 'Agua fría primer piso', { pd: { L1: { T: [1000, 0, 0, 0], ar: 800 / 480, rev: 1 } } })],
  ['plb', 'IE_IE03', plb('IE03', 'IE', 'Alumbrado primer piso')],
  ['plb', 'IE_IE09', plb('IE09', 'IE', 'Detalle de tableros', { tipo: 'Detalle' })],
];
async function abrir(page, as) {
  const errors = await openApp(page, { as, extra: DATOS });
  await page.evaluate(b64 => {
    const bin = atob(b64); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    window.__GETS = []; window.plGet = async p => { window.__GETS.push(p); if (!/\/0\/0_0\.webp$/.test(p)) throw new Error('404 ' + p); return new Blob([u8], { type: 'image/png' }); };
    U.piso = 'p1'; saveUI();
  }, B64);
  await openTab(page, 'mapa');
  await expect(page.locator('[data-pdc="open"]')).toBeVisible({ timeout: 15000 });
  return errors;
}

test('Capas: plantas del piso por especialidad, encima de la base; la alineación se hereda, se confirma y queda en el plano', async ({ page }) => {
  const errors = await abrir(page, 'admin');
  /* la barra ya no lista las especialidades cargadas a mano */
  await expect(page.locator('.mchips .mchip[data-lsel]')).toHaveCount(1);
  await expect(page.locator('.mchips')).not.toContainText('IISS vieja');
  await expect(page.locator('#mup')).toHaveCount(0);

  await page.locator('[data-pdc="open"]').click();
  await expect(page.locator('.pdcg')).toHaveCount(2);                       // Sanitarias y Eléctricas
  await expect(page.locator('.pdci')).toHaveCount(2);                       // solo plantas
  await expect(page.locator('.pdci[data-pdcp="IS_IS03"]')).toContainText('alineada');
  await expect(page.locator('.pdci[data-pdcp="IE_IE03"]')).toContainText('por confirmar');
  await page.locator('#pdcall').check();
  await expect(page.locator('.pdci')).toHaveCount(3);
  await page.locator('#pdcq').fill('agua');
  await expect(page.locator('.pdci:visible')).toHaveCount(1);

  await page.locator('.pdci[data-pdcp="IS_IS03"]').click();
  await expect(page.locator('#mstage img[data-k^="pdc|"]')).toHaveCount(1, { timeout: 15000 });
  await expect(page.locator('.pdcc')).toContainText('IS03');
  /* hoja de 800 px de ancho llevada a los 1000 de la base */
  expect(await page.locator('#mstage img[data-k^="pdc|"]').evaluate(im => im.style.transform)).toContain('1.25');

  /* otro plano con la misma hoja: toma esa alineación y pide confirmar */
  await page.locator('[data-pdc="open"]').click();
  await page.locator('.pdci[data-pdcp="IE_IE03"]').click();
  await expect(page.locator('#mnote')).toContainText('¿Coincide con la arquitectura?');
  await expect(page.locator('#mstage img[data-k^="pdc|"]')).toHaveCount(1);
  expect((await page.evaluate(() => window.__dbGet('plb', 'IE_IE03'))).pd).toBeUndefined();
  await page.locator('[data-pdc="ok"]').click();
  await expect.poll(() => page.evaluate(() => (window.__dbGet('plb', 'IE_IE03').pd || {}).L1?.T)).toEqual([1000, 0, 0, 0]);
  const ie = await page.evaluate(() => window.__dbGet('plb', 'IE_IE03'));
  expect(ie.cod).toBe('IE03'); expect(ie.base).toBe('planos/IE_IE03.k1/r1'); expect(ie.pd.L1.by).toBeTruthy();
  await expect(page.locator('#mnote')).not.toContainText('¿Coincide');

  /* quitar la capa; nada de la obra cambió: mismas láminas, la antigua sigue sin archivar */
  await page.locator('[data-pdc="off"]').click();
  await expect(page.locator('#mstage img[data-k^="pdc|"]')).toHaveCount(0);
  const lam = await page.evaluate(() => window.__dbAll('laminas'));
  expect(Object.keys(lam).sort()).toEqual(['L1', 'L2']); expect(lam.L2.arch).toBeUndefined(); expect(lam.L1.T).toBeUndefined();
  expect(Object.keys(await page.evaluate(() => window.__dbAll('lamimg'))).length).toBe(4);
  noErrors(errors);
});

test('Capas: quien no alinea ve las ya alineadas y no puede confirmar ni guardar', async ({ page }) => {
  const errors = await abrir(page, 'campo');
  await page.locator('[data-pdc="open"]').click();
  await page.locator('.pdci[data-pdcp="IE_IE03"]').click();
  await expect(page.locator('#mnote')).toContainText('Aún sin confirmar');
  await expect(page.locator('[data-pdc="ok"]')).toHaveCount(0);
  await expect(page.locator('[data-pdc="aln"]')).toHaveCount(0);
  expect((await page.evaluate(() => window.__dbGet('plb', 'IE_IE03'))).pd).toBeUndefined();
  noErrors(errors);
});
