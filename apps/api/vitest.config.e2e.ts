import { defineConfig } from 'vitest/config';

/** Tests e2e et d'intégration : vraie base PostgreSQL et vrai Redis (Testcontainers, Docker requis). */
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts', 'src/**/*.int-spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globalSetup: ['./test/support/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
