'use strict';

module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended'],
  ignorePatterns: ['node_modules/', 'uploads/', 'temp/', 'coverage/'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: { jest: true },
      globals: { vi: 'readonly' }
    }
  ]
};
