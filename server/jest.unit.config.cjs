const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  testMatch: ['**/unit/**/*.test.js']
};
