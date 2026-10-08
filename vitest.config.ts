import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/__tests__/constants/*.test.ts', 'src/lib/shoppingList.integrity.test.ts', 'src/features/generate/engine/mealRoleIntegrity.test.ts'],
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
