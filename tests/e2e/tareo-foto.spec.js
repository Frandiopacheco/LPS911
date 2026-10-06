// Editor de mejora de la foto del formato (web/js/tareo-foto.js; docs/ia/tareo.md «Mejora de foto (oct 2026)»):
// propuesta automática de esquinas, perspectiva, filtro «Documento», «Repetir foto», «Usar original» y tiempos.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

/* Esquinas reales del formato en la foto sintética (normalizadas): hoja A4 apaisada vista en perspectiva */
const Q = [[0.16, 0.16], [0.86, 0.21], [0.9, 0.87], [0.1, 0.8]];

/** Foto sintética en el navegador: fondo de obra gris oscuro con ruido, hoja clara inclinada con una sombra suave,
 *  cuadrícula de líneas negras (como el formato) y «firmas» azules tenues. → dataURL JPEG */
const fotoSintetica = (page, W = 1600, H = 1200) => page.evaluate(({ W, H, Q }) => {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#4a4c4b'); bg.addColorStop(1, '#2f3231'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? 0 : 255},${Math.random() < .5 ? 0 : 255},${Math.random() < .5 ? 0 : 255},.12)`; g.fillRect(Math.random() * W, Math.random() * H, 3, 3); }
  const P = Q.map(([x, y]) => [x * W, y * H]);
  /* punto de la hoja (s,t ∈ 0–1) por interpolación bilineal de las esquinas */
  const at = (s, t) => { const a = P[0], b = P[1], cc = P[2], d = P[3]; return [(1 - s) * (1 - t) * a[0] + s * (1 - t) * b[0] + s * t * cc[0] + (1 - s) * t * d[0], (1 - s) * (1 - t) * a[1] + s * (1 - t) * b[1] + s * t * cc[1] + (1 - s) * t * d[1]]; };
  g.beginPath(); P.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath();
  const pg = g.createLinearGradient(P[0][0], P[0][1], P[2][0], P[2][1]); pg.addColorStop(0, '#f4f2ec'); pg.addColorStop(1, '#c9c6bd'); g.fillStyle = pg; g.fill();
  g.strokeStyle = '#222'; g.lineWidth = 2;
  for (let i = 1; i < 12; i++) { const t = .08 + i * .07; g.beginPath(); g.moveTo(...at(.04, t)); g.lineTo(...at(.96, t)); g.stroke(); }
  for (const s of [.04, .3, .55, .75, .96]) { g.beginPath(); g.moveTo(...at(s, .15)); g.lineTo(...at(s, .85)); g.stroke(); }
  g.strokeStyle = 'rgba(40,70,200,.75)'; g.lineWidth = 2.5;
  for (let r = 0; r < 8; r++) { const t = .2 + r * .07; g.beginPath(); for (let k = 0; k <= 20; k++) { const s = .78 + k * .008; const [x, y] = at(s, t); g.lineTo(x, y + Math.sin(k * 1.3 + r) * 6); } g.stroke(); }
  return c.toDataURL('image/jpeg', .92);
}, { W, H, Q });

const abrir = async (page, url) => {
  await page.evaluate(u => { window.__tfR = undefined; window.__tfP = tFotoEditor(u).then(v => { window.__tfR = v; return v; }); }, url);
  await expect(page.locator('#tfWs [data-tf="next"]')).toBeEnabled({ timeout: 15000 });
};
const resultado = page => page.waitForFunction(() => window.__tfR !== undefined, null, { timeout: 30000 }).then(() => page.evaluate(() => window.__tfR));
/** Medidas del JPEG resultante: proporción, fracción de píxeles claros dentro de la hoja y píxeles azules */
const medir = (page, url) => page.evaluate(async u => {
  const im = new Image(); im.src = u; await im.decode();
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; let claro = 0, azul = 0, n = 0;
  for (let i = 0; i < d.length; i += 16) { n++; const r = d[i], gg = d[i + 1], b = d[i + 2]; if (r > 225 && gg > 225 && b > 225) claro++; if (b > r + 40 && b > gg + 30) azul++; }
  return { w: im.width, h: im.height, claro: claro / n, azul };
}, url);

test('foto: propuesta de esquinas, Listo enderezado y claro, Repetir y Usar original', async ({ page }, info) => {
  const errors = await openApp(page, { as: 'tcap', editar: false });
  const url = await fotoSintetica(page);
  // propuesta automática cerca de las esquinas reales (±4 %)
  await page.setViewportSize({ width: 390, height: 844 });
  await abrir(page, url);
  const det = await page.evaluate(() => ({ q: TFE.q, ok: TFE.det.ok, ms: TFE.detMs }));
  expect(det.ok).toBe(true);
  det.q.forEach((p, i) => { expect(Math.abs(p[0] - Q[i][0]), `esquina ${i} x`).toBeLessThan(0.04); expect(Math.abs(p[1] - Q[i][1]), `esquina ${i} y`).toBeLessThan(0.04); });
  console.log('detección (ms):', det.ms);
  await expect(page.locator('#tfWs .tf-h')).toHaveCount(4);
  for (const h of await page.locator('#tfWs .tf-h').all()) expect((await h.boundingBox()).width).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: info.outputPath('foto-esquinas-390.png') });
  // arrastrar una esquina la mueve
  const h0 = page.locator('#tfWs .tf-h[data-tfh="0"]'), b0 = await h0.boundingBox();
  await page.mouse.move(b0.x + 24, b0.y + 24); await page.mouse.down(); await page.mouse.move(b0.x + 34, b0.y + 44, { steps: 4 });
  await expect(page.locator('#tfLupa')).toBeVisible();
  await page.mouse.move(b0.x + 24, b0.y + 24, { steps: 4 }); await page.mouse.up();
  await expect(page.locator('#tfLupa')).toBeHidden();
  // resultado: filtro Documento por omisión, girar y volver
  await page.locator('#tfWs [data-tf="next"]').click();
  await expect(page.locator('#tfWs [data-tff="doc"]')).toHaveClass(/on/);
  await expect(page.locator('#tfRes')).toBeVisible();
  await page.screenshot({ path: info.outputPath('foto-resultado-390.png') });
  await page.locator('#tfWs [data-tf="rot"]').click();
  await expect.poll(() => page.evaluate(() => TFE.rot)).toBe(1);
  await page.locator('#tfWs [data-tf="rot"]').click(); await page.locator('#tfWs [data-tf="rot"]').click(); await page.locator('#tfWs [data-tf="rot"]').click();
  await expect.poll(() => page.evaluate(() => TFE.rot)).toBe(0);
  await page.locator('#tfWs [data-tf="ok"]').click();
  const out = await resultado(page);
  expect(out).toMatch(/^data:image\/jpeg/);
  const m = await medir(page, out);
  console.log('Listo 1600×1200 (ms):', await page.evaluate(() => window.__tfMs), m);
  expect(Math.max(m.w, m.h)).toBeLessThanOrEqual(2000);
  expect(m.w / m.h).toBeGreaterThan(1.3); expect(m.w / m.h).toBeLessThan(1.55);   // A4 apaisado
  expect(m.claro).toBeGreaterThan(0.6);                                          // fondo blanco (sin el gris de la obra)
  expect(m.azul).toBeGreaterThan(20);                                            // las firmas azules siguen azules
  await expect(page.locator('#tfWs')).toHaveCount(0);

  // PC: «Repetir foto» → null
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrir(page, url);
  await page.screenshot({ path: info.outputPath('foto-esquinas-1440.png') });
  await page.locator('#tfWs [data-tf="next"]').click();
  await page.locator('#tfWs [data-tff="color"]').click();
  await expect(page.locator('#tfWs [data-tff="color"]')).toHaveClass(/on/);
  await page.screenshot({ path: info.outputPath('foto-resultado-1440.png') });
  await page.locator('#tfWs [data-tf="retake"]').click();
  expect(await resultado(page)).toBeNull();
  // «Usar original» → la misma imagen
  await abrir(page, url);
  await page.locator('#tfWs [data-tf="orig"]').click();
  expect(await resultado(page)).toBe(url);
  // modo oscuro
  await page.emulateMedia({ colorScheme: 'dark' });
  await abrir(page, url);
  await page.screenshot({ path: info.outputPath('foto-esquinas-oscuro.png') });
  await page.keyboard.press('Escape');
  await expect(page.locator('#tfWs')).toHaveCount(1);
  await page.locator('#tfWs [data-tf="retake"]').click();
  await resultado(page);
  noErrors(errors, 'editor de foto');
});

test('foto: sin formato reconocible propone un margen del 5 %', async ({ page }) => {
  const errors = await openApp(page, { as: 'tcap', editar: false });
  const url = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#777'; g.fillRect(0, 0, 800, 600); return c.toDataURL('image/jpeg', .9); });
  await abrir(page, url);
  const det = await page.evaluate(() => ({ q: TFE.q, ok: TFE.det.ok }));
  expect(det.ok).toBe(false);
  expect(det.q).toEqual([[.05, .05], [.95, .05], [.95, .95], [.05, .95]]);
  await expect(page.locator('#tfSub')).toContainText('arrastra las 4 esquinas');
  await page.locator('#tfWs [data-tf="next"]').click();
  await page.locator('#tfWs [data-tf="ok"]').click();
  expect(await resultado(page)).toMatch(/^data:image\/jpeg/);
  noErrors(errors, 'foto sin formato');
});

test('foto: 12 MP en un celular lento (CPU ×4) se procesa en pocos segundos', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await openApp(page, { as: 'tcap', editar: false });
  await page.setViewportSize({ width: 390, height: 844 });
  const url = await fotoSintetica(page, 4000, 3000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await abrir(page, url);
  const tAbrir = Date.now() - t0, det = await page.evaluate(() => ({ ok: TFE.det.ok, ms: TFE.detMs }));
  expect(det.ok).toBe(true);
  const t1 = Date.now();
  await page.locator('#tfWs [data-tf="next"]').click();
  await expect(page.locator('#tfRes')).toBeVisible();
  await expect(page.locator('#tfBusy')).toBeHidden();
  const tPrev = Date.now() - t1;
  await expect(page.locator('#tfBusy')).toHaveText('Procesando…');   // aviso mientras procesa (aquí puede durar muy poco)
  await page.locator('#tfWs [data-tf="ok"]').click();
  const out = await resultado(page);
  const tListo = await page.evaluate(() => window.__tfMs);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const m = await medir(page, out);
  console.log(`12 MP con CPU ×4: abrir+detectar ${tAbrir} ms (detección ${det.ms} ms), vista previa ${tPrev} ms, «Listo» ${tListo} ms, salida ${m.w}×${m.h}, ${Math.round(out.length / 1024)} KB`);
  expect(Math.max(m.w, m.h)).toBeLessThanOrEqual(2000);
  expect(tListo).toBeLessThan(15000);
  noErrors(errors, 'foto 12 MP');
});
