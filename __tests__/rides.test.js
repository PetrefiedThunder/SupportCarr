const request = require('supertest');
const app = require('../index');

describe('POST /rides', () => {
  it('accepts a valid ride request', async () => {
    const response = await request(app)
      .post('/rides')
      .send({
        pickupLocation: 'A',
        dropoffLocation: 'B',
        passengerName: 'John Doe'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({ message: 'Ride request received' });
  });

  it('returns validation errors for missing fields', async () => {
    const response = await request(app).post('/rides').send({});

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('details');
  });
});
