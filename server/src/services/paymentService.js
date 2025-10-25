const logger = require('../config/logger');

async function simulateCharge({ ride, amountCents }) {
  logger.info('Stripe Connect charge simulated', {
    rideId: ride.id,
    amountCents,
    driverShare: Math.round(amountCents * 0.75),
    platformShare: Math.round(amountCents * 0.25)
  });
  return {
    id: `ch_${ride.id}`,
    status: 'succeeded'
  };
}

module.exports = {
  simulateCharge
};
