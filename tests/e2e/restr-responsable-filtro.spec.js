// Restricciones: la lista de responsables se acota a la clase de la restricción (Campo / Otras áreas · área).
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

test('Responsable: «Otras áreas · OT» solo ofrece OT; «Campo» ofrece ingenieros y el SC de la actividad', async ({ page }) => {
  const errors = await openApp(page, { tab: 'restr' });
  const names = r => page.evaluate(r => { const d = document.createElement('select'); d.innerHTML = respOpts('', r); return [...d.options].map(o => o.value).filter(Boolean); }, r);
  const ot = await names({ grp: 'area', area: 'Oficina Técnica' });
  expect(ot).toContain('Olga OT');
  expect(ot).not.toContain('Quique Calidad');
  expect(ot).not.toContain('Elena Editora');
  const campo = await names({ grp: 'campo', sc: 'c1' });
  expect(campo).toEqual(expect.arrayContaining(['Elena Editora', 'Carlos Campo', 'Sandra Sanitarias']));
  expect(campo).not.toContain('Olga OT');
  // el valor guardado se ve aunque quede fuera del filtro; sin restricción (plan diario) va la lista completa
  expect(await page.evaluate(() => { const d = document.createElement('select'); d.innerHTML = respOpts('Elena Editora', { grp: 'area', area: 'Oficina Técnica' }); return d.value; })).toBe('Elena Editora');
  const all = await names(undefined);
  expect(all).toEqual(expect.arrayContaining(['Olga OT', 'Quique Calidad', 'Elena Editora']));
  noErrors(errors, 'responsable');
});
