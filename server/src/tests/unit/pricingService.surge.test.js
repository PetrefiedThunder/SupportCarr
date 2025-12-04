jest.mock('../../services/geoService', () => ({
  DEFAULT_RADIUS_METERS: 1000,
  ensureGeoIndexes: jest.fn().mockResolvedValue(),
  countActiveDriversNear: jest.fn(),
  countActiveRidesNear: jest.fn(),
}));

const {
  countActiveDriversNear,
  countActiveRidesNear,
  ensureGeoIndexes,
  DEFAULT_RADIUS_METERS,
} = require('../../services/geoService');
const { calculateSurgeMultiplier } = require('../../services/pricingService');

describe('pricingService surge calculation with PostGIS counts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns max surge when no drivers are available nearby', async () => {
    countActiveRidesNear.mockResolvedValue(12);
    countActiveDriversNear.mockResolvedValue(0);

    const result = await calculateSurgeMultiplier({ lat: 37.7749, lng: -122.4194 });

    expect(ensureGeoIndexes).toHaveBeenCalled();
    expect(countActiveDriversNear).toHaveBeenCalledWith({ lat: 37.7749, lng: -122.4194, radiusMeters: DEFAULT_RADIUS_METERS });
    expect(result.multiplier).toBe(2.5);
    expect(result.reason).toMatch(/No drivers available/);
  });

  test('weights surge using geodesic demand to supply ratio', async () => {
    countActiveRidesNear.mockResolvedValue(30);
    countActiveDriversNear.mockResolvedValue(10);

    const result = await calculateSurgeMultiplier({ lat: 0.01, lng: -179.99, radiusMeters: 5000 });

    expect(countActiveRidesNear).toHaveBeenCalledWith({ lat: 0.01, lng: -179.99, radiusMeters: 5000 });
    expect(result.multiplier).toBeCloseTo(2.5); // 3.0 ratio -> capped at 2.5
    expect(result.reason).toMatch(/High demand/);
  });
});
