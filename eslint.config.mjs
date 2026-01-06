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
  ]),
  // Custom rule overrides for this project
  {
    rules: {
      // Allow 'any' type in specific scenarios (NLP libraries, API responses, etc.)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused expressions for short-circuit calls like: callback && callback()
      "@typescript-eslint/no-unused-expressions": "off",
    }
  }
]);

export default eslintConfig;
