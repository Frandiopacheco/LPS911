// Fotos incrementales (auditoría C4/L11): cuando otro usuario cambia un documento, solo se procesa ese documento
// (snap.docChanges()); lo demás conserva sus objetos. Antes cada cambio rearmaba los Map enteros (2000+ actividades).
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';
import { obraGrande } from './obra-grande.js';

/* mide cuánto tarda la app en procesar cada foto de `acts` (solo su función, no la del Firebase falso) */
const medirFotos = page => page.addInitScript(() => {
  let fb; window.__snapMs = [];
  Object.defineProperty(window, 'firebase', { configurable: true, get: () => fb, set: v => {
    fb = v; const f0 = v.firestore;
    const wrap = () => { const fs = f0(); if (!fs.__t) { fs.__t = 1; const oc = fs.collection;
      fs.collection = n => { const c = oc(n); if (n !== 'acts') return c;
        return { ...c, onSnapshot: (...a) => { const i = a.findIndex(f => typeof f === 'function'); const cb = a[i];
          a[i] = sn => { const t = performance.now(); cb(sn); window.__snapMs.push(performance.now() - t); }; return c.onSnapshot(...a); } }; }; }
      return fs; };
    v.firestore = Object.assign(wrap, f0);
  } });
});

test('obra grande: un cambio de otro usuario en una actividad solo procesa esa actividad', async ({ page }) => {
  await medirFotos(page);
  const errors = await openApp(page, { as: 'editor', tab: 'look', extra: obraGrande({ acts: 3000 }) });
  const r = await page.evaluate(async () => {
    const wait = async f => { for (let i = 0; i < 200 && !f(); i++) await new Promise(ok => setTimeout(ok, 10)); return f(); };
    const fsx = firebase.firestore();
    const keep = S.act.get('xx2'), map0 = S.act, n0 = window.__snapMs.length, full = window.__snapMs[0];
    const ms = [];
    for (let i = 0; i < 20; i++) {
      const k = window.__snapMs.length;
      await fsx.collection('acts').doc('xx1').update({ name: 'Remoto ' + i });
      await wait(() => S.act.get('xx1').name === 'Remoto ' + i);
      ms.push(window.__snapMs[k]);
    }
    /* archivar y recuperar (pasa de S a ARCH y vuelve) y borrar */
    await fsx.collection('acts').doc('xx3').update({ arch: { t: 1, by: 'otro', n: 'Otro' } });
    const arch = await wait(() => !S.act.has('xx3') && ARCH.act.has('xx3'));
    await fsx.collection('acts').doc('xx3').update({ arch: firebase.firestore.FieldValue.delete() });
    const back = await wait(() => S.act.has('xx3') && !ARCH.act.has('xx3'));
    await fsx.collection('acts').doc('xx4').delete();
    const gone = await wait(() => !S.act.has('xx4'));
    return { full, med: ms.reduce((a, b) => a + b, 0) / ms.length, n: window.__snapMs.length - n0, same: S.act.get('xx2') === keep, newMap: S.act !== map0, arch, back, gone, size: S.act.size };
  });
  console.log(`[medida] 3000 actividades · primera foto ${r.full.toFixed(1)} ms · un cambio de otro usuario (promedio de 20) ${r.med.toFixed(2)} ms`);
  expect(r.same, 'la actividad que no cambió conserva su objeto').toBe(true);
  expect(r.newMap, 'el Map cambia de identidad (cachés como cliActs)').toBe(true);
  expect([r.arch, r.back, r.gone]).toEqual([true, true, true]);
  noErrors(errors, 'fotos incrementales');
});

test('registros del día, plan cerrado e índice de terminadas: un cambio de otro solo toca su documento', async ({ page }) => {
  const errors = await openApp(page, { as: 'campo', tab: 'campo', extra: [['daily', '2026-09-29_p1', { date: '2026-09-29', pisoId: 'p1', recs: {}, extra: {} }], ['dplan', HOY + '_p2', { date: HOY, pisoId: 'p2', ids: { e2: null } }], ['doneidx', 'p2', { d: { t2: '2026-09-29' } }]] });
  const r = await page.evaluate(async ({ HOY }) => {
    const wait = async f => { for (let i = 0; i < 200 && !f(); i++) await new Promise(ok => setTimeout(ok, 10)); return f(); };
    const fsx = firebase.firestore();
    const d0 = DAY.get('2026-09-29_p1'), p0 = DPL.get(HOY + '_p2');
    await fsx.collection('daily').doc('2026-09-30_p1').set({ recs: { i1: { status: 'ok', note: 'otro' } } }, { merge: true });
    const day = await wait(() => DAY.get('2026-09-30_p1')?.recs?.i1?.note === 'otro');
    const sameDay = !!d0 && DAY.get('2026-09-29_p1') === d0;
    await fsx.collection('dplan').doc(HOY + '_p1').set({ date: HOY, pisoId: 'p1', ids: { i0: null } });
    const dpl = await wait(() => !!DPL.get(HOY + '_p1'));
    await fsx.collection('doneidx').doc('p1').set({ d: { i0: '2026-09-30' } }, { merge: true });
    const didx = await wait(() => DIDX.get('i0') === '2026-09-30' && DIDX.get('t2') === '2026-09-29');
    await fsx.collection('daily').doc('2026-09-29_p1').delete();
    const rm = await wait(() => !DAY.has('2026-09-29_p1'));
    return { day, dpl, didx, rm, sameDay, sameDpl: DPL.get(HOY + '_p2') === p0 };
  }, { HOY });
  expect([r.day, r.dpl, r.didx, r.rm]).toEqual([true, true, true, true]);
  expect(r.sameDay, 'el registro de otro día conserva su objeto').toBe(true);
  expect(r.sameDpl, 'el plan cerrado de otro piso conserva su objeto').toBe(true);
  noErrors(errors, 'fotos incrementales del día');
});
