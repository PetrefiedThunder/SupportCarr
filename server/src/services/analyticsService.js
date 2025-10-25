require('dotenv').config();

const Airtable = require('airtable');
const logger = require('../config/logger');

const airtableTableName = process.env.AIRTABLE_RIDES_TABLE || 'RideEvents';
let airtableBase = null;

function getAirtableBase() {
  if (airtableBase !== null) {
    return airtableBase;
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    logger.warn('Airtable analytics not configured; ride events will not be persisted');
    airtableBase = undefined;
    return airtableBase;
  }

  airtableBase = new Airtable({ apiKey }).base(baseId);
  return airtableBase;
}

async function logRideEvent(event) {
  const base = getAirtableBase();

  if (!base) {
    logger.debug('Skipping analytics log because Airtable is not configured', {
      eventType: event?.type
    });
    return;
  }

  try {
    const fields = {
      EventType: event.type,
      RideId: event.rideId || null,
      DriverId: event.driverId || null,
      PayloadJson: JSON.stringify(event)
    };

    await base(airtableTableName).create(
      [
        {
          fields
        }
      ],
      { typecast: true }
    );
  } catch (error) {
    logger.error('Failed to record ride analytics event', {
      eventType: event.type,
      error: error.message
    });
  }
}

function __setAirtableBase(base) {
  airtableBase = base;
}

module.exports = {
  logRideEvent,
  __setAirtableBase
};
