import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...compat.config({
    env: { node: true },
    extends: ['eslint:recommended'],
    parserOptions: { ecmaVersion: 2021 },
    rules: {
      'no-unused-vars': 'warn',
      eqeqeq: 'error',
    },
  }),
];
