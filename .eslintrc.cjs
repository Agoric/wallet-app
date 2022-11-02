/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: ['./jsconfig.json'],
    tsconfigRootDir: __dirname,
    extraFileExtensions: ['.cjs'],
  },
  plugins: [
    '@typescript-eslint',
    'eslint-plugin-import',
    'eslint-plugin-jsdoc',
    'jest',
  ],
  env: {
    browser: true,
    'jest/globals': true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx'],
      },
    },
    jsdoc: {
      mode: 'typescript',
    },
    react: {
      version: 'detect',
    },
  },
  // Pulls in too much, including Prettier
  // extends: ['@agoric'],
  rules: {
    '@typescript-eslint/prefer-ts-expect-error': 'warn',
    '@typescript-eslint/no-floating-promises': 'warn',
    // so that floating-promises can be explicitly permitted with void operator
    'no-void': ['error', { allowAsStatement: true }],
    // Not severe but the default 'warning' clutters output and it's easy to fix
    'jsdoc/check-param-names': 'error',
    'jsdoc/no-multi-asterisks': 'off',
    'jsdoc/multiline-blocks': 'off',
    // Use these rules to warn about JSDoc type problems, such as after
    // upgrading eslint-plugin-jsdoc.
    // Bump the 1's to 2's to get errors.
    // "jsdoc/valid-types": 1,
    // "jsdoc/no-undefined-types": [1, {"definedTypes": ["never", "unknown"]}],
    'jsdoc/tag-lines': 'off',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.test.js',
          '**/*.test.jsx',
          // hard-coded Jest setup path in https://create-react-app.dev/docs/running-tests/#initializing-test-environment
          '**/src/setupTests.js',
        ],
      },
    ],
  },
  ignorePatterns: ['**/*.umd.js', '**/generated/*'],
};
