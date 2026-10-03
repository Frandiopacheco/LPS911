import { test } from '@playwright/test';
import { openApp } from './helpers.js';
test('flick', async ({ page }) => {
  await openApp(page, { tab: 'look' });
  await page.evaluate(() => { window.__mut = []; const t0 = performance.now(); new MutationObserver(ms => { for (const m of ms) { if (m.type === 'attributes') window.__mut.push([Math.round(performance.now() - t0), m.target.tagName, (m.target.parentElement && m.target.parentElement.dataset.a) || m.target.dataset.a || '', m.oldValue, m.target.className]); else window.__mut.push([Math.round(performance.now() - t0), 'childList', m.target.tagName, m.addedNodes.length, m.removedNodes.length]); } }).observe(document.querySelector('#grid'), { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true, childList: true }); });
  // mover días con el menú: Alt+→ con selección
  await page.evaluate(() => { selToggle('e0'); });
  await page.keyboard.press('Alt+ArrowRight');
  await page.waitForTimeout(1500);
  console.log('SHIFT', JSON.stringify(await page.evaluate(() => window.__mut.slice(0, 60))));
  await page.evaluate(() => { window.__mut = []; });
  // reordenar arrastrando
  const src = await page.locator('tr[data-a="t0"] .anum').boundingBox(); const dst = await page.locator('tr[data-a="i0"]').boundingBox();
  await page.mouse.move(src.x + 5, src.y + 5); await page.mouse.down(); await page.mouse.move(src.x + 5, dst.y + 4, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(1500);
  console.log('REORD', JSON.stringify(await page.evaluate(() => window.__mut.slice(0, 80))));
});
