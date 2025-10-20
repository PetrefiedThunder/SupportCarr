const request = require('supertest');
const app = require('../index');

describe('GET /v1/rides', () => {
  test('returns a mock ride ID', async () => {
    const res = await request(app).get('/v1/rides');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ rideId: 'mock-ride-id' });
  });
});
