const rideService = require('../services/rideService');
const rideEvents = require('../utils/rideEvents');
const serializeRide = require('../utils/serializeRide');

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
    // IDOR protection: verify driver is authorized to update this ride
    if (req.user.role !== 'admin') {
      const existingRide = await rideService.getRideById(req.params.rideId);

      if (!existingRide) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      // Driver can update if:
      // 1. Ride is unassigned (status='requested') and they're accepting it
      // 2. Ride is already assigned to them
      const Driver = require('../models/Driver');
      const driver = await Driver.findOne({ user: req.user.sub });

      if (!driver) {
        return res.status(403).json({ message: 'Driver profile required' });
      }

      const isAssignedToDriver = existingRide.driver?.toString() === driver.id;
      const isAcceptingUnassignedRide = existingRide.status === 'requested' && !existingRide.driver;

      if (!isAssignedToDriver && !isAcceptingUnassignedRide) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const ride = await rideService.updateRideStatus({
      rideId: req.params.rideId,
      status: req.body.status,
      driverEtaMinutes: req.body.driverEtaMinutes,
      driverId: req.body.driverId,
      cancellationReason: req.body.cancellationReason,
      assistRequired: req.body.assistRequired,
      assistReason: req.body.assistReason
    });
    res.json(ride);
  } catch (error) {
    next(error);
  }
}

async function streamRide(req, res, next) {
  try {
    const ride = await rideService.getRideById(req.params.rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const userId = req.user.sub;
    const isParticipant =
      ride.rider?.toString() === userId ||
      ride.driver?.user?.toString() === userId ||
      req.user.role === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('snapshot', serializeRide(ride));

    const onRideEvent = (payload) => {
      if (payload.rideId !== ride.id) {
        return;
      }
      sendEvent('status', payload.ride);
    };

    rideEvents.on('ride-status', onRideEvent);

    const keepAlive = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      rideEvents.off('ride-status', onRideEvent);
    });
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
    const requestedDriverId = req.params.driverId;

    // IDOR protection: verify requester owns this driver record or is admin
    if (req.user.role !== 'admin') {
      const Driver = require('../models/Driver');
      const driver = await Driver.findById(requestedDriverId);

      if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
      }

      if (driver.user.toString() !== req.user.sub) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const rides = await rideService.listActiveRidesForDriver(requestedDriverId);
    res.json(rides);
  } catch (error) {
    next(error);
  }
}

async function pollRide(req, res, next) {
  try {
    const ride = await rideService.getRideById(req.params.rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const userId = req.user.sub;
    const isParticipant =
      ride.rider?.toString() === userId ||
      ride.driver?.user?.toString() === userId ||
      req.user.role === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(serializeRide(ride));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRide,
  updateRide,
  listUserRides,
  listDriverRides,
  streamRide,
  pollRide
};
