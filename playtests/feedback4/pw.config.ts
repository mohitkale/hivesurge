import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  timeout: 180_000,
  use: {
    baseURL: process.env.BASE ?? 'http://127.0.0.1:5190',
    channel: 'chrome',
    headless: true,
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
      ignoreDefaultArgs: ['--hide-scrollbars'],
    },
  },
});
