import { defineConfig } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import path from 'path';

const srcDir = path.resolve(__dirname, 'src') + path.sep;

export default defineConfig({
  plugins: [
    {
      // Pages and components under src/ are .js files containing JSX, which
      // Next compiles but Vite does not. Compile them the same way so tests
      // can render them.
      name: 'src-js-jsx',
      enforce: 'pre',
      async transform(code, id) {
        if (!id.startsWith(srcDir) || !id.endsWith('.js')) return null;
        return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
      },
    },
  ],
  test: {
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
