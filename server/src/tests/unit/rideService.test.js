process.env.STRIPE_SECRET_KEY = 'sk_test_mocked';
process.env.AIRTABLE_API_KEY = 'key_mocked';
process.env.AIRTABLE_BASE_ID = 'base_mocked';
process.env.AIRTABLE_RIDES_TABLE = 'RideEvents';
process.env.TWILIO_ACCOUNT_SID = 'AC_mocked';
process.env.TWILIO_AUTH_TOKEN = 'auth_mocked';
process.env.TWILIO_FROM_NUMBER = '+15551234567';

const Ride = require('../../models/Ride');
const Driver = require('../../models/Driver');
const User = require('../../models/User');
const rideService = require('../../services/rideService');
const dispatchService = require('../../services/dispatchService');
const paymentService = require('../../services/paymentService');
const analyticsService = require('../../services/analyticsService');
const smsService = require('../../services/smsService');

jest.mock('../../services/dispatchService');
jest.mock('../../services/smsService');
jest.mock('../../repositories/driverLocationRepository', () => ({
  markDriverAvailable: jest.fn()
}));

describe('rideService.requestRide', () => {
  let stripeClient;
  let paymentIntents;
  let airtableCreate;
  let airtableBase;

  beforeEach(() => {
    dispatchService.findBestDrivers.mockResolvedValue([]);
    smsService.sendWtpSms.mockResolvedValue({ sid: 'SM_test' });

    airtableCreate = jest.fn().mockResolvedValue();
    const airtableSelect = jest.fn().mockReturnValue({
      firstPage: jest.fn().mockResolvedValue([{ id: 'rec_test' }])
    });
    const airtableUpdate = jest.fn().mockResolvedValue();
    airtableBase = jest.fn(() => ({
      create: airtableCreate,
      select: airtableSelect,
      update: airtableUpdate
    }));
    analyticsService.__setAirtableBase(airtableBase);

    paymentIntents = {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'requires_capture' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'requires_capture', amount: 3900 }),
      update: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'requires_capture' }),
      capture: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded', latest_charge: 'ch_test' })
    };
    const customers = {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test' })
    };
    stripeClient = { paymentIntents, customers };
    paymentService.__setStripeClient(stripeClient);
  });

  afterEach(() => {
    paymentService.__resetStripeClient();
    analyticsService.__setAirtableBase(null);
    jest.clearAllMocks();
  });

  it('creates a ride with tiered pricing', async () => {
    const user = await User.create({
      email: 'rider1@test.com',
      passwordHash: 'test',
      name: 'Test Rider 1',
      phoneNumber: '+13105551111',
      role: 'rider'
    });

    const ride = await rideService.requestRide({
      riderId: user._id,
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
    const user = await User.create({
      email: 'rider2@test.com',
      passwordHash: 'test',
      name: 'Test Rider 2',
      phoneNumber: '+13105552222',
      role: 'rider'
    });

    const driverUser = await User.create({
      email: 'driver@test.com',
      passwordHash: 'test',
      name: 'Test Driver',
      phoneNumber: '+13105559999',
      role: 'driver'
    });

    const driver = await Driver.create({
      user: driverUser._id,
      vehicleType: 'van',
      active: true,
      currentLocation: { lat: 34.07, lng: -118.25 }
    });

    dispatchService.findBestDrivers.mockResolvedValue([
      { driver, driverId: driver.id, score: 0, distance: 0 }
    ]);

    const ride = await rideService.requestRide({
      riderId: user._id,
      pickup: { lat: 34.078, lng: -118.261, address: 'Echo Park Lake' },
      dropoff: { lat: 34.092, lng: -118.328, address: 'Griffith Observatory' },
      bikeType: 'analog'
    });

    expect(ride.status).toBe('accepted');
    expect(dispatchService.triggerDriverNotification).toHaveBeenCalled();
  });

  it('captures payment and logs analytics on ride completion', async () => {
    // Create a user
    const user = await User.create({
      email: 'rider@test.com',
      passwordHash: 'test',
      name: 'Test Rider',
      phoneNumber: '+13105551234',
      role: 'rider'
    });

    const ride = await rideService.requestRide({
      riderId: user._id,
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

    // Follow proper status transitions: requested -> accepted -> en_route -> completed
    await rideService.updateRideStatus({ rideId: ride.id, status: 'accepted' });
    await rideService.updateRideStatus({ rideId: ride.id, status: 'en_route' });
    await rideService.updateRideStatus({ rideId: ride.id, status: 'completed' });

    // Verify payment was captured
    expect(paymentIntents.capture).toHaveBeenCalledWith(ride.paymentIntentId);
    const stored = await Ride.findById(ride.id);
    expect(stored.paymentChargeId).toBe('ch_capture');
    expect(stored.paymentStatus).toBe('succeeded');
    expect(stored.paymentCapturedAt).toBeInstanceOf(Date);

    // Verify analytics events were logged
    const eventTypes = airtableCreate.mock.calls.map((call) => call[0][0].fields.EventType);
    expect(eventTypes).toContain('ride_status_updated');
    expect(eventTypes).toContain('ride_completed');

    // Verify completed event has correct data
    const completedEvent = airtableCreate.mock.calls.find((call) => call[0][0].fields.EventType === 'ride_completed');
    expect(completedEvent).toBeTruthy();
    const payload = JSON.parse(completedEvent[0][0].fields.PayloadJson);
    expect(payload.rideId).toBe(ride.id);
  });
});
