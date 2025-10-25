const request = require('supertest');
const createApp = require('../../app');
const Driver = require('../../models/Driver');

process.env.JWT_SECRET = 'test-secret';

describe('Ride lifecycle', () => {
  const app = createApp();

  it('runs from request to completion', async () => {
    const riderRes = await request(app).post('/api/auth/register').send({
      email: 'rider@test.com',
      password: 'Password123!',
      name: 'Test Rider',
      phoneNumber: '+1234567890',
      role: 'rider'
    });

    const driverRes = await request(app).post('/api/auth/register').send({
      email: 'driver@test.com',
      password: 'Password123!',
      name: 'Driver Person',
      phoneNumber: '+1987654321',
      role: 'driver'
    });

    const driverProfile = await request(app)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${driverRes.body.accessToken}`)
      .send({ vehicleType: 'van', vehicleDescription: 'White Sprinter' });

    await request(app)
      .patch(`/api/drivers/${driverProfile.body._id}`)
      .set('Authorization', `Bearer ${driverRes.body.accessToken}`)
      .send({ active: true, currentLocation: { lat: 34.077, lng: -118.260 } });

    const rideRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${riderRes.body.accessToken}`)
      .send({
        pickup: { lat: 34.077, lng: -118.260, address: 'Echo Park' },
        dropoff: { lat: 34.091, lng: -118.286, address: 'Silverlake' },
        bikeType: 'ebike'
      });

    expect(rideRes.status).toBe(201);
    expect(rideRes.body.status === 'requested' || rideRes.body.status === 'accepted').toBe(true);

    const enRouteRes = await request(app)
      .patch(`/api/rides/${rideRes.body._id}`)
      .set('Authorization', `Bearer ${driverRes.body.accessToken}`)
      .send({ status: 'en_route' });
    expect(enRouteRes.status).toBe(200);

    const completeRes = await request(app)
      .patch(`/api/rides/${rideRes.body._id}`)
      .set('Authorization', `Bearer ${driverRes.body.accessToken}`)
      .send({ status: 'completed' });
    expect(completeRes.body.status).toBe('completed');

    const riderHistory = await request(app)
      .get('/api/rides')
      .set('Authorization', `Bearer ${riderRes.body.accessToken}`);
    expect(riderHistory.body).toHaveLength(1);
  });
});
