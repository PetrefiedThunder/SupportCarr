const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const { findNearbyDrivers, triggerDriverNotification } = require('./dispatchService');
const { simulateCharge } = require('./paymentService');
const { logRideEvent } = require('./analyticsService');
const rideEvents = require('../utils/rideEvents');
const serializeRide = require('../utils/serializeRide');

function calculatePrice(distanceMiles) {
  if (distanceMiles <= 3) return 3900;
  if (distanceMiles <= 7) return 5900;
  return 7900;
}

async function requestRide({ riderId, pickup, dropoff, bikeType, notes }) {
  const distanceMiles = estimateDistanceMiles(pickup, dropoff);
  const priceCents = calculatePrice(distanceMiles);
  const ride = await Ride.create({
    rider: riderId,
    pickup,
    dropoff,
    bikeType,
    status: 'requested',
    distanceMiles,
    priceCents,
    notes
  });

  await logRideEvent({ type: 'ride_requested', rideId: ride.id });
  await attemptAutoAssignDriver(ride);

  return ride;
}

function estimateDistanceMiles(pickup, dropoff) {
  if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) {
    return 2;
  }

  const dx = pickup.lat - dropoff.lat;
  const dy = pickup.lng - dropoff.lng;
  return Math.max(1, Math.sqrt(dx * dx + dy * dy) * 69);
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

async function updateRideStatus({ rideId, status, driverEtaMinutes }) {
  const ride = await Ride.findById(rideId).populate({ path: 'driver', populate: 'user' });
  if (!ride) {
    throw new Error('Ride not found');
  }

  ride.status = status;
  if (driverEtaMinutes !== undefined) {
    ride.driverEtaMinutes = driverEtaMinutes;
  }
  await ride.save();
  await logRideEvent({ type: 'ride_status_updated', rideId: ride.id, status });

  if (status === 'completed') {
    await simulateCharge({ ride, amountCents: ride.priceCents });
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
