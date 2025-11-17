const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { findNearbyDrivers, triggerDriverNotification } = require('./dispatchService');
const { ensureRidePaymentIntent, captureRidePayment } = require('./paymentService');
const { logRideEvent, updateRideInAirtable } = require('./analyticsService');
const smsService = require('./smsService');
const rideEvents = require('../utils/rideEvents');
const serializeRide = require('../utils/serializeRide');

// Finite state machine for ride status transitions
const VALID_STATUS_TRANSITIONS = {
  requested: ['accepted', 'cancelled'],
  accepted: ['en_route', 'cancelled'],
  en_route: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [] // Terminal state
};

const VALID_BIKE_TYPES = ['analog', 'ebike', 'cargo', 'folding'];

/**
 * Validate if a status transition is allowed
 * @param {string} currentStatus - Current ride status
 * @param {string} newStatus - Desired new status
 * @throws {Error} If transition is not valid
 */
function validateStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions) {
    throw new Error(`Invalid current status: ${currentStatus}`);
  }
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
      `Allowed transitions: ${allowedTransitions.join(', ') || 'none (terminal state)'}`
    );
  }
}

/**
 * Validate location coordinates
 * @param {Object} location - Location object with lat/lng
 * @param {string} fieldName - Name of the field for error messages
 * @throws {Error} If coordinates are invalid
 */
function validateLocation(location, fieldName) {
  if (!location || typeof location !== 'object') {
    throw new Error(`${fieldName} must be an object`);
  }
  if (typeof location.lat !== 'number' || location.lat < -90 || location.lat > 90) {
    throw new Error(`${fieldName}.lat must be a number between -90 and 90`);
  }
  if (typeof location.lng !== 'number' || location.lng < -180 || location.lng > 180) {
    throw new Error(`${fieldName}.lng must be a number between -180 and 180`);
  }
}

function calculatePrice() {
  // Flat rate: $50 for all rides regardless of distance
  return 5000;
}

async function requestRide({ riderId, pickup, dropoff, bikeType, notes }) {
  // Input validation
  if (!riderId) {
    throw new Error('riderId is required');
  }
  
  validateLocation(pickup, 'pickup');
  validateLocation(dropoff, 'dropoff');
  
  if (bikeType && !VALID_BIKE_TYPES.includes(bikeType)) {
    throw new Error(`Invalid bikeType. Must be one of: ${VALID_BIKE_TYPES.join(', ')}`);
  }

  // Get rider's phone number for denormalized storage
  const rider = await User.findById(riderId);
  if (!rider) {
    throw new Error('Rider not found');
  }

  // Ensure riderPhone is always set
  if (!rider.phoneNumber) {
    throw new Error('Rider must have a phone number');
  }

  const distanceMiles = estimateDistanceMiles(pickup, dropoff);
  
  // Enforce 10-mile pilot program limit
  if (distanceMiles > 10.0) {
    throw new Error('Trip exceeds pilot 10-mile limit');
  }
  
  const priceCents = calculatePrice();
  const ride = await Ride.create({
    rider: riderId,
    riderPhone: rider.phoneNumber,
    pickup,
    dropoff,
    bikeType: bikeType || 'analog',
    status: 'requested',
    distanceMiles,
    priceCents,
    notes
  });

  await ensureRidePaymentIntent({ ride, amountCents: priceCents });

  await logRideEvent({ type: 'ride_requested', rideId: ride.id });
  await attemptAutoAssignDriver(ride);

  return ride;
}

function estimateDistanceMiles(pickup, dropoff) {
  if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) {
    return 2;
  }

  // Use Haversine formula for accurate great-circle distance
  const R = 3959; // Earth's radius in miles
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const lat1 = toRadians(pickup.lat);
  const lat2 = toRadians(dropoff.lat);
  const deltaLat = toRadians(dropoff.lat - pickup.lat);
  const deltaLng = toRadians(dropoff.lng - pickup.lng);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.max(1, distance);
}

async function attemptAutoAssignDriver(ride) {
  const candidates = await findNearbyDrivers({
    lat: ride.pickup.lat,
    lng: ride.pickup.lng,
    radiusMiles: 15
  });

  if (!candidates.length) {
    return ride;
  }

  const driver = await Driver.findById(candidates[0]).populate('user');
  if (!driver) {
    return ride;
  }

  ride.driver = driver.id;
  ride.status = 'accepted';
  await ride.save();

  await triggerDriverNotification(driver, ride);
  await logRideEvent({ type: 'ride_assigned', rideId: ride.id, driverId: driver.id });

  return ride;
}

async function updateRideStatus({ rideId, status, driverEtaMinutes, driverId, cancellationReason, assistRequired, assistReason }) {
  // Input validation
  if (!rideId) {
    throw new Error('rideId is required');
  }
  if (!status) {
    throw new Error('status is required');
  }

  const ride = await Ride.findById(rideId)
    .populate({ path: 'driver', populate: 'user' })
    .populate('rider');

  if (!ride) {
    throw new Error('Ride not found');
  }

  // Validate status transition using FSM
  if (status !== ride.status) {
    validateStatusTransition(ride.status, status);
  }

  ride.status = status;
  if (driverEtaMinutes !== undefined) {
    if (typeof driverEtaMinutes !== 'number' || driverEtaMinutes < 0) {
      throw new Error('driverEtaMinutes must be a non-negative number');
    }
    ride.driverEtaMinutes = driverEtaMinutes;
  }
  if (driverId !== undefined) {
    ride.driver = driverId;
  }
  if (cancellationReason !== undefined) {
    ride.cancellationReason = cancellationReason;
  }
  if (assistRequired !== undefined) {
    ride.assistRequired = assistRequired;
  }
  if (assistReason !== undefined) {
    ride.assistReason = assistReason;
  }
  await ride.save();
  await logRideEvent({ type: 'ride_status_updated', rideId: ride.id, status });

  if (status === 'completed') {
    await captureRidePayment({ ride });
    await logRideEvent({
      type: 'ride_completed',
      rideId: ride.id,
      paymentIntentId: ride.paymentIntentId,
      paymentChargeId: ride.paymentChargeId,
      paymentStatus: ride.paymentStatus
    });

    // Send WTP SMS if not already asked
    // Note: wtpAsked might be undefined for old rides, so we check for both undefined and false
    const shouldSendWtp = !ride.wtpAsked && ride.rider?.phoneNumber && ride.dropoff?.address;
    
    if (shouldSendWtp) {
      try {
        await smsService.sendWtpSms({
          riderPhone: ride.rider.phoneNumber,
          dropoffAddress: ride.dropoff.address,
          rideId: ride._id.toString()
        });

        // Mark WTP as asked
        ride.wtpAsked = true;
        await ride.save();

        // Update Airtable
        await updateRideInAirtable(ride._id.toString(), {
          'WTP asked?': true,
          'Completed at': new Date().toISOString()
        });
      } catch (error) {
        // Log error but don't fail the ride completion
        console.error('Failed to send WTP SMS:', error);
      }
    }
  }

  const serializedRide = serializeRide(ride);
  rideEvents.emit('ride-status', {
    rideId: ride.id,
    status,
    ride: serializedRide
  });

  return ride;
}

async function listRidesForUser(userId) {
  return Ride.find({ rider: userId }).sort({ createdAt: -1 });
}

async function listActiveRidesForDriver(driverId) {
  return Ride.find({ driver: driverId, status: { $in: ['accepted', 'en_route'] } }).sort({ createdAt: -1 });
}

async function getRideById(rideId) {
  return Ride.findById(rideId).populate({ path: 'driver', populate: 'user' });
}

module.exports = {
  requestRide,
  updateRideStatus,
  listRidesForUser,
  listActiveRidesForDriver,
  attemptAutoAssignDriver,
  getRideById,
  // Export validation functions for testing
  validateStatusTransition,
  validateLocation,
  VALID_STATUS_TRANSITIONS,
  VALID_BIKE_TYPES
};
