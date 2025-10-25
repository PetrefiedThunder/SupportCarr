module.exports = {
  testEnvironment: 'node',
  rootDir: './src/tests',
  setupFilesAfterEnv: ['<rootDir>/setup.js'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['../**/*.js', '!../server.js'],
  coverageDirectory: '../coverage'
};
