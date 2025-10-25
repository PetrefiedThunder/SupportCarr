const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  testMatch: ['**/integration/**/*.test.js']
};
