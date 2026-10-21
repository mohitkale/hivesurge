import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'dist-review', 'node_modules', 'playtests/*.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { languageOptions: { globals: { ...globals.browser } } },
  {
    files: ['supabase/functions/**'],
    languageOptions: { globals: { Deno: 'readonly' } },
  },
  {
    files: ['scripts/**', 'tests/**', 'playtests/**'],
    languageOptions: { globals: { ...globals.node } },
  },
);
