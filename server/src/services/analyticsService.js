const logger = require('../config/logger');

async function logRideEvent(event) {
  logger.info('Airtable log placeholder', event);
}

module.exports = {
  logRideEvent
};
