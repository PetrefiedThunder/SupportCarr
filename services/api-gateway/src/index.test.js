import request from 'supertest';
import { describe, expect, it } from '@jest/globals';
import app from './app.js';

describe('POST /v1/rides', () => {
  it('creates a ride when payload is valid', async () => {
    const res = await request(app)
      .post('/v1/rides')
      .send({ riderId: 'rider-123', pickup: { lat: 34.05, lng: -118.25 } });
    expect(res.status).toBe(201);
    expect(res.body.ride_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.rider_id).toBe('rider-123');
  });

  it('rejects invalid payloads', async () => {
    const res = await request(app).post('/v1/rides').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
