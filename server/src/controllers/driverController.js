const driverService = require('../services/driverService');

async function upsertDriver(req, res, next) {
  try {
    const driver = await driverService.upsertDriver({
      userId: req.user.sub,
      vehicleType: req.body.vehicleType,
      vehicleDescription: req.body.vehicleDescription
    });
    res.status(201).json(driver);
  } catch (error) {
    next(error);
  }
}

async function updateDriver(req, res, next) {
  try {
    const requestedDriverId = req.params.driverId;

    // IDOR protection: verify requester owns this driver record or is admin
    if (req.user.role !== 'admin') {
      const { findById } = require('../db/driverRepository');
      const existingDriver = await findById(requestedDriverId);

      if (!existingDriver) {
        return res.status(404).json({ message: 'Driver not found' });
      }

      if (existingDriver.userId?.toString() !== req.user.sub) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const driver = await driverService.updateDriverStatus({
      driverId: requestedDriverId,
      active: req.body.active,
      currentLocation: req.body.currentLocation
    });
    res.json(driver);
  } catch (error) {
    next(error);
  }
}

async function listAllDrivers(req, res, next) {
  try {
    const drivers = await driverService.listAllDrivers();
    res.json(drivers);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  upsertDriver,
  updateDriver,
  listAllDrivers
};
