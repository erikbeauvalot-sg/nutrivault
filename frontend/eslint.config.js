import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import i18next from 'eslint-plugin-i18next';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      i18next,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        URLSearchParams: 'readonly',
        alert: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // i18next rules - CRITICAL for catching hardcoded strings
      'i18next/no-literal-string': [
        'error',
        {
          markupOnly: true,
          ignoreAttribute: [
            'className',
            'style',
            'type',
            'id',
            'name',
            'role',
            'aria-label',
            'aria-labelledby',
            'aria-describedby',
            'data-testid',
            'data-bs-theme',
            'placeholder',
            'alt',
            'href',
            'src',
            'to',
            'path',
            'key',
            'variant',
            'size',
            'controlId',
            'method',
            'action',
            'target',
            'rel',
          ],
          ignore: [
            // Ignore common patterns that don't need translation
            /^[0-9]+$/,
            /^[a-zA-Z]$/,
            /^\s*$/,
            // Ignore technical strings
            /^(GET|POST|PUT|DELETE|PATCH)$/,
            /^(success|error|warning|info)$/,
            /^(true|false)$/,
            // Ignore emoji and symbols only
            /^[^\w\s]+$/,
            // Ignore single emojis
            /^[\u{1F300}-\u{1F9FF}]$/u,
          ],
          ignoreCallee: [
            // Allow these function calls without translation
            'console.log',
            'console.error',
            'console.warn',
            'console.info',
            'console.debug',
            'require',
            'import',
            'styled',
            'css',
            'keyframes',
          ],
        },
      ],

      // Other common rules to prevent issues
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    // Ignore node_modules and build output
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  },
];
