import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.js", "**/*.cjs", "**/*.mjs", "**/*.d.ts"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      parser: tsparser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs["recommended"].rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]
