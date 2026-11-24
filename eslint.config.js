import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.wrangler/**", "**/node_modules/**", "**/coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["apps/api/**/*.ts", "packages/shared/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.es2022,
        ...globals.worker,
      },
    },
  },
  {
    files: ["**/*.config.{js,ts,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
  prettierConfig,
);
