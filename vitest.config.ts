import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // PGlite and jsdom suites compete for memory/CPU when Vitest uses all cores.
    // Keep assertions and timeouts unchanged; bound file-level parallelism instead.
    maxWorkers: 2,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/__tests__/constants/*.test.ts'],
    exclude: ['tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/constants': path.resolve(__dirname, './src/constants'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
  },
});
