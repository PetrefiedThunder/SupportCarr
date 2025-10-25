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

jest.mock('../models/User', () => require('./mocks/userMock'));
jest.mock('../models/Driver', () => require('./mocks/driverMock'));
jest.mock('../models/Ride', () => require('./mocks/rideMock'));

const { resetAll } = require('./mocks');

beforeEach(() => {
  resetAll();
});

afterEach(() => {
  resetAll();
});
