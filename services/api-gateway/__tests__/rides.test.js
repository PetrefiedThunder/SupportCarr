import request from 'supertest';
import app from '../src/app.js';
import { describe, expect, test } from '@jest/globals';

describe('GET /v1/rides', () => {
  test('returns a mock ride ID', async () => {
    const res = await request(app).get('/v1/rides');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ rideId: 'mock-ride-id' });
  });
});
