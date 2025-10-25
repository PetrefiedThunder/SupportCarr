#!/usr/bin/env node
require('dotenv').config();
const axios = require('axios').create({
  baseURL: process.env.API_BASE_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' }
});

async function main() {
  console.log('--- SupportCarr Demo Simulation ---');
  const riderEmail = `demo-rider-${Date.now()}@supportcarr.test`;
  const driverEmail = `demo-driver-${Date.now()}@supportcarr.test`;

  const rider = await axios.post('/auth/register', {
    email: riderEmail,
    password: 'DemoPass123!',
    name: 'Demo Rider',
    phoneNumber: '+13235550011',
    role: 'rider'
  });
  console.log('Created rider');

  const driver = await axios.post('/auth/register', {
    email: driverEmail,
    password: 'DemoPass123!',
    name: 'Demo Driver',
    phoneNumber: '+13235550022',
    role: 'driver'
  });
  console.log('Created driver');

  const driverProfile = await axios.post(
    '/drivers',
    { vehicleType: 'van', vehicleDescription: 'Demo Van' },
    { headers: { Authorization: `Bearer ${driver.data.accessToken}` } }
  );
  console.log('Driver profile ready');

  await axios.patch(
    `/drivers/${driverProfile.data._id}`,
    { active: true, currentLocation: { lat: 34.077, lng: -118.26 } },
    { headers: { Authorization: `Bearer ${driver.data.accessToken}` } }
  );
  console.log('Driver is active in Echo Park');

  const ride = await axios.post(
    '/rides',
    {
      pickup: { lat: 34.077, lng: -118.26, address: 'Echo Park Lake' },
      dropoff: { lat: 34.092, lng: -118.282, address: 'Silver Lake' },
      bikeType: 'ebike',
      notes: 'Front tire puncture'
    },
    { headers: { Authorization: `Bearer ${rider.data.accessToken}` } }
  );
  console.log(`Ride requested. Status: ${ride.data.status}`);

  await axios.patch(
    `/rides/${ride.data._id}`,
    { status: 'en_route' },
    { headers: { Authorization: `Bearer ${driver.data.accessToken}` } }
  );
  console.log('Driver en route. Twilio notification simulated.');

  await axios.patch(
    `/rides/${ride.data._id}`,
    { status: 'completed' },
    { headers: { Authorization: `Bearer ${driver.data.accessToken}` } }
  );
  console.log('Ride completed and payout simulated. Airtable log created.');

  console.log('--- Demo complete ---');
}

main().catch((error) => {
  console.error('Demo failed', error.response?.data || error.message);
  process.exit(1);
});
