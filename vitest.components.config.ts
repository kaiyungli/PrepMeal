import { defineConfig, type Plugin } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import baseConfig from './vitest.config';

// Runtime render tests for the My Plans .js components, which contain JSX.
// The default vitest.config.ts does not compile JSX in .js files; rather than
// change that globally, this config compiles JSX only for
// src/components/myPlans/*.js and runs only the tests listed below.
//
// Run alone with `npm run test:components`, or with the default suite via
// `npm run test:all`.

const MY_PLANS_COMPONENT_JS = /[\\/]src[\\/]components[\\/]myPlans[\\/][^\\/]+\.js$/;

function myPlansComponentJsx(): Plugin {
  return {
    name: 'my-plans-component-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (!MY_PLANS_COMPONENT_JS.test(id)) return null;
      return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
    },
  };
}

export default defineConfig({
  plugins: [myPlansComponentJsx()],
  resolve: baseConfig.resolve,
  test: {
    environment: 'jsdom',
    include: ['tests/myPlansComponents.runtime.test.tsx'],
  },
});
