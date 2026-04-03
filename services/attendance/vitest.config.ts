import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',        // Entry point (just starts server)
        'src/types/**',         // Type definitions only
        'src/config/**',        // Environment configuration
      ],
    },
  },
});
