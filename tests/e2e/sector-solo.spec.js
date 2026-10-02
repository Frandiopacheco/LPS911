// Sectorización: al elegir un sector se muestran solo sus ambientes; tocarlo otra vez vuelve a todos.
import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';
import { LAMINA } from './lamina.js';
test('otros sectores se ocultan', async ({ page }) => {
  const X=[['sectors','s9',{pisoId:'p1',code:'S2',name:'Sector 2',order:2}]];
  for(let i=0;i<4;i++){const x=80+i*110;X.push(['ambientes','z'+i,{sectorId:i<2?'s1':'s9',code:'Z'+i,name:'Amb '+i,order:i,geo:{L1:[x,80,x+100,80,x+100,200,x,200]}}])}
  await openApp(page, { tab: 'planos', extra: [...LAMINA,...X] });
  await page.locator('[data-szp="p1"]').click();
  await expect(page.locator('#szmap .pvl.sza')).toHaveCount(4);
  await page.locator('#szleg [data-szi="s:s9"]').click();
  await expect(page.locator('#szmap .pvl.sza')).toHaveCount(2);
  await page.locator('#szleg [data-szi="s:s9"]').click();
  await expect(page.locator('#szmap .pvl.sza')).toHaveCount(4);
});
