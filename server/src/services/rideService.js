const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { findNearbyDrivers, triggerDriverNotification } = require('./dispatchService');
const { ensureRidePaymentIntent, captureRidePayment } = require('./paymentService');
const { logRideEvent, logRideToAirtable, updateRideInAirtable } = require('./analyticsService');
const smsService = require('./smsService');
const rideEvents = require('../utils/rideEvents');
const serializeRide = require('../utils/serializeRide');

function calculatePrice(distanceMiles) {
  // Flat rate: $50 for all rides regardless of distance
  return 5000;
}

async function requestRide({ riderId, pickup, dropoff, bikeType, notes }) {
  // Get rider's phone number for denormalized storage
  const rider = await User.findById(riderId);

  const distanceMiles = estimateDistanceMiles(pickup, dropoff);
  const priceCents = calculatePrice(distanceMiles);
  const ride = await Ride.create({
    rider: riderId,
    riderPhone: rider?.phoneNumber || null,
    pickup,
    dropoff,
    bikeType,
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

async function updateRideStatus({ rideId, status, driverEtaMinutes, driverId }) {
  const ride = await Ride.findById(rideId)
    .populate({ path: 'driver', populate: 'user' })
    .populate('rider');

  if (!ride) {
    throw new Error('Ride not found');
  }

  ride.status = status;
  if (driverEtaMinutes !== undefined) {
    ride.driverEtaMinutes = driverEtaMinutes;
  }
  if (driverId !== undefined) {
    ride.driver = driverId;
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
    if (!ride.wtpAsked && ride.rider?.phoneNumber && ride.dropoff?.address) {
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
  getRideById
};
