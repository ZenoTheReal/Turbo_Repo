import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: import.meta.dirname,
    include: ['src/**/*.spec.ts'],
  },
});
