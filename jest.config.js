/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  // env.ts roda antes de qualquer import: config.ts lê process.env no import.
  setupFiles: ['<rootDir>/src/__tests__/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/__tests__/**', '!src/index.ts', '!src/types/**'],
  // Limites = cobertura atual arredondada para baixo (registrado em docs/ai-readiness.md).
  coverageThreshold: {
    global: { statements: 90, branches: 60, functions: 90, lines: 90 },
  },
};
