import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';
export default defineConfig({ resolve: baseConfig.resolve,
  test: { environment: 'jsdom', include: ['tests/favoritesPerformance.measure.test.tsx'] } });
