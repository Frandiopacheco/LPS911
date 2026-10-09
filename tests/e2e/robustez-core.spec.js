// Robustez del núcleo (base.js): señal mala al entrar, permisos, suscripciones caídas y errores al dibujar.
import { test, expect } from '@playwright/test';
import { openApp, noErrors, HOY } from './helpers.js';

test('con señal mala entra igual: si el servidor no responde en 2 s usa la copia de members guardada en el equipo', async ({ page }) => {
  /* el servidor nunca contesta la lectura de members con source:'server' (antes: «Conectando…» para siempre) */
  await page.addInitScript(() => {
    let fb; window.__memSrv = 0;
    Object.defineProperty(window, 'firebase', { configurable: true, get: () => fb, set: v => {
      fb = v; const f0 = v.firestore;
      const wrap = () => { const fs = f0(); if (!fs.__w) { fs.__w = 1; const oc = fs.collection;
        fs.collection = n => { const c = oc(n); if (n !== 'members') return c; const od = c.doc;
          return { ...c, doc: id => { const d = od(id); return { ...d, get: o => { if (o && o.source === 'server') { window.__memSrv++; return new Promise(() => {}); } return d.get(o); } }; } }; }; }
        return fs; };
      v.firestore = Object.assign(wrap, f0);
    } });
  });
  const errors = await openApp(page, { as: 'editor' });
  expect(await page.evaluate(() => [window.__memSrv, me.role, canWrite])).toEqual([1, 'editor', true]);
  noErrors(errors, 'members sin respuesta del servidor');
});

test('un permiso denegado en un solo cambio no deja al editor en solo lectura', async ({ page }) => {
  const errors = await openApp(page, { as: 'editor', tab: 'look' });
  const r = await page.evaluate(async ({ HOY }) => {
    const orig = db.collection.bind(db);
    const deny = async () => { throw Object.assign(new Error('prueba'), { code: 'permission-denied' }); };
    db.collection = c => { const ref = orig(c); if (c !== 'acts' && c !== 'daily') return ref; const od = ref.doc;
      return { ...ref, doc: id => ({ ...od(id), update: deny, set: deny }) }; };
    const x = [...S.act.values()][0];
    await put('acts', x.id, { ...x, name: x.name + ' A' });
    writeDaily(HOY, [...S.pis.keys()][0], { extra: { nota: 'prueba' } });
    for (let i = 0; i < 50 && pending > 0; i++) await new Promise(ok => setTimeout(ok, 20));
    db.collection = orig;
    const out = { canWrite, canDaily, toast: document.querySelector('#toast').textContent, st: document.querySelector('#status').textContent };
    await put('acts', x.id, { ...S.act.get(x.id), name: x.name + ' B' });
    return { ...out, saved: (window.__dbGet('acts', x.id) || {}).name, want: x.name + ' B', st2: document.querySelector('#status').textContent, cw2: canWrite };
  }, { HOY });
  expect(r.canWrite).toBe(true);
  expect(r.canDaily).toBe(true);
  expect(r.toast).toContain('No se pudo guardar este cambio (permiso)');
  expect(r.st).toContain('Sin permiso');
  expect(r.saved).toBe(r.want);
  expect(r.cw2).toBe(true);
  expect(r.st2).not.toContain('Sin permiso');
  await expect(page.locator('#main')).not.toContainText('No se pudo mostrar');
  noErrors(errors, 'permiso denegado suelto');
});

test('una suscripción que se cae se vuelve a abrir sola y la barra avisa mientras tanto', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => {
    stopDplan(); const orig = db.collection.bind(db); window.__fails = 0;
    db.collection = c => { const ref = orig(c); if (c !== 'dplan') return ref;
      return { ...ref, where: (...a) => { const q = ref.where(...a);
        return { ...q, onSnapshot: (...b) => { if (window.__fails < 1) { window.__fails++; const err = b.filter(f => typeof f === 'function')[1];
          setTimeout(() => err(Object.assign(new Error('prueba'), { code: 'unavailable' })), 0); return () => {}; } return q.onSnapshot(...b); } }; } }; };
    ensureDplan(addD(todayIso(), -7));
  });
  await expect(page.locator('#status')).toContainText('reintentando');
  await expect(page.locator('#status')).not.toContainText('reintentando', { timeout: 8000 });
  expect(await page.evaluate(() => [window.__fails, !!dplSub, SNAPBAD.size])).toEqual([1, true, 0]);
  noErrors(errors, 'suscripción caída');
});

test('un error en la barra superior no impide dibujar la pestaña (y se anota una sola vez)', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { window.__rt = renderTop; renderTop = () => { throw new Error('falla de prueba'); }; goTab('restr'); render(); render(); });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'restr');
  await expect(page.locator('#main')).not.toContainText('No se pudo mostrar');
  await expect(page.locator('#main')).not.toBeEmpty();
  await page.evaluate(() => { renderTop = window.__rt; render(); });
  expect(errors.filter(e => /falla de prueba/.test(e)).length).toBe(1);
});

test('en el Lookahead, un inicio o pausa del capataz no redibuja la grilla; un cierre sí', async ({ page }) => {
  const errors = await openApp(page, { tab: 'look' });
  await expect(page.locator('#main')).toHaveAttribute('data-view', 'look');
  const r = await page.evaluate(async ({ HOY }) => {
    const x = [...S.act.values()].find(a => (a.days || []).length);
    let n = 0; const orig = renderLook; renderLook = m => { n++; return orig(m); };
    const wait = () => new Promise(ok => setTimeout(ok, 150));
    const ref = db.collection('live').doc(HOY + '_' + x.id);
    await ref.set({ date: HOY, actId: x.id, pisoId: pisoOfAct(x.id), sc: x.sc, run: { t: 1 } }); await wait();
    await ref.set({ run: { t: 2 } }, { merge: true }); await wait();
    const sinCierre = n;
    await ref.set({ close: { status: 'ok', done: false, by: 'x', t: 3 } }, { merge: true }); await wait();
    renderLook = orig;
    return { sinCierre, conCierre: n };
  }, { HOY });
  expect(r.sinCierre).toBe(0);
  expect(r.conCierre).toBeGreaterThan(0);
  noErrors(errors, 'lookahead y reportes en vivo');
});
