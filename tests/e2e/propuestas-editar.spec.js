// Editar los días al revisar propuestas (caso real, semana del 12 oct 2026):
// 1) editar una fila borraba en silencio lo editado en otra (solo se guardaba una fila a la vez);
// 2) quitar todos los días para elegir otros más adelante rechazaba la fila entera.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const D = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13'];
const A = (n, o) => ({ ambId: 'a1', sc: 'c1', name: n, und: 'm2', metrado: 30, days: [D[0]], order: o });
const it = (base, days) => ({ after: { ...base, days }, base, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: Date.parse('2026-09-30T10:00:00-05:00') });
const extra = [['acts', 'r1', A('Tarrajeo', 300)], ['acts', 'r2', A('Empaste', 301)], ['acts', 'r3', A('Pintura', 302)],
  ['lhprop', 'c1', { sc: 'c1', items: { r1: it(A('Tarrajeo', 300), [D[1], D[2]]), r2: it(A('Empaste', 301), [D[2], D[3]]), r3: it(A('Pintura', 302), [D[3]]) }, sentAt: 1, sentBy: 'Sandra' }]];
const cell = (page, a, d) => page.locator(`#grid tr[data-a="${a}"] td.d[data-d="${d}"]`);
const onDays = (page, a) => page.evaluate(a => [...document.querySelectorAll(`#grid tr[data-a="${a}"] td.d.on`)].map(t => t.dataset.d), a);

async function review(page) {
  const errors = await openApp(page, { tab: 'look', extra });
  await page.locator('[data-pp="rev"]').first().click();
  await expect(page.locator('#grid tr.rvrow[data-a="r1"]')).toBeVisible();
  return errors;
}

test('los días editados se guardan por fila: editar otra fila no borra lo anterior y «Aceptar todo» usa cada edición', async ({ page }) => {
  const errors = await review(page);
  await cell(page, 'r1', D[4]).click();
  await cell(page, 'r2', D[5]).click();
  await cell(page, 'r1', D[6]).click();
  await expect.poll(() => onDays(page, 'r1')).toEqual([D[1], D[2], D[4], D[6]]);
  await expect.poll(() => onDays(page, 'r2')).toEqual([D[2], D[3], D[5]]);
  page.once('dialog', d => d.accept());
  await page.locator('[data-rvall]').click();
  await expect.poll(() => page.evaluate(() => Object.values(__dbGet('lhprop', 'c1').items).filter(Boolean).length)).toBe(0);
  expect((await page.evaluate(() => __dbGet('acts', 'r1'))).days).toEqual([D[1], D[2], D[4], D[6]]);
  expect((await page.evaluate(() => __dbGet('acts', 'r2'))).days).toEqual([D[2], D[3], D[5]]);
  expect((await page.evaluate(() => __dbGet('acts', 'r3'))).days).toEqual([D[3]]);
  noErrors(errors, 'editar varias filas');
});

test('quitar todos los días no rechaza la fila: queda vacía, no se acepta así y se eligen días nuevos', async ({ page }) => {
  const errors = await review(page);
  await cell(page, 'r2', D[2]).click();
  await cell(page, 'r2', D[3]).click();
  await expect.poll(() => onDays(page, 'r2')).toEqual([]);
  expect(await page.evaluate(() => !!__dbGet('lhprop', 'c1').items.r2)).toBe(true);
  expect(Object.keys(await page.evaluate(() => __dbAll('lhphist')))).toHaveLength(0);
  await expect(page.locator('.rvpsel')).toContainText('sin días');
  // ✓ con la fila vacía: no acepta
  await page.locator('#grid tr[data-a="r2"] [data-rva="ok"]').click();
  await expect(page.locator('#toast')).toContainText('no tiene días');
  expect(await page.evaluate(() => !!__dbGet('lhprop', 'c1').items.r2)).toBe(true);
  // elige días más adelante y acepta
  await cell(page, 'r2', D[5]).click();
  await cell(page, 'r2', D[6]).click();
  await page.locator('#grid tr[data-a="r2"] [data-rva="ok"]').click();
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'r2').days)).toEqual([D[5], D[6]]);
  noErrors(errors, 'vaciar una fila');
});

test('«Aceptar todo» deja pendiente la fila vacía; si el SC reenvía la fila, se descarta lo editado en ella', async ({ page }) => {
  const errors = await review(page);
  await cell(page, 'r3', D[3]).click(); // r3 queda sin días
  await cell(page, 'r1', D[4]).click(); // r1 editada
  // el SC reenvía r1 con otra versión
  await page.evaluate(D => fcol('lhprop').doc('c1').set({ items: { r1: { ...__dbGet('lhprop', 'c1').items.r1, ts: 2, after: { ...__dbGet('lhprop', 'c1').items.r1.after, days: [D[5]] } } } }, { merge: true }), D);
  await expect(page.locator('#toast')).toContainText('reenvió');
  await expect.poll(() => onDays(page, 'r1')).toEqual([D[5]]);
  page.once('dialog', d => d.accept());
  await page.locator('[data-rvall]').click();
  await expect.poll(() => page.evaluate(() => Object.keys(__dbGet('lhprop', 'c1').items).filter(k => __dbGet('lhprop', 'c1').items[k]))).toEqual(['r3']);
  expect((await page.evaluate(() => __dbGet('acts', 'r1'))).days).toEqual([D[5]]);
  noErrors(errors, 'aceptar todo con fila vacía');
});

/* ---- auditoría oct 2026 (Chromium + lectura de código + informe externo) ---- */
const Q = { ...A('Montantes', 303), days: [D[0]], qty: { [D[0]]: 10 } };
const extraQ = [['acts', 'r4', Q], ['lhprop', 'c1', { sc: 'c1', sentAt: 1, items: { r4: it(Q, [D[1], D[2]]) } }]];
extraQ[1][2].items.r4.after.qty = { [D[1]]: 10, [D[2]]: 20 };

test('Enter con la ventanita de motivos abierta no acepta otra fila; Escape no borra lo editado', async ({ page }) => {
  const errors = await review(page);
  await page.locator('#grid tr[data-a="r1"] td.act').click(); // r1 elegida
  await cell(page, 'r2', D[5]).click(); // edita r2 (queda elegida r2)
  await page.locator('#grid tr[data-a="r1"] td.act').click(); // vuelve a elegir r1
  await page.locator('#grid tr[data-a="r3"] [data-rva="rej"]').click(); // ventanita de motivos de r3
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  /* Enter actúa sobre la ventanita (elige el motivo con el foco para r3), nunca acepta la fila elegida (r1) */
  const H = Object.values(await page.evaluate(() => __dbAll('lhphist')));
  expect(H.filter(h => h.st !== 'rej')).toHaveLength(0);
  expect(await page.evaluate(() => !!__dbGet('lhprop', 'c1').items.r1)).toBe(true);
  expect(await page.evaluate(() => revEd('r2'))).toEqual([D[2], D[3], D[5]]);
  noErrors(errors, 'teclado con ventanita');
});

test('‹ › se guarda en cada fila y mueve también las cantidades por día', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look', extra: extraQ });
  await page.locator('[data-pp="rev"]').first().click();
  await expect(page.locator('#grid tr.rvrow[data-a="r4"]')).toBeVisible();
  await page.evaluate(() => { REVSEL = { sc: 'c1', id: 'r4', k: 0 }; revStep(1); });
  expect(await page.evaluate(() => REVED.get('r4'))).toMatchObject({ days: [D[2], D[3]], qty: { [D[2]]: 10, [D[3]]: 20 } });
  await page.evaluate(() => { REVSEL = null; revGo(1); }); // elegir otra cosa no lo borra
  expect(await page.evaluate(() => revEd('r4'))).toEqual([D[2], D[3]]);
  await page.locator('#grid tr[data-a="r4"] [data-rva="ok"]').click();
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'r4').qty)).toEqual({ [D[2]]: 10, [D[3]]: 20 });
  noErrors(errors, 'mover con cantidades');
});

test('se acepta la versión que se vio: si el SC reenvía entre que se ve y se confirma, esa queda pendiente', async ({ page }) => {
  const errors = await review(page);
  await page.evaluate(async D => {
    const sel = revVisItems().map(o => ({ sc: o.sc, id: o.id, ver: RVSEEN.get(o.id) })); // lo que se vio al pulsar «Aceptar todo»
    __dbRemote = true; const x = __dbGet('lhprop', 'c1').items.r1;
    await fcol('lhprop').doc('c1').update(new firebase.firestore.FieldPath('items', 'r1'), { ...x, ts: 2, after: { ...x.after, days: [D[6]] } }); __dbRemote = false;
    await new Promise(r => setTimeout(r, 50));
    await decideMany(sel);
  }, D);
  await expect.poll(() => page.evaluate(() => Object.keys(__dbAll('lhphist')).length)).toBe(2);
  expect((await page.evaluate(() => __dbGet('acts', 'r1'))).days).toEqual([D[0]]); // no se aplicó lo que nadie vio
  expect((await page.evaluate(() => __dbGet('lhprop', 'c1'))).items.r1.ts).toBe(2);
  noErrors(errors, 'versión vista');
});

test('un solo Ctrl+Z deshace todo «Aceptar todo» y las propuestas vuelven a pendientes', async ({ page }) => {
  const errors = await review(page);
  page.once('dialog', d => d.accept());
  await page.locator('[data-rvall]').click();
  await expect.poll(() => page.evaluate(() => Object.values(__dbGet('lhprop', 'c1').items).filter(Boolean).length)).toBe(0);
  await page.evaluate(() => undo());
  await expect.poll(() => page.evaluate(() => Object.values(__dbGet('lhprop', 'c1').items).filter(Boolean).length)).toBe(3);
  for (const id of ['r1', 'r2', 'r3']) expect((await page.evaluate(id => __dbGet('acts', id), id)).days).toEqual([D[0]]);
  noErrors(errors, 'deshacer el lote');
});

test('aceptar y deshacer casi seguidos: el deshacer espera a que se guarde y la base queda coherente', async ({ page }) => {
  const errors = await review(page);
  await page.evaluate(() => { const rt = db.runTransaction.bind(db); db.runTransaction = async fn => { await new Promise(r => setTimeout(r, 250)); const x = await rt(fn); await new Promise(r => setTimeout(r, 250)); return x; }; });
  const p = page.evaluate(() => revDecide('r1', 'ok'));
  await page.waitForTimeout(150); await page.evaluate(() => undo()); await p;
  await expect.poll(() => page.evaluate(() => !!__dbGet('lhprop', 'c1').items.r1)).toBe(true);
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'r1').days)).toEqual([D[0]]);
  noErrors(errors, 'aceptar y deshacer');
});

test('📅 Otra fecha: elegir la fecha solo mueve y se ve en la grilla; se acepta después con ✓', async ({ page }) => {
  const errors = await review(page);
  await page.locator('#grid tr[data-a="r1"] td.act').click();
  await page.locator('#rvpanel [data-rvmv="date"]').click();
  await page.fill('#pst', D[5]);
  await page.locator('#pop [data-do="go"]').click();
  expect(await page.evaluate(() => revEd('r1'))).toEqual([D[5], D[6]]);
  expect((await page.evaluate(() => __dbGet('acts', 'r1'))).days).toEqual([D[0]]); // todavía no se aceptó
  expect(await page.evaluate(() => !!__dbGet('lhprop', 'c1').items.r1)).toBe(true);
  await page.locator('#grid tr[data-a="r1"] [data-rva="ok"]').click();
  await expect.poll(() => page.evaluate(() => __dbGet('acts', 'r1').days)).toEqual([D[5], D[6]]);
  noErrors(errors, 'otra fecha con vista previa');
});

test('ventana abierta sin propuestas pendientes: «Bloquear propuestas» se ve igual', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  page.on('dialog', d => d.accept());
  await page.locator('#rvpanel [data-pp="close"]').click();
  await expect.poll(() => page.evaluate(() => !!(__dbGet('meta', 'propwin') || {}).man)).toBe(true);
  await expect(page.locator('#rvpanel [data-pp="open"]')).toBeVisible();
  noErrors(errors, 'bloquear sin pendientes');
});
