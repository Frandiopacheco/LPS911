// Matriz en el celular (19/10): con muchas celdas pide elegir un piso o «Por actividad» en vez de dibujar la tabla completa
// (colgaba Safari en el iPhone); si el dibujo anterior no terminó, también muestra la pantalla liviana.
import { test, expect } from '@playwright/test';
import { openApp, noErrors } from './helpers.js';
function big(){const X=[];const sc=[];for(let i=0;i<15;i++){X.push(['contractors','bc'+i,{name:'SC '+i,partida:'P'+i,color:'#'+(100000+i*37111).toString(16).slice(0,6)}]);sc.push('bc'+i)}
  const cats=[];for(let i=0;i<180;i++){cats.push('bk'+i);X.push(['mcat','bk'+i,{name:'Actividad numero '+i,sc:sc[i%15],cl:'t',al:['actividad numero '+i],ord:i}])}
  for(let p=0;p<6;p++){X.push(['pisos','bp'+p,{code:'B'+p,name:'Piso '+p,order:10+p}]);for(let s=0;s<6;s++){X.push(['sectors','bs'+p+s,{pisoId:'bp'+p,code:'S'+s,name:'Sector '+s,order:s}]);
    for(let a=0;a<10;a++){const id='ba'+p+s+a;X.push(['ambientes',id,{sectorId:'bs'+p+s,code:p+'-'+s+a,name:'Ambiente '+a,order:a}]);const c={};for(let k=0;k<30;k++)c[cats[(a*7+k*5+s)%180]]=['p','c','t','n'][k%4];X.push(['mamb',id,{c,by:'x',t:1}]);
      for(let k=0;k<5;k++)X.push(['acts','bx'+id+k,{ambId:id,sc:sc[k],name:'Actividad numero '+((a*7+k*5+s)%180),und:'glb',days:['2026-10-0'+(1+k%5)],order:k}])}}}
  return X}

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('todos los pisos: pantalla liviana; al elegir un piso, la tabla', async ({ page }) => {
    test.setTimeout(90000);
    const errors = await openApp(page, { as: 'admin', tab: 'hoy', extra: big() });
    await page.evaluate(() => { U.piso = ''; U.mxV = 'mat'; goTab('mat'); });
    await expect(page.locator('.mxlite')).toBeVisible();
    await expect(page.locator('#mxt')).toHaveCount(0);
    await page.click('[data-mxlp="bp0"]');
    await page.evaluate(() => { U.mxSc = ['bc0']; render(); }); // un piso y un SC: ya cabe
    await expect(page.locator('#mxt')).toBeVisible();
    noErrors(errors, 'celular');
  });
});
test('si el dibujo anterior no terminó, la próxima vez muestra la pantalla liviana', async ({ page }) => {
  const errors = await openApp(page, { as: 'admin', tab: 'hoy', extra: [['mcat','k1',{name:'Redes empotradas',sc:'c1',cl:'t',al:['redes empotradas'],ord:10}]] });
  await page.evaluate(() => { U.piso = ''; U.mxV = 'mat'; goTab('mat'); });
  await expect(page.locator('#mxt')).toBeVisible();
  await page.evaluate(() => { localStorage.setItem('lps911.mxbusy', '1'); render(); });
  await expect(page.locator('.mxlite')).toContainText('no terminó de cargar');
  await page.evaluate(() => render());
  await expect(page.locator('#mxt')).toBeVisible();
  noErrors(errors, 'reintento');
});
