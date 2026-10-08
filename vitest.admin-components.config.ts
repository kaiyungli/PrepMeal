import { defineConfig } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import baseConfig from './vitest.config';

export default defineConfig({
  plugins: [{
    name: 'admin-import-modal-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (!/[\\/]src[\\/]components[\\/]admin[\\/]ImportModal\.js$/.test(id)) return null;
      return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
    },
  }],
  resolve: baseConfig.resolve,
  test: { environment: 'jsdom', include: ['tests/adminImportModal.runtime.test.tsx'] },
});
