const rideService = require('../services/rideService');

async function createRide(req, res, next) {
  try {
    const ride = await rideService.requestRide({
      riderId: req.user.sub,
      pickup: req.body.pickup,
      dropoff: req.body.dropoff,
      bikeType: req.body.bikeType,
      notes: req.body.notes
    });

    res.status(201).json(ride);
  } catch (error) {
    next(error);
  }
}

async function updateRide(req, res, next) {
  try {
    const ride = await rideService.updateRideStatus({
      rideId: req.params.rideId,
      status: req.body.status
    });
    res.json(ride);
  } catch (error) {
    next(error);
  }
}

async function listUserRides(req, res, next) {
  try {
    const rides = await rideService.listRidesForUser(req.user.sub);
    res.json(rides);
  } catch (error) {
    next(error);
  }
}

async function listDriverRides(req, res, next) {
  try {
    const rides = await rideService.listActiveRidesForDriver(req.params.driverId);
    res.json(rides);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRide,
  updateRide,
  listUserRides,
  listDriverRides
};
