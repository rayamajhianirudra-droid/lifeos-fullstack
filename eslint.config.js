import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  // Backend, build output and dependencies are not frontend source.
  { ignores: ['build/**', 'node_modules/**', 'target/**', 'src/main/**', 'src/test/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Same hook rules Create React App enforced.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // The React Compiler rules in eslint-plugin-react-hooks 7 (immutability,
      // purity, set-state-in-effect, ...) flag patterns in the single-file App.jsx.
      // They get switched on while App.jsx is split into components.
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
    },
  },
  { files: ['*.config.js'], languageOptions: { globals: { ...globals.node } } },
  { files: ['public/sw.js'], languageOptions: { globals: { ...globals.serviceworker } } },
];
