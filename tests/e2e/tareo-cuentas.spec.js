// Cuentas de capataz del tareo con usuario (DNI) y contraseña (docs/ia/tareo.md, «Cuentas de capataz (oct 2026)»).
// La función cuentaCapataz se simula en fake-firebase.js (firebase.functions().httpsCallable) contra la base falsa.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { openApp, noErrors, HOY } from './helpers.js';

const FAKE = path.join(path.dirname(new URL(import.meta.url).pathname), 'fake-firebase.js');
const ob = (dni, ape, nom, cap, extra = {}) => ['tper', dni, { dni, ape, nom, pue: 'OPERARIO', cat: 'OP', cua: 'ALBAÑILES', cap, ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true, ...extra }];
const DNI = '40000010', MAIL = DNI + '@tareo.lps911.pe';
const EXTRA = [
  ob(DNI, 'QUISPE MAMANI', 'JUAN CARLOS', '', { pue: 'CAPATAZ', cat: 'CA' }),
  ob('40000001', 'ALVA ROJAS', 'ANA', 'u_viejo1'),
  ob('40000002', 'BRAVO DIAZ', 'BETO', 'u_viejo1'),
  ob('40000003', 'CASTRO PAZ', 'CARLOS', 'tcap@obra.pe'),
  ['members', 'u_viejo1', { role: 'tcap', name: 'Juan (celular)', inv: 'x', added: 1 }],
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de muros', und: 'm2', act: true, ord: 1 }],
];

test('asistente de tareo: crea la cuenta, pasa los obreros del enlace, cambia la contraseña y la desactiva', async ({ page }) => {
  page.on('dialog', d => d.accept());
  const errors = await openApp(page, { as: 'tasis', tab: 'tper', editar: false, extra: EXTRA });
  await page.evaluate(dni => { tFicha(dni); tCapCuenta(dni); }, DNI);
  const m = page.locator('#lqm');
  await expect(m).toContainText('SIN CUENTA');
  await expect(m).toContainText('Quispe Mamani'.toUpperCase());
  const pw = m.locator('#tctaPw');
  await expect(pw).toHaveValue(/^\d{6}$/);
  // contraseña corta: no llama al servidor
  await pw.fill('123');
  await m.locator('[data-tcta="crear"]').click();
  await expect(m.locator('#tctaMsg')).toContainText('al menos 6');
  expect(await page.evaluate(() => window.__fnCalls.length)).toBe(0);
  await pw.fill('246810');
  await m.locator('#tctaDe').selectOption('u_viejo1');
  await m.locator('[data-tcta="crear"]').click();
  await expect(m).toContainText('Cuenta creada · 2 obreros pasaron a su cuenta');
  await expect(m.locator('#tctaSt')).toHaveText('CUENTA ACTIVA');
  const txt = await m.locator('#tctaTxt').textContent();
  expect(txt).toMatch(new RegExp(`^Usuario: ${DNI} · Contraseña: 246810 · Entra a http://localhost:\\d+/$`));
  expect(decodeURIComponent(await m.locator('#tctaWa').getAttribute('href'))).toContain(`Usuario: ${DNI} · Contraseña: 246810`);
  const calls = await page.evaluate(() => window.__fnCalls);
  expect(calls).toEqual([{ name: 'cuentaCapataz', data: { accion: 'crear', dni: DNI, clave: '246810', de: 'u_viejo1' } }]);
  const mem = await page.evaluate(id => window.__dbGet('members', id), MAIL);
  expect(mem).toMatchObject({ role: 'tcap', name: 'Juan Carlos Quispe Mamani', dni: DNI, by: 'tasis@obra.pe' });
  expect(mem.off).toBeUndefined();
  expect(await page.evaluate(d => window.__dbGet('tper', d).cta, DNI)).toBe(MAIL);
  expect(await page.evaluate(() => ['40000001', '40000002', '40000003'].map(d => window.__dbGet('tper', d).cap))).toEqual([MAIL, MAIL, 'tcap@obra.pe']);
  expect(await page.evaluate(() => window.__dbGet('members', 'u_viejo1'))).toMatchObject({ off: true, movTo: MAIL });
  expect((await page.evaluate(() => window.__authUsers()))[MAIL]).toMatchObject({ pass: '246810', disabled: false });

  // «Listo»: vuelve a la ventana con la cuenta activa → cambiar contraseña
  await m.locator('[data-tcta="back"]').click();
  await expect(m).toContainText('2 obreros asignados');
  await expect(m.locator('#tctaDe')).toHaveCount(0); // ya no quedan capataces con enlace
  await m.locator('#tctaPw').fill('135790');
  await m.locator('[data-tcta="clave"]').click();
  await expect(m).toContainText('Contraseña cambiada');
  await expect(m.locator('#tctaTxt')).toContainText('Contraseña: 135790');
  expect((await page.evaluate(() => window.__authUsers()))[MAIL].pass).toBe('135790');

  // desactivar (con confirmación): Auth deshabilitada y members.off
  await m.locator('[data-tcta="back"]').click();
  await m.locator('[data-tcta="off"]').click();
  await expect(page.locator('#lqm')).toHaveCount(0);
  expect(await page.evaluate(id => window.__dbGet('members', id).off, MAIL)).toBe(true);
  expect((await page.evaluate(() => window.__authUsers()))[MAIL].disabled).toBe(true);
  await page.evaluate(dni => tCapCuenta(dni), DNI);
  await expect(page.locator('#lqm #tctaSt')).toHaveText('DESACTIVADA');
  await expect(page.locator('#lqm [data-tcta="crear"]')).toHaveText('Reactivar cuenta');
  noErrors(errors, 'cuentas de capataz');
});

test('solo el administrador y el asistente abren la ventana de cuentas', async ({ page }) => {
  await openApp(page, { as: 'jefe', tab: 'tper', editar: false, extra: EXTRA });
  await page.evaluate(dni => tCapCuenta(dni), DNI);
  await expect(page.locator('#lqm')).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('Solo el administrador');
});

/* celular nuevo, sin sesión: entra con «Soy capataz» */
async function abrirSinSesion(browser, extra, authUsers, anon) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.clock.setFixedTime(new Date(HOY + 'T09:30:00-05:00'));
  await page.route(/^https?:\/\/(?!localhost)/, r => r.fulfill({ status: 200, contentType: /\.css(\?|$)|fonts\.googleapis/.test(r.request().url()) ? 'text/css' : 'text/javascript', body: '' }));
  await page.route('**/firebase-config.js', r => r.fulfill({ status: 200, contentType: 'text/javascript',
    body: 'window.FIREBASE_CONFIG={apiKey:"e2e",projectId:"demo-lps"};window.LPS_ENV="pruebas";window.NO_SW=true;' }));
  await page.addInitScript(({ HOY, extra, authUsers, anon }) => { window.__E2E = { user: anon || null, today: HOY, extra, authUsers }; }, { HOY, extra, authUsers, anon });
  await page.addInitScript({ path: FAKE });
  await page.goto('/');
  return { ctx, page, errors };
}

test('«Soy capataz»: DNI y contraseña entran directo al tareo con su cuadrilla', async ({ browser }) => {
  const extra = [...EXTRA.map(x => x[0] === 'tper' && x[2].cap === 'u_viejo1' ? ['tper', x[1], { ...x[2], cap: MAIL }] : x),
    ['members', MAIL, { role: 'tcap', name: 'Juan Carlos Quispe Mamani', dni: DNI, added: 1, by: 'tasis@obra.pe' }]];
  const { ctx, page, errors } = await abrirSinSesion(browser, extra, { [MAIL]: { uid: 'ct1', pass: '246810' } });
  await expect(page.locator('#lform')).toBeVisible();
  await page.click('#lcapgo');
  const f = page.locator('#lcap');
  await expect(f).toBeVisible();
  await expect(page.locator('#lform')).toBeHidden();
  await expect(page.locator('#cdni')).toHaveAttribute('inputmode', 'numeric');
  await page.fill('#cdni', DNI);
  await page.fill('#cpass', '111111');
  await page.click('#csubmit');
  await expect(page.locator('#cmsg')).toHaveText('DNI o contraseña incorrectos. Pide a la oficina que te la cambie.');
  await page.fill('#cdni', '4000001'); // DNI sin el cero: tampoco existe
  await page.fill('#cpass', '246810');
  await page.click('#csubmit');
  await expect(page.locator('#cmsg')).toContainText('DNI o contraseña incorrectos');
  await page.fill('#cdni', ' ' + DNI + ' ');
  await page.click('#csubmit');
  await expect(page.locator('#login')).toBeHidden();
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
  expect(await page.evaluate(() => [me.email, me.role, U.mod, TAR_ONLY()])).toEqual([MAIL, 'tcap', 'tar', true]);
  const root = page.locator('#tcRoot');
  await expect(root).toBeVisible();
  await expect(root.locator('.tc-ob')).toHaveCount(2);
  await expect(root).toContainText('ALVA');
  await expect(root).not.toContainText('CASTRO');
  // al salir vuelve a «Soy capataz» (se recuerda en el equipo)
  await page.evaluate(() => auth.signOut());
  await expect(page.locator('#lcap')).toBeVisible();
  noErrors(errors, 'soy capataz');
  await ctx.close();
});

test('cuenta desactivada: aviso claro al entrar', async ({ browser }) => {
  const { ctx, page } = await abrirSinSesion(browser, [...EXTRA, ['members', MAIL, { role: 'tcap', name: 'Juan', dni: DNI, off: true }]], { [MAIL]: { uid: 'ct1', pass: '246810', disabled: true } });
  await page.click('#lcapgo');
  await page.fill('#cdni', DNI);
  await page.fill('#cpass', '246810');
  await page.click('#csubmit');
  await expect(page.locator('#cmsg')).toHaveText('Tu cuenta está desactivada. Habla con la oficina.');
  await ctx.close();
});

test('el celular con enlace cuyo usuario pasó a una cuenta con DNI: sale y le pide entrar con su DNI', async ({ browser }) => {
  const extra = [...EXTRA, ['members', 'u_cel9', { role: 'tcap', name: 'Juan (celular)', inv: 'x', added: 1, off: true, movTo: MAIL }]];
  const { ctx, page } = await abrirSinSesion(browser, extra, {}, { uid: 'cel9', email: null, isAnonymous: true, emailVerified: false });
  await expect(page.locator('#lcap')).toBeVisible();
  await expect(page.locator('#cmsg')).toContainText('se pasó a una cuenta con DNI y contraseña');
  await ctx.close();
});

test('Equipo: la invitación por enlace recomienda la cuenta con usuario y contraseña', async ({ page }) => {
  await openApp(page, { as: 'admin', tab: 'team', editar: false });
  await page.click('[data-teamv="cap"]');
  await expect(page.locator('[data-tctanote]')).toContainText('Tareo › Personal › Hacer capataz');
});
