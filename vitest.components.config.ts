import { defineConfig, type Plugin } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
import baseConfig from './vitest.config';

// Runtime render tests for the My Plans .js components, which contain JSX.
// The default vitest.config.ts does not compile JSX in .js files; rather than
// change that globally, this config compiles JSX only for
// src/components/myPlans/*.js, the My Plans page with its Toast, the
// saved-plan shopping list drawer, the recipe detail page and the saved
// plan detail page, and runs only the tests listed below (the Toast is also
// what the generate page uses for its feedback).
//
// Run alone with `npm run test:components`, or with the default suite via
// `npm run test:all`.

const MY_PLANS_JSX_JS = [
  /[\\/]src[\\/]components[\\/]myPlans[\\/][^\\/]+\.js$/,
  /[\\/]src[\\/]pages[\\/]my-plans\.js$/,
  /[\\/]src[\\/]components[\\/]ui[\\/]Toast\.js$/,
  /[\\/]src[\\/]components[\\/]shopping[\\/]ShoppingListDrawer\.js$/,
  /[\\/]src[\\/]pages[\\/]recipes[\\/]\[id\]\.js$/,
  /[\\/]src[\\/]pages[\\/]recipes\.js$/,
  /[\\/]src[\\/]pages[\\/]my-plans[\\/]\[id\]\.js$/,
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
    include: [
      'tests/myPlansComponents.runtime.test.tsx',
      'tests/myPlansPageDelete.runtime.test.tsx',
      'tests/recipeDetailTitle.runtime.test.tsx',
      'tests/recipeDetailHookOrder.runtime.test.tsx',
      'tests/savedPlanDetailTitle.runtime.test.tsx',
      'tests/generateToast.runtime.test.tsx',
      'tests/homeShoppingPreview.runtime.test.tsx',
      'tests/recipesEmptyState.runtime.test.tsx',
    ],
  },
});
