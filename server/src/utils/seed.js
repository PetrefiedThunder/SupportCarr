require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('../config/database');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const { storeDriverLocation } = require('../services/dispatchService');

const riders = Array.from({ length: 10 }).map((_, idx) => ({
  email: `rider${idx + 1}@supportcarr.test`,
  password: process.env.SEED_ADMIN_PASSWORD || 'Password123!',
  name: `Rider ${idx + 1}`,
  phoneNumber: `+1323555${(1000 + idx).toString()}`,
  role: 'rider'
}));

const driverLocations = [
  { lat: 34.078, lng: -118.260 },
  { lat: 34.082, lng: -118.270 },
  { lat: 34.086, lng: -118.250 },
  { lat: 34.101, lng: -116.326 },
  { lat: 34.096, lng: -118.283 },
  { lat: 34.077, lng: -118.265 },
  { lat: 34.11, lng: -116.314 },
  { lat: 34.072, lng: -118.247 },
  { lat: 34.1, lng: -118.29 },
  { lat: 34.095, lng: -118.275 }
];

async function seed() {
  await connectDatabase();
  await mongoose.connection.dropDatabase();

  const adminPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || 'Admin1234!', 10);
  await User.create({
    email: process.env.SEED_ADMIN_EMAIL || 'admin@supportcarr.test',
    passwordHash: adminPassword,
    role: 'admin',
    name: 'SupportCarr Admin',
    phoneNumber: '+13235550000'
  });

  const riderDocs = await Promise.all(
    riders.map(async (rider) =>
      User.create({
        email: rider.email,
        passwordHash: await bcrypt.hash(rider.password, 10),
        role: 'rider',
        name: rider.name,
        phoneNumber: rider.phoneNumber
      })
    )
  );

  const driverDocs = await Promise.all(
    driverLocations.map(async (location, idx) => {
      const user = await User.create({
        email: `driver${idx + 1}@supportcarr.test`,
        passwordHash: await bcrypt.hash(process.env.SEED_DRIVER_PASSWORD || 'Driver1234!', 10),
        role: 'driver',
        name: `Driver ${idx + 1}`,
        phoneNumber: `+1323444${(2000 + idx).toString()}`
      });

      const driver = await Driver.create({
        user: user.id,
        vehicleType: idx % 2 === 0 ? 'van' : 'truck',
        vehicleDescription: 'SupportCarr Fleet Vehicle',
        active: true,
        currentLocation: location
      });

      await storeDriverLocation(driver.id, location);
      return driver;
    })
  );

  const rides = [
    {
      rider: riderDocs[0].id,
      driver: driverDocs[0].id,
      pickup: { lat: 34.077, lng: -118.260, address: 'Echo Park Lake' },
      dropoff: { lat: 34.092, lng: -118.282, address: 'Silver Lake' },
      status: 'en_route'
    },
    {
      rider: riderDocs[1].id,
      driver: driverDocs[1].id,
      pickup: { lat: 34.081, lng: -118.273, address: 'Sunset Junction' },
      dropoff: { lat: 34.097, lng: -118.288, address: 'Los Feliz' },
      status: 'accepted'
    },
    {
      rider: riderDocs[2].id,
      driver: driverDocs[2].id,
      pickup: { lat: 34.012, lng: -116.166, address: 'Joshua Tree Visitor Center' },
      dropoff: { lat: 34.135, lng: -116.054, address: 'Hidden Valley' },
      status: 'requested'
    }
  ];

  await Ride.insertMany(
    rides.map((ride) => ({
      ...ride,
      bikeType: 'ebike',
      distanceMiles: 5,
      priceCents: 5900
    }))
  );

  console.log('Seed data created successfully');
  await disconnectDatabase();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
