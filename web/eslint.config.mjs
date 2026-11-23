// ESLint do app web (Next.js + TypeScript).
// Base: regras do Next (core web vitals + TypeScript), mais as do projeto de referência
// (sigep-app): Prettier, imports não usados como erro, linha após imports e console só com warn/error.
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier/flat'
import prettier from 'eslint-plugin-prettier'
import unusedImports from 'eslint-plugin-unused-imports'

export default defineConfig([
  globalIgnores(['.next/**', 'out/**', 'build/**', 'node_modules/**', 'public/**', 'next-env.d.ts', 'prisma.config.ts']),

  ...nextVitals,
  ...nextTs,
  // desliga as regras de estilo que brigam com o Prettier
  prettierConfig,

  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      prettier,
      'unused-imports': unusedImports,
    },
    rules: {
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'react/no-unescaped-entities': 'off',
      'react/jsx-key': ['warn', { checkFragmentShorthand: true }],

      'import/newline-after-import': ['error', { count: 1 }],

      'prettier/prettier': ['warn', { endOfLine: 'auto' }],

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-empty': 'off',

      'unused-imports/no-unused-imports': 'error',
      // variáveis começando com _ são de propósito (ex.: tirar um campo de um objeto)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
])
