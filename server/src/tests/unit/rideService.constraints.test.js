process.env.STRIPE_SECRET_KEY = 'sk_test_mocked';
process.env.AIRTABLE_API_KEY = 'key_mocked';
process.env.AIRTABLE_BASE_ID = 'base_mocked';

const User = require('../../models/User');
const Ride = require('../../models/Ride');
const rideService = require('../../services/rideService');
const paymentService = require('../../services/paymentService');
const analyticsService = require('../../services/analyticsService');
const dispatchService = require('../../services/dispatchService');

jest.mock('../../services/dispatchService');
jest.mock('../../services/smsService');
jest.mock('../../repositories/driverLocationRepository', () => ({
  markDriverAvailable: jest.fn()
}));

describe('rideService - Pilot Constraints & Safety', () => {
  let stripeClient;
  let airtableBase;
  let user;

  beforeEach(async () => {
    dispatchService.findBestDrivers.mockResolvedValue([]);

    // Mock Airtable
    const airtableCreate = jest.fn().mockResolvedValue();
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

    // Mock Stripe
    const paymentIntents = {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'requires_capture' }),
      capture: jest.fn().mockResolvedValue({ id: 'pi_test', status: 'succeeded', latest_charge: 'ch_test' })
    };
    const customers = {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' })
    };
    stripeClient = { paymentIntents, customers };
    paymentService.__setStripeClient(stripeClient);

    // Create test user
    user = await User.create({
      email: 'rider@test.com',
      passwordHash: 'test',
      name: 'Test Rider',
      phoneNumber: '+13105551234',
      role: 'rider'
    });
  });

  afterEach(() => {
    paymentService.__resetStripeClient();
    analyticsService.__setAirtableBase(null);
    jest.clearAllMocks();
  });

  describe('10-Mile Distance Cap', () => {
    it('accepts rides under 10 miles', async () => {
      // ~5 miles distance
      const ride = await rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Downtown LA' },
        dropoff: { lat: 34.0922, lng: -118.2837, address: 'Hollywood' },
        bikeType: 'ebike'
      });

      expect(ride).toBeTruthy();
      expect(ride.status).toBe('requested');
      expect(ride.distanceMiles).toBeLessThan(10);
    });

    it('accepts rides at exactly 10 miles', async () => {
      // ~10 miles distance
      const ride = await rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Downtown LA' },
        dropoff: { lat: 34.1722, lng: -118.3137, address: 'Beverly Hills' },
        bikeType: 'cargo'
      });

      expect(ride).toBeTruthy();
      expect(ride.status).toBe('requested');
    });

    it('rejects rides over 10 miles', async () => {
      // ~20+ miles distance
      await expect(rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Downtown LA' },
        dropoff: { lat: 34.0522, lng: -118.5437, address: 'Santa Monica' },
        bikeType: 'ebike'
      })).rejects.toThrow('Trip exceeds pilot 10-mile limit');
    });

    it('rejects rides significantly over 10 miles', async () => {
      // ~50+ miles distance
      await expect(rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Los Angeles' },
        dropoff: { lat: 33.7701, lng: -118.1937, address: 'Long Beach' },
        bikeType: 'analog'
      })).rejects.toThrow('Trip exceeds pilot 10-mile limit');
    });
  });

  describe('Bikes Only Policy', () => {
    it('accepts analog bikes', async () => {
      const ride = await rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Start' },
        dropoff: { lat: 34.0622, lng: -118.2537, address: 'End' },
        bikeType: 'analog'
      });

      expect(ride.bikeType).toBe('analog');
    });

    it('accepts ebikes', async () => {
      const ride = await rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Start' },
        dropoff: { lat: 34.0622, lng: -118.2537, address: 'End' },
        bikeType: 'ebike'
      });

      expect(ride.bikeType).toBe('ebike');
    });

    it('accepts cargo bikes', async () => {
      const ride = await rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Start' },
        dropoff: { lat: 34.0622, lng: -118.2537, address: 'End' },
        bikeType: 'cargo'
      });

      expect(ride.bikeType).toBe('cargo');
    });

    it('accepts folding bikes', async () => {
      const ride = await rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Start' },
        dropoff: { lat: 34.0622, lng: -118.2537, address: 'End' },
        bikeType: 'folding'
      });

      expect(ride.bikeType).toBe('folding');
    });

    it('rejects passenger vehicles', async () => {
      await expect(rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Start' },
        dropoff: { lat: 34.0622, lng: -118.2537, address: 'End' },
        bikeType: 'passenger'
      })).rejects.toThrow('Invalid bikeType');
    });

    it('rejects scooters', async () => {
      await expect(rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Start' },
        dropoff: { lat: 34.0622, lng: -118.2537, address: 'End' },
        bikeType: 'scooter'
      })).rejects.toThrow('Invalid bikeType');
    });

    it('rejects generic "other" type', async () => {
      await expect(rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0522, lng: -118.2437, address: 'Start' },
        dropoff: { lat: 34.0622, lng: -118.2537, address: 'End' },
        bikeType: 'other'
      })).rejects.toThrow('Invalid bikeType');
    });
  });

  describe('Assist Logging Infrastructure', () => {
    let ride;

    beforeEach(async () => {
      ride = await Ride.create({
        rider: user._id,
        riderPhone: user.phoneNumber,
        pickup: { lat: 34.0, lng: -118.0, address: 'Start' },
        dropoff: { lat: 34.1, lng: -118.1, address: 'End' },
        bikeType: 'ebike',
        status: 'requested',
        distanceMiles: 5,
        priceCents: 5000,
        paymentIntentId: 'pi_test'
      });
    });

    it('allows setting assistRequired to true', async () => {
      const updated = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'accepted',
        assistRequired: true,
        assistReason: 'physical_help'
      });

      expect(updated.assistRequired).toBe(true);
      expect(updated.assistReason).toBe('physical_help');
    });

    it('allows different assist reasons', async () => {
      const reasons = ['physical_help', 'equipment_issue', 'navigation', 'other'];
      
      for (const reason of reasons) {
        const updated = await rideService.updateRideStatus({
          rideId: ride._id,
          status: ride.status,
          assistRequired: true,
          assistReason: reason
        });

        expect(updated.assistReason).toBe(reason);
      }
    });

    it('defaults assistRequired to false when not specified', async () => {
      // Create a new ride which should not have assist tracking initially
      const newRide = await rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0, lng: -118.0, address: 'Start' },
        dropoff: { lat: 34.1, lng: -118.1, address: 'End' },
        bikeType: 'ebike'
      });
      
      const stored = await Ride.findById(newRide._id);
      // Field should be falsy (false or undefined) when not set
      expect(stored.assistRequired).toBeFalsy();
      expect(stored.assistReason).toBeFalsy();
    });

    it('allows tracking assist during ride completion', async () => {
      await rideService.updateRideStatus({ rideId: ride._id, status: 'accepted' });
      await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'en_route',
        assistRequired: true,
        assistReason: 'equipment_issue'
      });
      const completed = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'completed'
      });

      expect(completed.assistRequired).toBe(true);
      expect(completed.assistReason).toBe('equipment_issue');
    });
  });

  describe('Hazmat/Safety Flagging', () => {
    let ride;

    beforeEach(async () => {
      ride = await Ride.create({
        rider: user._id,
        riderPhone: user.phoneNumber,
        pickup: { lat: 34.0, lng: -118.0, address: 'Start' },
        dropoff: { lat: 34.1, lng: -118.1, address: 'End' },
        bikeType: 'ebike',
        status: 'requested',
        distanceMiles: 5,
        priceCents: 5000
      });
    });

    it('allows cancellation with damaged battery reason', async () => {
      const cancelled = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'cancelled',
        cancellationReason: 'damaged_battery'
      });

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellationReason).toBe('damaged_battery');
    });

    it('allows cancellation with hazmat reason', async () => {
      const cancelled = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'cancelled',
        cancellationReason: 'hazmat'
      });

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellationReason).toBe('hazmat');
    });

    it('supports other cancellation reasons', async () => {
      const reasons = ['rider_request', 'driver_unavailable', 'other'];
      
      for (const reason of reasons) {
        const testRide = await Ride.create({
          rider: user._id,
          riderPhone: user.phoneNumber,
          pickup: { lat: 34.0, lng: -118.0, address: 'Start' },
          dropoff: { lat: 34.1, lng: -118.1, address: 'End' },
          bikeType: 'analog',
          status: 'requested',
          distanceMiles: 5,
          priceCents: 5000
        });

        const cancelled = await rideService.updateRideStatus({
          rideId: testRide._id,
          status: 'cancelled',
          cancellationReason: reason
        });

        expect(cancelled.cancellationReason).toBe(reason);
      }
    });

    it('allows cancellation without specifying reason', async () => {
      const cancelled = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'cancelled'
      });

      expect(cancelled.status).toBe('cancelled');
      // cancellationReason remains undefined when not set
      expect(cancelled.cancellationReason).toBeUndefined();
    });

    it('defaults cancellationReason to null', async () => {
      // Create a new ride which should not have cancellation reason initially
      const newRide = await rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0, lng: -118.0, address: 'Start' },
        dropoff: { lat: 34.1, lng: -118.1, address: 'End' },
        bikeType: 'analog'
      });
      
      const stored = await Ride.findById(newRide._id);
      // Field should be falsy (null or undefined) when not set
      expect(stored.cancellationReason).toBeFalsy();
    });
  });

  describe('Combined Safety Scenarios', () => {
    it('tracks both assist and cancellation for safety incident', async () => {
      const ride = await Ride.create({
        rider: user._id,
        riderPhone: user.phoneNumber,
        pickup: { lat: 34.0, lng: -118.0, address: 'Start' },
        dropoff: { lat: 34.1, lng: -118.1, address: 'End' },
        bikeType: 'ebike',
        status: 'requested',
        distanceMiles: 5,
        priceCents: 5000
      });

      // Accept ride
      await rideService.updateRideStatus({ rideId: ride._id, status: 'accepted' });
      
      // En route with assist required
      await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'en_route',
        assistRequired: true,
        assistReason: 'equipment_issue'
      });

      // Cancel due to safety issue
      const cancelled = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'cancelled',
        cancellationReason: 'damaged_battery'
      });

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellationReason).toBe('damaged_battery');
      expect(cancelled.assistRequired).toBe(true);
      expect(cancelled.assistReason).toBe('equipment_issue');
    });
  });
});
