const mockGetRedisClient = jest.fn();

jest.mock('../../config/redis', () => {
  const actual = jest.requireActual('../../config/redis');
  return {
    ...actual,
    getRedisClient: mockGetRedisClient
  };
});

const { createInMemoryClient } = require('../../config/redis');
const { storeDriverLocation, findNearbyDrivers } = require('../../services/dispatchService');

beforeEach(() => {
  const client = createInMemoryClient();
  mockGetRedisClient.mockImplementation(() => Promise.resolve(client));
});

afterEach(() => {
  mockGetRedisClient.mockReset();
});

describe('dispatchService fallback geospatial operations', () => {
  it('returns drivers using the in-memory geo store when Redis is unavailable', async () => {
    await storeDriverLocation('driver-1', { lat: 34.05, lng: -118.25 });
    await storeDriverLocation('driver-2', { lat: 34.15, lng: -118.15 });

    const driverIds = await findNearbyDrivers({ lat: 34.05, lng: -118.25, radiusMiles: 20 });

    expect(driverIds).toEqual(['driver-1', 'driver-2']);
  });

  it('filters out drivers outside the radius in the in-memory geo store', async () => {
    await storeDriverLocation('nearby', { lat: 34.05, lng: -118.25 });
    await storeDriverLocation('distant', { lat: 40.71, lng: -74.01 });

    const driverIds = await findNearbyDrivers({ lat: 34.05, lng: -118.25, radiusMiles: 5 });

    expect(driverIds).toEqual(['nearby']);
  });
});
