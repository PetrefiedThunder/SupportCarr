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
    const driver = await driverService.updateDriverStatus({
      driverId: req.params.driverId,
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
