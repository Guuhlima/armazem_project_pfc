// jest.config.cjs
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.test.json' }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'cjs', 'json'],
  testMatch: ['**/tests/**/*.test.ts'],

  // 👇 habilita imports absolutos a partir de src
  modulePaths: ['<rootDir>/src'],
  // (alternativa) moduleDirectories: ['node_modules', 'src'],
};
