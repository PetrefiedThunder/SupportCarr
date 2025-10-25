const Ride = require('../../models/Ride');
const Driver = require('../../models/Driver');
const rideService = require('../../services/rideService');
const dispatchService = require('../../services/dispatchService');

jest.mock('../../services/dispatchService');

describe('rideService.requestRide', () => {
  beforeEach(() => {
    dispatchService.findNearbyDrivers.mockResolvedValue([]);
  });

  it('creates a ride with tiered pricing', async () => {
    const ride = await rideService.requestRide({
      riderId: '507f1f77bcf86cd799439011',
      pickup: { lat: 34.078, lng: -118.261, address: 'Echo Park Lake' },
      dropoff: { lat: 34.092, lng: -118.328, address: 'Griffith Observatory' },
      bikeType: 'ebike'
    });

    const stored = await Ride.findById(ride.id);
    expect(stored).toBeTruthy();
    expect(stored.priceCents).toBeGreaterThan(0);
    expect(stored.status).toBe('requested');
  });

  it('attempts to auto assign drivers when available', async () => {
    const driver = await Driver.create({
      user: '507f1f77bcf86cd799439012',
      vehicleType: 'van',
      active: true,
      currentLocation: { lat: 34.07, lng: -118.25 }
    });

    dispatchService.findNearbyDrivers.mockResolvedValue([driver.id]);

    const ride = await rideService.requestRide({
      riderId: '507f1f77bcf86cd799439011',
      pickup: { lat: 34.078, lng: -118.261, address: 'Echo Park Lake' },
      dropoff: { lat: 34.092, lng: -118.328, address: 'Griffith Observatory' },
      bikeType: 'bike'
    });

    expect(ride.status).toBe('accepted');
    expect(dispatchService.triggerDriverNotification).toHaveBeenCalled();
  });
});
