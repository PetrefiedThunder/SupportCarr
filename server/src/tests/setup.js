jest.mock('../config/database', () => ({
  connectDatabase: jest.fn().mockResolvedValue(),
  disconnectDatabase: jest.fn().mockResolvedValue()
}));

jest.mock('../config/redis', () => {
  const store = new Map();
  return {
    getRedisClient: jest.fn(async () => ({
      async geoAdd(key, locations) {
        const existing = store.get(key) || [];
        store.set(key, existing.concat(locations));
        return locations.length;
      },
      async geoRadius(key, longitude, latitude, radius) {
        const entries = store.get(key) || [];
        return entries
          .map((entry) => {
            if (Array.isArray(entry)) {
              const [lon, lat, member] = entry;
              return {
                member,
                distance: Math.sqrt((lon - longitude) ** 2 + (lat - latitude) ** 2)
              };
            }
            const { longitude: lon, latitude: lat, member } = entry;
            return {
              member,
              distance: Math.sqrt((lon - longitude) ** 2 + (lat - latitude) ** 2)
            };
          })
          .filter((entry) => entry.distance <= radius)
          .map((entry) => entry.member);
      },
      async del(key) {
        store.delete(key);
      }
    }))
  };
});

jest.mock('../db/userRepository', () => {
  const User = require('./mocks/userMock');
  return {
    createUser: (...args) => User.create(...args),
    findByEmail: (email) => User.findOne({ email }),
    findById: (id) => User.findById(id),
    findByRefreshToken: (token) => User.findOne({ 'refreshTokens.token': token }),
    appendRefreshToken: async (userId, entry) => {
      const user = await User.findById(userId);
      if (!user) return null;
      user.refreshTokens.push(entry);
      return user;
    },
    removeRefreshToken: async (token) => {
      const user = await User.findOne({ 'refreshTokens.token': token });
      if (!user) return null;
      user.refreshTokens = user.refreshTokens.filter((entry) => entry.token !== token);
      return user;
    },
    updateStripeCustomerId: async (userId, stripeCustomerId) => {
      const user = await User.findById(userId);
      if (!user) return null;
      user.stripeCustomerId = stripeCustomerId;
      return user;
    }
  };
});

jest.mock('../db/driverRepository', () => {
  const Driver = require('./mocks/driverMock');
  const User = require('./mocks/userMock');
  return {
    upsertDriver: ({ userId, vehicleType, vehicleDescription }) =>
      Driver.findOneAndUpdate(
        { user: userId },
        { vehicleType, vehicleDescription },
        { new: true, upsert: true }
      ),
    findById: (id) => Driver.findById(id),
    findByUserId: (userId) => Driver.findOne({ user: userId }),
    findWithUserById: async (id) => {
      const driver = await Driver.findById(id);
      if (driver && typeof driver.populate === 'function') {
        await driver.populate('user');
      }
      return driver;
    },
    listAllWithUsers: async () => {
      const drivers = await Promise.all(Driver.__store.map((d) => Driver.findById(d._id)));
      return Promise.all(
        drivers.map(async (driver) => {
          if (driver && typeof driver.populate === 'function') {
            await driver.populate('user');
          }
          return driver;
        })
      );
    },
    updateDriverStatusAndLocation: async ({ driverId, active, location }) => {
      const driver = await Driver.findById(driverId);
      if (!driver) return null;
      if (typeof active === 'boolean') {
        driver.active = active;
      }
      if (location) {
        driver.currentLocation = location;
      }
      return driver;
    },
    markDriverBusy: async (driverId) => Driver.findById(driverId),
    markDriverAvailable: async (driverId) => Driver.findById(driverId),
    incrementRideStats: async (driverId) => {
      const driver = await Driver.findById(driverId);
      if (!driver) return null;
      driver.totalRides = (driver.totalRides || 0) + 1;
      driver.lastRideCompletedAt = new Date();
      return driver;
    }
  };
});

jest.mock('../db/rideRepository', () => {
  const Ride = require('./mocks/rideMock');
  return {
    createRide: (data) => Ride.create({
      rider: data.riderId,
      driver: data.driverId,
      riderPhone: data.riderPhone,
      pickup: data.pickup,
      dropoff: data.dropoff,
      bikeType: data.bikeType,
      distanceMiles: data.distanceMiles,
      priceCents: data.priceCents,
      status: data.status,
      notes: data.notes,
      wtpAsked: data.wtpAsked
    }),
    updateRide: (id, updates) => Ride.findByIdAndUpdate(id, updates, { new: true }),
    findById: (id) => Ride.findById(id),
    findByIdWithDriver: (id) => Ride.findById(id),
    listByRider: (riderId) => Ride.find({ rider: riderId }),
    listActiveByDriver: (driverId) => Ride.find({ driver: driverId, status: { $in: ['accepted', 'en_route'] } }),
    findLatestWtpRideForPhone: (phone) => Ride.findOne({ riderPhone: phone, wtpAsked: true, wtpResponse: null })
  };
});

jest.mock('../db/paymentLedgerRepository', () => ({
  findByStripeEventId: jest.fn().mockResolvedValue(null),
  createLedger: jest.fn(async ({ stripeEventId, type, payload }) => ({
    id: stripeEventId,
    stripeEventId,
    type,
    payload
  })),
  markLedgerProcessed: jest.fn(async (id, data) => ({ id, ...data }))
}));

// Legacy model mocks for tests that still import Mongoose models
jest.mock('../models/User', () => require('./mocks/userMock'));
jest.mock('../models/Driver', () => require('./mocks/driverMock'));
jest.mock('../models/Ride', () => require('./mocks/rideMock'));
jest.mock('../models/PaymentLedger', () => require('./mocks/paymentLedgerMock'));

const { resetAll } = require('./mocks');

beforeEach(() => {
  resetAll();
});

afterEach(() => {
  resetAll();
});
