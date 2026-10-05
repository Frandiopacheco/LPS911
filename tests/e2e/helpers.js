// Ayudas comunes de las pruebas de la interfaz.
import { expect } from '@playwright/test';
import path from 'node:path';

const FAKE = path.join(path.dirname(new URL(import.meta.url).pathname), 'fake-firebase.js');
export const HOY = '2026-10-01', MANANA = '2026-10-02';

export const USERS = {
  admin: { uid: 'u-admin', email: 'frandiopacheco@gmail.com', emailVerified: true },
  editor: { uid: 'u-ed', email: 'editor@obra.pe', emailVerified: true },
  campo: { uid: 'u-ca', email: 'campo@obra.pe', emailVerified: true },
  sc: { uid: 'u-sc', email: 'sc@obra.pe', emailVerified: true },
  calidad: { uid: 'u-cal', email: 'calidad@obra.pe', emailVerified: true },
  ot: { uid: 'u-ot', email: 'ot@obra.pe', emailVerified: true },
  lector: { uid: 'u-le', email: 'lector@obra.pe', emailVerified: true },
  veedor: { uid: 'u-ve', email: 'veedor@obra.pe', emailVerified: true },
  planner: { uid: 'u-pl', email: 'planner@obra.pe', emailVerified: true },
  capataz: { uid: 'cap1', email: null, isAnonymous: true, emailVerified: false },
  tcap: { uid: 'u-tcap', email: 'tcap@obra.pe', emailVerified: true },
  tasis: { uid: 'u-tasis', email: 'tasis@obra.pe', emailVerified: true },
  tcos: { uid: 'u-tcos', email: 'tcos@obra.pe', emailVerified: true },
  jefe: { uid: 'u-jefe', email: 'jefe@obra.pe', emailVerified: true },
};

/** Abre la app con el Firebase falso. `as`: clave de USERS; `theme`: 'dark' | 'light' (esquema de color del equipo). */
/* editar: el Lookahead se abre en modo consulta; las pruebas entran ya en edición salvo editar:false */
export async function openApp(page, { as = 'admin', theme, va, tab, extra, editar = true } = {}) {
  const errors = [];
  if (theme) await page.emulateMedia({ colorScheme: theme });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.clock.setFixedTime(new Date(HOY + 'T09:30:00-05:00'));
  await page.route(/^https?:\/\/(?!localhost)/, r => {
    const u = r.request().url();
    if (/\.css(\?|$)|fonts\.googleapis/.test(u)) return r.fulfill({ status: 200, contentType: 'text/css', body: '' });
    return r.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  });
  await page.route('**/firebase-config.js', r => r.fulfill({ status: 200, contentType: 'text/javascript',
    body: 'window.FIREBASE_CONFIG={apiKey:"e2e",projectId:"demo-lps"};window.LPS_ENV="pruebas";window.NO_SW=true;' }));
  await page.addInitScript(({ user, va, tab, extra, HOY, MANANA }) => {
    window.__E2E = { user, today: HOY, tomorrow: MANANA, extra };
    try {
      if (va && !sessionStorage.getItem('e2e.va')) { sessionStorage.setItem('lps.va', JSON.stringify(va)); sessionStorage.setItem('e2e.va', '1'); }
      if (tab && !sessionStorage.getItem('e2e.tab')) { const k = 'lps911.ui'; const u = JSON.parse(localStorage.getItem(k) || '{}'); u.tab = tab; localStorage.setItem(k, JSON.stringify(u)); sessionStorage.setItem('e2e.tab', '1'); }
    } catch (e) {}
  }, { user: USERS[as], va, tab, extra, HOY, MANANA });
  await page.addInitScript({ path: FAKE });
  await page.goto(tab ? '/#' + tab : '/');
  await expect(page.locator('#loading')).toHaveCount(0, { timeout: 15_000 });
  if (editar) await page.evaluate(() => { LKED = true; gridRows = null; render(); });
  return errors;
}

/** Revisa que la pestaña actual se dibujó sin el aviso de error. */
export async function expectTabOk(page, name) {
  const main = page.locator('#main');
  await expect(main, `la pestaña ${name} no debe mostrar el aviso de error`).not.toContainText('No se pudo mostrar');
  await expect(main, `la pestaña ${name} no debe quedar vacía`).not.toBeEmpty();
}

/** Pestañas que el usuario puede abrir: las de la barra y las del menú "Más". */
export async function visibleTabs(page) {
  return page.evaluate(() => [...tabPrimary(), ...tabSecondary()]);
}

/** Abre una pestaña desde la barra o, si está en "Más", desde ese menú. */
export async function openTab(page, t) {
  const b = page.locator(`#tabs button[data-tab="${t}"]`);
  if (await b.isVisible()) await b.click();
  else { await page.click('#tabMore'); await page.click(`#pop [data-do="t_${t}"]`); }
  await expect(page.locator('#main')).toHaveAttribute('data-view', t);
}

export const noErrors = (errors, ctx) => expect(errors, `errores en el navegador (${ctx})`).toEqual([]);
