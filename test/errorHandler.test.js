const test = require('node:test');
const assert = require('node:assert');
const errorHandler = require('../errorHandler');

test('errorHandler sends formatted error response', () => {
  const err = { status: 400, message: 'Bad Request', errors: [{ msg: 'fail' }] };
  let statusCode;
  let jsonData;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonData = data;
    },
  };

  errorHandler(err, {}, res, () => {});

  assert.strictEqual(statusCode, 400);
  assert.deepStrictEqual(jsonData, {
    error: { message: 'Bad Request', details: [{ msg: 'fail' }] },
  });
});
