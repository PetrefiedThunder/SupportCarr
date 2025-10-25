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

  if (typeof active === 'boolean') {
    driver.active = active;
  }

  if (currentLocation) {
    driver.currentLocation = currentLocation;
    if (active) {
      await storeDriverLocation(driver.id, currentLocation);
    }
  }

  await driver.save();
  return driver;
}

module.exports = {
  upsertDriver,
  updateDriverStatus
};
