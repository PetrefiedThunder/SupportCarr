require('dotenv').config();

const logger = require('../config/logger');
const { getAnalyticsQueue } = require('../config/queue');

/**
 * ARCHITECTURE: Airtable operations are now async via BullMQ queue
 * This prevents API latency and rate-limit crashes from blocking request responses
 */

async function logRideEvent(event) {
  try {
    const queue = await getAnalyticsQueue();
    await queue.add('logRide', { event });
    logger.debug('Ride event queued for Airtable', { eventType: event.type });
  } catch (error) {
    logger.error('Failed to queue ride event', {
      eventType: event?.type,
      error: error.message
    });
  }
}

/**
 * Log a ride to the Rides table in Airtable (async via queue)
 * @param {Object} ride - Mongoose Ride object (will be serialized)
 */
async function logRideToAirtable(ride) {
  try {
    const queue = await getAnalyticsQueue();

    // Serialize ride object to plain data (strip Mongoose methods)
    const rideData = {
      _id: ride._id.toString(),
      riderPhone: ride.riderPhone,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      status: ride.status,
      cancellationReason: ride.cancellationReason,
      wtpAsked: ride.wtpAsked,
      wtpResponse: ride.wtpResponse,
      wtpAmountUsd: ride.wtpAmountUsd
    };

    await queue.add('logRide', { ride: rideData });
    logger.debug('Ride log queued for Airtable', { rideId: ride._id });
  } catch (error) {
    logger.error('Failed to queue ride log', {
      rideId: ride._id,
      error: error.message
    });
  }
}

/**
 * Update a ride in the Rides table in Airtable (async via queue)
 * @param {string} rideId - MongoDB Ride ID
 * @param {Object} updates - Fields to update
 */
async function updateRideInAirtable(rideId, updates) {
  try {
    const queue = await getAnalyticsQueue();
    await queue.add('updateRide', { rideId, updates });
    logger.debug('Ride update queued for Airtable', { rideId });
  } catch (error) {
    logger.error('Failed to queue ride update', {
      rideId,
      error: error.message
    });
  }
}

/**
 * Log an SMS to the SMS Logs table in Airtable (async via queue)
 * @param {Object} sms - SMS data to log
 */
async function logSmsToAirtable({
  rideId,
  direction,
  to,
  from,
  body,
  templateId = null,
  deliveryStatus = 'Sent',
  messageSid = null
}) {
  try {
    const queue = await getAnalyticsQueue();
    await queue.add('logSms', {
      rideId,
      direction,
      to,
      from,
      body,
      templateId,
      deliveryStatus,
      messageSid
    });
    logger.debug('SMS log queued for Airtable', { direction, to, templateId });
  } catch (error) {
    logger.error('Failed to queue SMS log', {
      direction,
      to,
      error: error.message
    });
  }
}

// Test helper - setter for Airtable base (used in tests)
function __setAirtableBase(base) {
  // No-op: Airtable base is now managed by the worker
  logger.debug('__setAirtableBase called (no-op in queue-based architecture)');
}

module.exports = {
  logRideEvent,
  logRideToAirtable,
  updateRideInAirtable,
  logSmsToAirtable,
  __setAirtableBase
};
