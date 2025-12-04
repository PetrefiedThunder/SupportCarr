const driverRepository = require('../db/driverRepository');

async function upsertDriver({ userId, vehicleType, vehicleDescription }) {
  return driverRepository.upsertDriver({ userId, vehicleType, vehicleDescription });
}

async function updateDriverStatus({ driverId, active, currentLocation }) {
  const driver = await driverRepository.findById(driverId);
  if (!driver) {
    throw new Error('Driver not found');
  }

  const activeState = typeof active === 'boolean' ? active : driver.active;
  const updated = await driverRepository.updateDriverStatusAndLocation({
    driverId,
    active: activeState,
    location: currentLocation
  });

  return updated;
}

async function listAllDrivers() {
  return driverRepository.listAllWithUsers();
}

module.exports = {
  upsertDriver,
  updateDriverStatus,
  listAllDrivers
};
