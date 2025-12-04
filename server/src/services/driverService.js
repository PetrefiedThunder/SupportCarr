const Driver = require('../models/Driver');
const { storeDriverLocation } = require('./dispatchService');

async function upsertDriver({ userId, vehicleType, vehicleDescription }) {
  const driver = await Driver.findOneAndUpdate(
    { user: userId },
    { vehicleType, vehicleDescription },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return driver;
}

async function updateDriverStatus({ driverId, active, currentLocation }) {
  const driver = await Driver.findById(driverId);
  if (!driver) {
    throw new Error('Driver not found');
  }

  const activeState = typeof active === 'boolean' ? active : driver.active;

  if (typeof active === 'boolean') {
    driver.active = active;
  }

  if (currentLocation) {
    driver.currentLocation = currentLocation;
    await storeDriverLocation(driver.id, currentLocation, activeState);
  } else if (typeof active === 'boolean' && driver.currentLocation) {
    // Ensure PostGIS availability mirrors the driver's active toggle
    await storeDriverLocation(driver.id, driver.currentLocation, activeState);
  }

  await driver.save();
  return driver;
}

async function listAllDrivers() {
  return Driver.find().populate('user', 'name email');
}

module.exports = {
  upsertDriver,
  updateDriverStatus,
  listAllDrivers
};
