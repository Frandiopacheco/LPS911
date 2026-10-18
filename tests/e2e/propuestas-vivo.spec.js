// SC e ingenieros a la vez sobre una misma base (auditoría oct 2026 de la interacción propuestas ↔ revisión).
// Usa el mundo compartido (mundo-compartido.js): cada escritura de una página llega a las demás, como en Firestore.
import { test, expect } from '@playwright/test';
import { Hub, abrir } from './mundo-compartido.js';

const D = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12', '2026-10-13', '2026-10-14'];
const A = (n, o, days = [D[0], D[1]]) => ({ ambId: 'a1', sc: 'c1', name: n, und: 'm2', metrado: 30, days, order: o });
const sent = (after, base) => ({ after, base, ts: 1, by: 'sc@obra.pe', n: 'Sandra', sent: true, sentAt: Date.parse('2026-09-30T10:00:00-05:00') });
const ED2 = ['members', 'ed2@obra.pe', { role: 'editor', name: 'Ed Dos', pisos: ['p1'] }];
const seedN = n => { const ex = [], items = {}; for (let k = 1; k <= n; k++) { const b = A('Fila ' + k, 300 + k, [D[0]]); ex.push(['acts', 'q' + k, b]); items['q' + k] = sent({ ...b, days: [D[1], D[2]] }, b); }
  ex.push(['lhprop', 'c1', { sc: 'c1', sentAt: 1, sentBy: 'Sandra', items }]); return ex; };
const db = (p, c, id) => p.evaluate(([c, id]) => __dbGet(c, id), [c, id]);
const addDay = (p, id, d) => p.evaluate(([id, d]) => { const x = S.act.get(id); apply([op('acts', id, { ...x, days: [...x.days, d] })]); }, [id, d]);

async function mundo(browser, extra, quienes) {
  const hub = new Hub(); const P = {};
  for (const q of quienes) P[q] = await abrir(browser, hub, { as: q, tab: 'look', extra, editar: true });
  hub.listo = true; return P;
}
const sinErrores = P => expect(Object.values(P).flatMap(p => p.errs)).toEqual([]);

test('la copia oficial del SC no se mezcla con sus borradores y, al aceptar, se respetan los cambios del ingeniero', async ({ browser }) => {
  const P = await mundo(browser, [['acts', 's1', A('Tarrajeo', 300)]], ['sc', 'editor']);
  const { sc, editor } = P;
  await addDay(sc, 's1', D[2]); // borrador del SC: + el 07
  await expect.poll(() => db(editor, 'lhprop', 'c1').then(x => x && x.items && x.items.s1 && x.items.s1.after.days.length)).toBe(3);
  // el ingeniero cambia lo oficial (metrado, nombre, orden y + el 09)
  await editor.evaluate(d => { const x = S.act.get('s1'); apply([op('acts', 's1', { ...x, metrado: 99, name: 'Tarrajeo FINAL', order: 777, days: [...x.days, d] })]); }, D[4]);
  await expect.poll(() => sc.evaluate(() => ACT_OFF.get('s1').metrado)).toBe(99);
  // lo «oficial» del SC es lo de la base, sin su borrador
  expect((await sc.evaluate(() => ACT_OFF.get('s1').days)).sort()).toEqual([D[0], D[1], D[4]]);
  // y su fila muestra lo oficial + lo que él cambió
  const vista = await sc.evaluate(() => { const x = S.act.get('s1'); return { m: x.metrado, n: x.name, d: [...x.days].sort() }; });
  expect(vista).toEqual({ m: 99, n: 'Tarrajeo FINAL', d: [D[0], D[1], D[2], D[4]] });
  await addDay(sc, 's1', D[3]); await sc.evaluate(() => sendPropNow());
  await expect.poll(() => db(editor, 'lhprop', 'c1').then(x => x.items.s1 && x.items.s1.sent)).toBe(true);
  await editor.evaluate(() => { U.rev = true; REVSEL = null; gridRows = null; render(); });
  expect(await editor.evaluate(() => revDecide('s1', 'ok'))).toBe('ok');
  const a = await db(editor, 'acts', 's1');
  expect({ m: a.metrado, n: a.name, o: a.order, d: [...a.days].sort() }).toEqual({ m: 99, n: 'Tarrajeo FINAL', o: 777, d: [D[0], D[1], D[2], D[3], D[4]] });
  sinErrores(P);
});

test('si el SC edita lo que ya envió, lo enviado sigue pendiente: se acepta eso y su borrador queda', async ({ browser }) => {
  const b = A('Empaste', 300, [D[0]]);
  const P = await mundo(browser, [['acts', 'r1', b], ['lhprop', 'c1', { sc: 'c1', sentAt: 1, items: { r1: sent({ ...b, days: [D[1], D[2]] }, b) } }]], ['sc', 'editor']);
  const { sc, editor } = P;
  await editor.evaluate(() => { U.rev = true; REVSEL = null; gridRows = null; render(); });
  await addDay(sc, 'r1', D[6]); // el SC edita la fila ya enviada (vuelve a borrador)
  await expect.poll(() => editor.evaluate(() => PROP.get('c1').items.r1.sent)).toBe(false);
  expect(await editor.evaluate(() => revItems().some(o => o.id === 'r1'))).toBe(true); // antes desaparecía de la revisión
  expect(await editor.evaluate(() => revDecide('r1', 'ok'))).toBe('ok');
  expect([...(await db(editor, 'acts', 'r1')).days].sort()).toEqual([D[1], D[2]]); // lo enviado
  const it = (await db(editor, 'lhprop', 'c1')).items.r1;
  expect(it && it.sent).toBe(false); // el borrador del SC sigue, sin la versión ya decidida
  expect(it.sentV).toBeUndefined();
  expect(it.after.days).toContain(D[6]);
  sinErrores(P);
});

test('dos ingenieros pulsan «Aceptar todo» a la vez: la pantalla de los dos queda igual que la base, sin filas fantasma', async ({ browser }) => {
  const P = await mundo(browser, [...seedN(6), ED2], ['editor', 'ed2']);
  const { editor, ed2 } = P;
  for (const p of [editor, ed2]) { p.on('dialog', d => d.accept()); await p.locator('[data-pp="rev"]').first().click(); await expect(p.locator('#rvpanel [data-rvall]')).toBeEnabled(); }
  await Promise.all([editor.locator('#rvpanel [data-rvall]').click(), ed2.locator('#rvpanel [data-rvall]').click()]);
  for (const p of [editor, ed2]) {
    await expect.poll(() => p.evaluate(() => Object.values((PROP.get('c1') || {}).items || {}).filter(Boolean).length), { timeout: 15000 }).toBe(0);
    await expect.poll(() => p.evaluate(() => [1, 2, 3, 4, 5, 6].map(k => S.act.get('q' + k).days.join()).join('|')), { timeout: 15000 }).toBe(Array(6).fill(`${D[1]},${D[2]}`).join('|'));
  }
  expect(Object.keys(await editor.evaluate(() => __dbAll('lhphist')))).toHaveLength(6);
  sinErrores(P);
});

test('uno acepta y otro rechaza la misma fila: el que pierde no queda con una fila fantasma ni culpa al SC', async ({ browser }) => {
  const P = await mundo(browser, [...seedN(2), ED2], ['editor', 'ed2']);
  const { editor, ed2 } = P;
  for (const p of [editor, ed2]) await p.evaluate(() => { U.rev = true; REVSEL = null; gridRows = null; render(); });
  const [r1, r2] = await Promise.all([editor.evaluate(() => revDecide('q1', 'ok')), ed2.evaluate(() => revDecide('q1', 'rej', {}))]);
  expect([r1, r2].filter(r => r === 'ok')).toHaveLength(1);
  const perdedor = r1 === 'ok' ? ed2 : editor;
  await expect.poll(() => perdedor.evaluate(() => revItems().some(o => o.id === 'q1')), { timeout: 15000 }).toBe(false);
  expect(await perdedor.evaluate(() => document.getElementById('toast').textContent)).not.toContain('subcontratista cambió');
  sinErrores(P);
});
