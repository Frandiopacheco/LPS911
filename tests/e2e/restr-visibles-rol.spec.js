// Restricciones visibles por rol: el SC ve las que registró y en las que es responsable (él o su empresa);
// un área (OT, Calidad) ve las de su área y las que registró o le asignaron. El ingeniero las ve todas.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';

const R = (id, o) => ['restr', id, { actId: '', pisoId: 'p1', type: 'Materiales', desc: id, resp: '', need: '', freed: '', status: 'pend', created: '2026-10-01', by: 'editor@obra.pe', ...o }];
const EXTRA = [
  R('r-sc-mia', { by: 'sc@obra.pe' }),
  R('r-sc-empresa', { resp: 'SC SANITARIAS' }),
  R('r-sc-nombre', { resp: 'Sandra Sanitarias' }),
  R('r-otro-sc', { resp: 'SC TARRAJEO', sc: 'c3' }),
  R('r-ot', { grp: 'area', area: 'Oficina Técnica', resp: 'Oficina Técnica' }),
  R('r-cal', { grp: 'area', area: 'Calidad', resp: 'Calidad' }),
];
const vis = page => page.evaluate(() => restrInScope().map(r => r.id).filter(i => i.startsWith('r-')).sort());

test('cada rol ve solo sus restricciones', async ({ browser }) => {
  const casos = [
    ['sc', ['r-sc-empresa', 'r-sc-mia', 'r-sc-nombre']],
    ['ot', ['r-ot']],
    ['calidad', ['r-cal']],
    ['editor', ['r-cal', 'r-ot', 'r-otro-sc', 'r-sc-empresa', 'r-sc-mia', 'r-sc-nombre']],
  ];
  for (const [as, esp] of casos) {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    const errors = await openApp(page, { as, tab: 'restr', extra: EXTRA });
    await expect.poll(() => vis(page), as).toEqual(esp);
    noErrors(errors, as); await ctx.close();
  }
});
