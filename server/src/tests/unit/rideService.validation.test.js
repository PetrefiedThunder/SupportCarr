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

describe('rideService validation and FSM', () => {
  let stripeClient;
  let airtableBase;

  beforeEach(() => {
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
  });

  afterEach(() => {
    paymentService.__resetStripeClient();
    analyticsService.__setAirtableBase(null);
    jest.clearAllMocks();
  });

  describe('validateStatusTransition', () => {
    it('allows valid transitions', () => {
      expect(() => rideService.validateStatusTransition('requested', 'accepted')).not.toThrow();
      expect(() => rideService.validateStatusTransition('requested', 'cancelled')).not.toThrow();
      expect(() => rideService.validateStatusTransition('requested', 'cancelled_rider_noshow')).not.toThrow();
      expect(() => rideService.validateStatusTransition('requested', 'rejected_geofence')).not.toThrow();
      expect(() => rideService.validateStatusTransition('accepted', 'en_route')).not.toThrow();
      expect(() => rideService.validateStatusTransition('accepted', 'arrived')).not.toThrow();
      expect(() => rideService.validateStatusTransition('accepted', 'cancelled')).not.toThrow();
      expect(() => rideService.validateStatusTransition('en_route', 'arrived')).not.toThrow();
      expect(() => rideService.validateStatusTransition('en_route', 'in_transit')).not.toThrow();
      expect(() => rideService.validateStatusTransition('en_route', 'completed')).not.toThrow();
      expect(() => rideService.validateStatusTransition('en_route', 'cancelled')).not.toThrow();
      expect(() => rideService.validateStatusTransition('arrived', 'in_transit')).not.toThrow();
      expect(() => rideService.validateStatusTransition('arrived', 'completed')).not.toThrow();
      expect(() => rideService.validateStatusTransition('in_transit', 'completed')).not.toThrow();
    });

    it('rejects invalid transitions', () => {
      expect(() => rideService.validateStatusTransition('requested', 'completed'))
        .toThrow('Invalid status transition');
      expect(() => rideService.validateStatusTransition('completed', 'cancelled'))
        .toThrow('Invalid status transition');
      expect(() => rideService.validateStatusTransition('cancelled', 'accepted'))
        .toThrow('Invalid status transition');
      expect(() => rideService.validateStatusTransition('accepted', 'requested'))
        .toThrow('Invalid status transition');
    });

    it('rejects terminal state transitions', () => {
      expect(() => rideService.validateStatusTransition('completed', 'en_route'))
        .toThrow('terminal state');
      expect(() => rideService.validateStatusTransition('cancelled', 'requested'))
        .toThrow('terminal state');
      expect(() => rideService.validateStatusTransition('cancelled_rider_noshow', 'requested'))
        .toThrow('terminal state');
      expect(() => rideService.validateStatusTransition('cancelled_safety', 'accepted'))
        .toThrow('terminal state');
      expect(() => rideService.validateStatusTransition('rejected_geofence', 'requested'))
        .toThrow('terminal state');
    });
  });

  describe('validateLocation', () => {
    it('accepts valid coordinates', () => {
      expect(() => rideService.validateLocation(
        { lat: 34.0522, lng: -118.2437 },
        'pickup'
      )).not.toThrow();
    });

    it('rejects missing location object', () => {
      expect(() => rideService.validateLocation(null, 'pickup'))
        .toThrow('pickup must be an object');
      expect(() => rideService.validateLocation(undefined, 'dropoff'))
        .toThrow('dropoff must be an object');
    });

    it('rejects invalid latitude', () => {
      expect(() => rideService.validateLocation({ lat: 91, lng: -118 }, 'pickup'))
        .toThrow('pickup.lat must be a number between -90 and 90');
      expect(() => rideService.validateLocation({ lat: -91, lng: -118 }, 'pickup'))
        .toThrow('pickup.lat must be a number between -90 and 90');
      expect(() => rideService.validateLocation({ lat: 'invalid', lng: -118 }, 'pickup'))
        .toThrow('pickup.lat must be a number between -90 and 90');
    });

    it('rejects invalid longitude', () => {
      expect(() => rideService.validateLocation({ lat: 34, lng: 181 }, 'dropoff'))
        .toThrow('dropoff.lng must be a number between -180 and 180');
      expect(() => rideService.validateLocation({ lat: 34, lng: -181 }, 'dropoff'))
        .toThrow('dropoff.lng must be a number between -180 and 180');
    });
  });

  describe('requestRide validation', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        email: 'rider@test.com',
        passwordHash: 'test',
        name: 'Test Rider',
        phoneNumber: '+13105551234',
        role: 'rider'
      });
    });

    it('requires riderId', async () => {
      await expect(rideService.requestRide({
        pickup: { lat: 34.0, lng: -118.0 },
        dropoff: { lat: 34.1, lng: -118.1 }
      })).rejects.toThrow('riderId is required');
    });

    it('validates pickup location', async () => {
      await expect(rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 'invalid', lng: -118.0 },
        dropoff: { lat: 34.1, lng: -118.1 }
      })).rejects.toThrow('pickup.lat must be a number');
    });

    it('validates dropoff location', async () => {
      await expect(rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0, lng: -118.0 },
        dropoff: { lat: 34.1, lng: 200 }
      })).rejects.toThrow('dropoff.lng must be a number');
    });

    it('validates bikeType enum', async () => {
      await expect(rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0, lng: -118.0 },
        dropoff: { lat: 34.1, lng: -118.1 },
        bikeType: 'invalid'
      })).rejects.toThrow('Invalid bikeType');
    });

    it('requires rider to have phone number', async () => {
      const userNoPhone = await User.create({
        email: 'nophone@test.com',
        passwordHash: 'test',
        name: 'No Phone',
        phoneNumber: null,
        role: 'rider'
      });

      await expect(rideService.requestRide({
        riderId: userNoPhone._id,
        pickup: { lat: 34.0, lng: -118.0 },
        dropoff: { lat: 34.1, lng: -118.1 }
      })).rejects.toThrow('Rider must have a phone number');
    });

    it('creates ride with valid inputs', async () => {
      const ride = await rideService.requestRide({
        riderId: user._id,
        pickup: { lat: 34.0, lng: -118.0, address: '123 Main St' },
        dropoff: { lat: 34.1, lng: -118.1, address: '456 Oak Ave' },
        bikeType: 'ebike',
        notes: 'Test ride'
      });

      expect(ride).toBeTruthy();
      expect(ride.riderPhone).toBe('+13105551234');
      expect(ride.bikeType).toBe('ebike');
      expect(ride.status).toBe('requested');
    });
  });

  describe('updateRideStatus validation', () => {
    let user;
    let ride;

    beforeEach(async () => {
      user = await User.create({
        email: 'rider@test.com',
        passwordHash: 'test',
        name: 'Test Rider',
        phoneNumber: '+13105551234',
        role: 'rider'
      });

      ride = await Ride.create({
        rider: user._id,
        riderPhone: user.phoneNumber,
        pickup: { lat: 34.0, lng: -118.0, address: '123 Main St' },
        dropoff: { lat: 34.1, lng: -118.1, address: '456 Oak Ave' },
        bikeType: 'analog',
        status: 'requested',
        distanceMiles: 5,
        priceCents: 5000,
        paymentIntentId: 'pi_test' // Add payment intent for completion tests
      });
    });

    it('requires rideId', async () => {
      await expect(rideService.updateRideStatus({
        status: 'accepted'
      })).rejects.toThrow('rideId is required');
    });

    it('requires status', async () => {
      await expect(rideService.updateRideStatus({
        rideId: ride._id
      })).rejects.toThrow('status is required');
    });

    it('enforces FSM for status transitions', async () => {
      // Can't go directly from requested to completed
      await expect(rideService.updateRideStatus({
        rideId: ride._id,
        status: 'completed'
      })).rejects.toThrow('Invalid status transition');
    });

    it('validates driverEtaMinutes', async () => {
      await expect(rideService.updateRideStatus({
        rideId: ride._id,
        status: 'accepted',
        driverEtaMinutes: -5
      })).rejects.toThrow('driverEtaMinutes must be a non-negative number');
    });

    it('allows valid status transitions', async () => {
      // requested -> accepted
      let updated = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'accepted',
        driverEtaMinutes: 10
      });
      expect(updated.status).toBe('accepted');
      expect(updated.driverEtaMinutes).toBe(10);

      // accepted -> en_route
      updated = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'en_route'
      });
      expect(updated.status).toBe('en_route');

      // en_route -> completed
      updated = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'completed'
      });
      expect(updated.status).toBe('completed');
    });

    it('allows cancellation from any non-terminal state', async () => {
      const updated = await rideService.updateRideStatus({
        rideId: ride._id,
        status: 'cancelled'
      });
      expect(updated.status).toBe('cancelled');
    });
  });

  describe('FSM constants', () => {
    it('exports VALID_STATUS_TRANSITIONS', () => {
      expect(rideService.VALID_STATUS_TRANSITIONS).toBeDefined();
      expect(rideService.VALID_STATUS_TRANSITIONS.requested).toContain('accepted');
      expect(rideService.VALID_STATUS_TRANSITIONS.requested).toContain('cancelled');
      expect(rideService.VALID_STATUS_TRANSITIONS.requested).toContain('cancelled_rider_noshow');
      expect(rideService.VALID_STATUS_TRANSITIONS.requested).toContain('rejected_geofence');
      expect(rideService.VALID_STATUS_TRANSITIONS.completed).toEqual([]);
      expect(rideService.VALID_STATUS_TRANSITIONS.cancelled).toEqual([]);
      expect(rideService.VALID_STATUS_TRANSITIONS.cancelled_rider_noshow).toEqual([]);
      expect(rideService.VALID_STATUS_TRANSITIONS.cancelled_safety).toEqual([]);
      expect(rideService.VALID_STATUS_TRANSITIONS.rejected_geofence).toEqual([]);
    });

    it('exports VALID_BIKE_TYPES', () => {
      expect(rideService.VALID_BIKE_TYPES).toBeDefined();
      expect(rideService.VALID_BIKE_TYPES).toContain('analog');
      expect(rideService.VALID_BIKE_TYPES).toContain('ebike');
      expect(rideService.VALID_BIKE_TYPES).toContain('cargo');
      expect(rideService.VALID_BIKE_TYPES).toContain('folding');
    });
  });
});
