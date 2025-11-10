/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.test.json' }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'cjs', 'json'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/tests/controllersTests/**/*.test.ts',
    '**/tests/controllersTests/**/*.spec.ts',
  ],

  // 1) monta DATABASE_URL com schema
  setupFiles: ['<rootDir>/tests/env-setup.ts'],

  // 2) cria as tabelas no schema antes dos testes
    setupFilesAfterEnv: [
    '<rootDir>/tests/db-setup.ts',
    '<rootDir>/tests/setupConsole.ts',
  ],

  moduleNameMapper: {
    '^lib/(.*)$': '<rootDir>/src/lib/$1',
    '^service/(.*)$': '<rootDir>/src/service/$1',
    '^services/(.*)$': '<rootDir>/src/services/$1',
    '^controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^tests/(.*)$': '<rootDir>/tests/$1',
  },

  testTimeout: 30000,
};
