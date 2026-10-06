// Módulo Tareo en el celular y en «📱 Vista celular» del administrador (docs/ia/interfaz.md, tareo.md):
// sin desborde horizontal, pestañas del tareo en la barra inferior, sin errores; y la barra «Ver como» plegable y movible.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

const per = (dni, ape, cap) => ['tper', dni, { dni, ape, nom: 'XIMENA ROSA', pue: 'OPERARIO ALBAÑIL', cat: 'OP', cua: 'ALBAÑILES', cap, ing: '2026-01-05', ces: '', mot: '', per: [{ ing: '2026-01-05', ces: '', mot: '' }], act: true }];
const EXTRA = [
  ['tpc', 'p10_05', { cod: '10.05', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de pedestales y muros de contención', und: 'm2', act: true, ord: 1 }],
  ['tpc', 'p10_10', { cod: '10.10', grp: '10', grpN: 'ESTRUCTURAS', nom: 'Encofrado de escaleras', act: true, ord: 2 }],
  ...['frandiopacheco@gmail.com', 'tcap@obra.pe'].flatMap((c, j) => [1, 2, 3].map(i => per(String(1000000 * (j + 1) + i).padStart(8, '0'), 'APELLIDOLARGO MATERNOLARGO' + i, c))),
  ['tareo', HOY + '_tcap@obra.pe', { date: HOY, cap: 'tcap@obra.pe', capN: 'Teodoro Capataz', st: 'env', envAt: 1, envBy: 'tcap@obra.pe', foto: [],
    rows: { '02000001': { ape: 'ALFA', nom: 'X', cat: 'OP', cua: 'ALBAÑILES', as: true, mot: '', alt: false } },
    blq: [{ id: 'b1', pc: 'p10_05', ini: '07:30', fin: '12:00', dnis: ['02000001'] }], hist: [], by: 'tcap@obra.pe', ts: 1 }],
];
const TAR = ['tdia', 'tper', 'tpc', 'tcfg'];

/* revisa la pantalla actual de `fr` (página o marco): sin desborde horizontal y con las pestañas del tareo a mano */
async function revisa(fr, ctx) {
  const st = await fr.evaluate(() => ({ view: document.querySelector('#main')?.dataset.view, mod: U.mod, sw: document.documentElement.scrollWidth, iw: innerWidth,
    bnav: !!document.querySelector('#bnav')?.offsetParent, items: [...document.querySelectorAll('#bnav [data-bt]')].map(b => b.dataset.bt),
    tabs: [...tabPrimary(), ...tabSecondary()].filter(t => t.startsWith('t')), more: bnavMore(), err: (document.querySelector('#main')?.textContent || '').includes('No se pudo mostrar') }));
  expect(st.mod, ctx).toBe('tar');
  expect(st.err, ctx).toBe(false);
  expect(st.sw, `${ctx}: sin desborde horizontal`).toBeLessThanOrEqual(st.iw);
  expect(st.bnav, `${ctx}: barra inferior visible`).toBe(true);
  for (const t of st.tabs) expect(st.items.includes(t) || st.more.includes(t), `${ctx}: ${t} en la barra o en «Más»`).toBe(true);
  return st;
}

test.describe('celular (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('admin: entra al Tareo desde «Más» y recorre sus pestañas', async ({ page }) => {
    const errors = await openApp(page, { as: 'admin', editar: false, extra: EXTRA });
    await page.click('#bnav [data-bt="more"]');
    await page.click('#msheet [data-mod="tar"]');
    await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
    expect(await page.$$eval('#bnav [data-bt]', bs => bs.map(b => b.dataset.bt))).toEqual([...TAR, 'more']);
    for (const t of TAR) {
      await page.click(`#bnav [data-bt="${t}"]`);
      await expect(page.locator('#main')).toHaveAttribute('data-view', t);
      await revisa(page, 'admin ' + t);
    }
    // el selector de módulo sigue a mano en «Más» para volver
    await page.click('#bnav [data-bt="more"]');
    await expect(page.locator('#msheet [data-mod="lps"]')).toBeVisible();
    noErrors(errors, 'admin celular');
  });

  for (const role of ['tcap', 'tasis', 'tcos']) {
    test(`admin «ver como» ${role}: pantallas sin desborde y la barra no tapa nada`, async ({ page }) => {
      const errors = await openApp(page, { as: 'admin', va: { role }, editar: false, extra: EXTRA });
      await expect(page.locator('#main')).toHaveAttribute('data-view', 'tdia');
      for (const t of await page.evaluate(() => TAR_TABS.filter(tabAllowed))) {
        await page.evaluate(t => goTab(t), t);
        await expect(page.locator('#main')).toHaveAttribute('data-view', t);
        await revisa(page, `${role} ${t}`);
      }
      // en el celular «Ver como» empieza plegada: una pastilla que no tapa la barra inferior
      await page.evaluate(() => goTab('tdia'));
      const pill = page.locator('#vabar .vapill');
      await expect(pill).toBeVisible();
      const pb = await pill.boundingBox(), nb = await page.locator('#bnav').boundingBox();
      expect(pb.y + pb.height, 'la pastilla queda sobre la barra inferior').toBeLessThanOrEqual(nb.y);
      if (role === 'tcap') {
        // ni sobre el botón fijo del capataz («Siguiente…»), que se puede tocar
        const fb = await page.locator('.tc-foot').boundingBox();
        expect(pb.y + pb.height, 'la pastilla queda sobre el botón del capataz').toBeLessThanOrEqual(fb.y);
        await page.locator('.tc-foot [data-tcs="2"]').click();
        await expect(page.locator('#tcRoot')).toContainText('¿En qué trabajaron?');
      }
      noErrors(errors, 'ver como ' + role);
    });
  }

  test('tcap real: su tareo en el celular, sin desborde', async ({ page }) => {
    const errors = await openApp(page, { as: 'tcap', editar: false, extra: EXTRA });
    await expect(page.locator('#tcRoot')).toBeVisible();
    await revisa(page, 'tcap');
    await expect(page.locator('#vabar')).toHaveCount(0);
    noErrors(errors, 'tcap');
  });
});

test.describe('«📱 Vista celular» del administrador', () => {
  const marco = async page => {
    await expect(page.frameLocator('#phprev iframe').locator('#loading')).toHaveCount(0, { timeout: 15_000 });
    const f = page.frames().find(x => x !== page.mainFrame());
    await expect.poll(() => f.evaluate(() => !!document.querySelector('#main')?.dataset.view)).toBe(true);
    return f;
  };

  test('admin en el Tareo: el marco abre en la misma pestaña del Tareo', async ({ page }) => {
    const errors = await openApp(page, { as: 'admin', editar: false, extra: EXTRA });
    await page.click('#modsel [data-mod="tar"]');
    await page.click('#tabs [data-tab="tper"]');
    await page.click('#bpht');
    const f = await marco(page);
    await expect.poll(() => f.evaluate(() => document.querySelector('#main').dataset.view)).toBe('tper');
    await revisa(f, 'marco admin tper');
    for (const t of TAR) {
      await f.evaluate(t => goTab(t), t);
      await revisa(f, 'marco admin ' + t);
    }
    noErrors(errors, 'vista celular admin');
  });

  for (const role of ['tcap', 'tasis', 'tcos']) {
    test(`admin «ver como» ${role} en el marco`, async ({ page }) => {
      const errors = await openApp(page, { as: 'admin', va: { role }, editar: false, extra: EXTRA });
      await page.evaluate(() => phonePreview('iphone'));
      const f = await marco(page);
      await revisa(f, 'marco ' + role);
      expect(await f.evaluate(() => !!document.querySelector('#vabar'))).toBe(false);
      noErrors(errors, 'marco ' + role);
    });
  }
});

test('barra «Ver como»: se pliega a una pastilla, se mueve de esquina y lo recuerda', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', va: { role: 'tasis' }, editar: false });
  const bar = page.locator('#vabar');
  // en la PC empieza desplegada, abajo a la derecha
  await expect(bar.locator('[data-va="out"]')).toBeVisible();
  await expect(bar).toHaveClass(/p-br/);
  await bar.locator('[data-va="min"]').click();
  const pill = bar.locator('.vapill');
  await expect(pill).toBeVisible();
  await expect(bar.locator('[data-va="out"]')).toHaveCount(0);
  expect((await pill.boundingBox()).width).toBeLessThan(260);
  // arrastrar la pastilla a la esquina superior izquierda
  const b = await pill.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(300, 300, { steps: 5 });
  await page.mouse.move(60, 140, { steps: 5 });
  await page.mouse.up();
  await expect(bar).toHaveClass(/p-tl/);
  await expect(pill).toBeVisible(); // soltar no la despliega
  const top = await page.locator('.top').boundingBox(), pb = await pill.boundingBox();
  expect(pb.x).toBeLessThan(40);
  expect(pb.y, 'debajo de la barra superior').toBeGreaterThanOrEqual(top.y + top.height);
  // se recuerda al recargar
  await page.reload();
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator('#vabar')).toHaveClass(/p-tl/);
  await expect(page.locator('#vabar .vapill')).toBeVisible();
  // tocarla la despliega
  await page.locator('#vabar .vapill').click();
  await expect(page.locator('#vabar [data-va="out"]')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('lps.vab')))).toEqual({ min: false, pos: 'tl' });
  noErrors(errors, 'barra ver como');
});
