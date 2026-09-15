// @ts-check
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const reactNativePlugin = require("eslint-plugin-react-native");
const globals = require("globals");

const ignores = [
  "**/dist/**",
  "**/dist-web/**",
  "**/build/**",
  "**/.expo/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/node_modules/**",
  "**/*.config.js",
  "**/*.config.cjs",
];

module.exports = tseslint.config(
  { ignores },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    files: ["apps/mobile/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-native": reactNativePlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-native/no-raw-text": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/test/**"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
  },
  {
    // NestJS (apps/api) oslanja se na experimentalDecorators + emitDecoratorMetadata
    // za dependency injection: constructor parametar tipa mora ostati VALUE import
    // (design:paramtypes metadata), inace Nest ne moze da resi zavisnost u runtime-u.
    // `consistent-type-imports --fix` to ne zna i pretvara injektovane servise u
    // `import type`, sto tiho razbija DI - zato je iskljucen ovde.
    files: ["apps/api/src/**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  eslintConfigPrettier,
);
