/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist/', 'coverage/', 'node_modules/', '*.js', '*.cjs'],
  rules: {
    // Convenção do repo: parâmetro não usado leva prefixo _ (ex.: _req, _next).
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // TODO: baseline — 12 usos de any em reportService/reportController/requestLogger.
    // Fica como warning; npm run lint limita com --max-warnings para não crescer.
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  overrides: [
    {
      files: ['src/__tests__/**/*.ts'],
      env: { jest: true },
    },
  ],
};
