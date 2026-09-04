import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The mobile/ Expo app is a separate project with its own toolchain and
    // gets its own ESLint config in a later slice; the Next.js web ruleset
    // does not apply to React Native code.
    "mobile/**",
  ]),
]);

export default eslintConfig;
