process.env.STRIPE_SECRET_KEY = 'sk_test_mocked';
process.env.AIRTABLE_API_KEY = 'key_mocked';
process.env.AIRTABLE_BASE_ID = 'base_mocked';
process.env.AIRTABLE_RIDES_TABLE = 'RideEvents';

const Ride = require('../../models/Ride');
const Driver = require('../../models/Driver');
const rideService = require('../../services/rideService');
const dispatchService = require('../../services/dispatchService');
const paymentService = require('../../services/paymentService');
const analyticsService = require('../../services/analyticsService');

jest.mock('../../services/dispatchService');

describe('rideService.requestRide', () => {
  let stripeClient;
  let paymentIntents;
  let airtableCreate;
  let airtableBase;

  beforeEach(() => {
    dispatchService.findNearbyDrivers.mockResolvedValue([]);
    airtableCreate = jest.fn().mockResolvedValue();
    airtableBase = jest.fn(() => ({ create: airtableCreate }));
    analyticsService.__setAirtableBase(airtableBase);

    paymentIntents = {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'requires_capture' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'requires_capture', amount: 3900 }),
      update: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'requires_capture' }),
      capture: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded', latest_charge: 'ch_test' })
    };
    stripeClient = { paymentIntents };
    paymentService.__setStripeClient(stripeClient);
  });

  afterEach(() => {
    paymentService.__resetStripeClient();
    analyticsService.__setAirtableBase(null);
    jest.clearAllMocks();
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
    expect(paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: stored.priceCents,
        currency: 'usd',
        capture_method: 'manual'
      })
    );
    expect(stored.paymentIntentId).toBe('pi_test');
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

  it('captures payment and logs analytics on ride completion', async () => {
    const ride = await rideService.requestRide({
      riderId: '507f1f77bcf86cd799439011',
      pickup: { lat: 34.078, lng: -118.261, address: 'Echo Park Lake' },
      dropoff: { lat: 34.092, lng: -118.328, address: 'Griffith Observatory' },
      bikeType: 'ebike'
    });

    airtableCreate.mockClear();
    paymentIntents.capture.mockResolvedValue({
      id: ride.paymentIntentId,
      status: 'succeeded',
      latest_charge: 'ch_capture'
    });

    await rideService.updateRideStatus({ rideId: ride.id, status: 'completed' });

    expect(paymentIntents.capture).toHaveBeenCalledWith(ride.paymentIntentId);
    const stored = await Ride.findById(ride.id);
    expect(stored.paymentChargeId).toBe('ch_capture');
    expect(stored.paymentStatus).toBe('succeeded');
    expect(stored.paymentCapturedAt).toBeInstanceOf(Date);

    const eventTypes = airtableCreate.mock.calls.map((call) => call[0][0].fields.EventType);
    expect(eventTypes).toContain('ride_status_updated');
    expect(eventTypes).toContain('ride_completed');

    const statusEvent = airtableCreate.mock.calls.find((call) => call[0][0].fields.EventType === 'ride_status_updated');
    const payload = JSON.parse(statusEvent[0][0].fields.PayloadJson);
    expect(payload.status).toBe('completed');
  });
});
