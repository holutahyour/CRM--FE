import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Form tests drive several fields through userEvent, which overruns the 5s
  // default on a loaded machine.
  testTimeout: 20000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.{test,spec}.{ts,tsx}',
    '**/*.{test,spec}.{ts,tsx}',
  ],
};

export default createJestConfig(config);
