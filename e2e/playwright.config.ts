import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  workers: 1,
});
