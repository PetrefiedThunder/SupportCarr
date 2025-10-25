const request = require('supertest');
const http = require('http');
const createApp = require('../../app');
const Driver = require('../../models/Driver');

process.env.JWT_SECRET = 'test-secret';

jest.setTimeout(30000);

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

  it('streams ride status updates to connected clients', async () => {
    const riderRes = await request(app).post('/api/auth/register').send({
      email: 'streamer@test.com',
      password: 'Password123!',
      name: 'Stream Rider',
      phoneNumber: '+1234567800',
      role: 'rider'
    });

    const driverRes = await request(app).post('/api/auth/register').send({
      email: 'stream-driver@test.com',
      password: 'Password123!',
      name: 'Stream Driver',
      phoneNumber: '+1987654322',
      role: 'driver'
    });

    const driverProfile = await request(app)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${driverRes.body.accessToken}`)
      .send({ vehicleType: 'van', vehicleDescription: 'Streaming Sprinter' });

    await request(app)
      .patch(`/api/drivers/${driverProfile.body._id}`)
      .set('Authorization', `Bearer ${driverRes.body.accessToken}`)
      .send({ active: true, currentLocation: { lat: 34.077, lng: -118.26 } });

    const rideRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${riderRes.body.accessToken}`)
      .send({
        pickup: { lat: 34.077, lng: -118.26, address: 'Echo Park' },
        dropoff: { lat: 34.091, lng: -118.286, address: 'Silverlake' },
        bikeType: 'ebike'
      });

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const { port } = server.address();

    let resolveSnapshot;
    const snapshotReady = new Promise((resolve) => {
      resolveSnapshot = resolve;
    });

    let streamRequest;
    const streamPromise = new Promise((resolve, reject) => {
      streamRequest = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: `/api/rides/${rideRes.body._id}/stream?token=${riderRes.body.accessToken}`,
          method: 'GET',
          headers: {
            Accept: 'text/event-stream'
          }
        },
        (res) => {
          res.setEncoding('utf8');
          let buffer = '';
          const events = [];

          res.on('data', (chunk) => {
            buffer += chunk;
            let boundary = buffer.indexOf('\n\n');

            while (boundary !== -1) {
              const rawEvent = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              boundary = buffer.indexOf('\n\n');

              if (!rawEvent.trim()) {
                continue;
              }

              const lines = rawEvent.split('\n');
              const eventLine = lines.find((line) => line.startsWith('event:'));
              const dataLine = lines.find((line) => line.startsWith('data:'));
              if (!dataLine) {
                continue;
              }

              const type = eventLine ? eventLine.replace('event: ', '').trim() : 'message';
              const data = JSON.parse(dataLine.replace('data: ', ''));
              events.push({ type, data });

              if (type === 'snapshot') {
                resolveSnapshot();
              }

              if (type === 'status' && data.status === 'completed') {
                streamRequest.destroy();
                resolve(events);
              }
            }
          });

          res.on('error', reject);
        }
      );

      streamRequest.on('error', reject);
      streamRequest.end();
    });

    await snapshotReady;

    await request(app)
      .patch(`/api/rides/${rideRes.body._id}`)
      .set('Authorization', `Bearer ${driverRes.body.accessToken}`)
      .send({ status: 'en_route', driverEtaMinutes: 6 });

    await request(app)
      .patch(`/api/rides/${rideRes.body._id}`)
      .set('Authorization', `Bearer ${driverRes.body.accessToken}`)
      .send({ status: 'completed', driverEtaMinutes: 0 });

    const events = await streamPromise;

    const statusEvents = events.filter((event) => event.type === 'status');
    expect(statusEvents.map((event) => event.data.status)).toEqual(
      expect.arrayContaining(['en_route', 'completed'])
    );
    expect(statusEvents.some((event) => event.data.driverEtaMinutes === 6)).toBe(true);
    expect(statusEvents[statusEvents.length - 1].data.driverEtaMinutes).toBe(0);

    await new Promise((resolve) => server.close(resolve));
  });
});
