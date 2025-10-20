const jwt = require('jsonwebtoken');
const pkceJwt = require('../../src/middleware/pkceJwt');

test('rejects requests without bearer token', () => {
  const req = { headers: {} };
  const res = { status: null, sendStatus(code) { this.status = code; } };
  const next = jest.fn();
  pkceJwt(req, res, next);
  expect(res.status).toBe(401);
  expect(next).not.toHaveBeenCalled();
});

test('accepts valid bearer token', () => {
  const token = jwt.sign({ sub: '123' }, 'testsecret');
  process.env.JWT_PUBLIC_KEY = 'testsecret';
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = { sendStatus: jest.fn() };
  const next = jest.fn();
  pkceJwt(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(res.sendStatus).not.toHaveBeenCalled();
});
