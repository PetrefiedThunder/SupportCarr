const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const pkceJwt = require('../../src/middleware/pkceJwt');

test('rejects requests without bearer token', () => {
  const req = { headers: {} };
  const res = { status: null, sendStatus(code) { this.status = code; } };
  pkceJwt(req, res, () => { throw new Error('next should not be called'); });
  assert.equal(res.status, 401);
});

test('accepts valid bearer token', () => {
  const token = jwt.sign({ sub: '123' }, 'testsecret');
  process.env.JWT_PUBLIC_KEY = 'testsecret';
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = { sendStatus() { throw new Error('sendStatus should not be called'); } };
  let nextCalled = false;
  pkceJwt(req, res, () => { nextCalled = true; });
  assert.ok(nextCalled);
});
