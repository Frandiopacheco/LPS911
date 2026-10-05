import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  /* el ciclo diario con 16 usuarios a la vez es pesado: corre aparte (CICLO=1 npx playwright test auditoria-ciclo) */
  testIgnore: process.env.CICLO ? [] : ['**/auditoria-ciclo.spec.js'],
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    timezoneId: 'America/Lima',
    locale: 'es-PE',
    serviceWorkers: 'block',
    viewport: { width: 1366, height: 860 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {}),
  },
  webServer: { command: 'node server.mjs', port: 4173, reuseExistingServer: !process.env.CI },
});
