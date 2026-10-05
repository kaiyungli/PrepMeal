import { defineConfig, type Plugin } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import baseConfig from './vitest.config';

// Runtime render tests for the My Plans .js components, which contain JSX.
// The default vitest.config.ts does not compile JSX in .js files; rather than
// change that globally, this config compiles JSX only for
// src/components/myPlans/*.js and the My Plans page with its Toast, and runs
// only the tests listed below.
//
// Run alone with `npm run test:components`, or with the default suite via
// `npm run test:all`.

const MY_PLANS_JSX_JS = [
  /[\\/]src[\\/]components[\\/]myPlans[\\/][^\\/]+\.js$/,
  /[\\/]src[\\/]pages[\\/]my-plans\.js$/,
  /[\\/]src[\\/]components[\\/]ui[\\/]Toast\.js$/,
];

function myPlansComponentJsx(): Plugin {
  return {
    name: 'my-plans-component-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (!MY_PLANS_JSX_JS.some((re) => re.test(id))) return null;
      return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
    },
  };
}

export default defineConfig({
  plugins: [myPlansComponentJsx()],
  resolve: baseConfig.resolve,
  test: {
    environment: 'jsdom',
    include: ['tests/myPlansComponents.runtime.test.tsx', 'tests/myPlansPageDelete.runtime.test.tsx'],
  },
});
