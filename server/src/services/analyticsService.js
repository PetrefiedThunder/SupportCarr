require('dotenv').config();

const Airtable = require('airtable');
const logger = require('../config/logger');
const { mapStatusToAirtable } = require('../utils/airtableStatusMapper');

const airtableRidesTableName = process.env.AIRTABLE_RIDES_TABLE || 'Rides';
const airtableSmsLogsTableName = process.env.AIRTABLE_SMS_LOGS_TABLE || 'SMS Logs';
const AIRTABLE_TIMEOUT_MS = 10000; // 10 second timeout
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second

let airtableBase = null;
const smsLogCache = new Set(); // Cache for SMS message SIDs to prevent duplicates

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

/**
 * Execute an Airtable operation with timeout and exponential backoff retry
 * @param {Function} operation - Async function to execute
 * @param {string} operationName - Name for logging
 * @returns {Promise<any>} Result of the operation
 */
async function withRetry(operation, operationName) {
  let lastError;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Airtable operation timeout')), AIRTABLE_TIMEOUT_MS)
      );
      
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt < MAX_RETRIES - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`${operationName} failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
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

    await withRetry(
      async () => base(airtableRidesTableName).create([{ fields }], { typecast: true }),
      'logRideEvent'
    );
  } catch (error) {
    logger.error('Failed to record ride analytics event', {
      eventType: event.type,
      error: error.message
    });
  }
}

/**
 * Log a ride to the Rides table in Airtable
 * @param {Object} ride - Mongoose Ride object
 */
async function logRideToAirtable(ride) {
  const base = getAirtableBase();

  if (!base) {
    logger.debug('Skipping Airtable Rides log because Airtable is not configured');
    return;
  }

  try {
    const fields = {
      'Ride ID': ride._id.toString(),
      'Rider phone (E.164)': ride.rider?.phoneNumber || null,
      'Pickup address (normalized)': ride.pickup?.address || null,
      'Drop-off address (normalized)': ride.dropoff?.address || null,
      'Ride status': mapStatusToAirtable(ride.status, ride.cancellationReason),
      'Dispatched at': ride.status === 'accepted' ? new Date().toISOString() : null,
      'Completed at': ride.status === 'completed' ? new Date().toISOString() : null,
      'WTP asked?': ride.wtpAsked || false,
      'WTP response': ride.wtpResponse || null,
      'WTP amount (USD)': ride.wtpAmountUsd || null
    };

    await withRetry(
      async () => base(airtableRidesTableName).create([{ fields }], { typecast: true }),
      'logRideToAirtable'
    );

    logger.info('Ride logged to Airtable', { rideId: ride._id });
  } catch (error) {
    logger.error('Failed to log ride to Airtable', {
      rideId: ride._id,
      error: error.message
    });
  }
}

/**
 * Update a ride in the Rides table in Airtable
 * @param {string} rideId - MongoDB Ride ID
 * @param {Object} updates - Fields to update
 */
async function updateRideInAirtable(rideId, updates) {
  const base = getAirtableBase();

  if (!base) {
    logger.debug('Skipping Airtable Rides update because Airtable is not configured');
    return;
  }

  try {
    await withRetry(async () => {
      // First, find the record by Ride ID
      const records = await base(airtableRidesTableName)
        .select({
          filterByFormula: `{Ride ID} = "${rideId}"`,
          maxRecords: 1
        })
        .firstPage();

      if (records.length === 0) {
        logger.warn('Ride not found in Airtable for update', { rideId });
        return;
      }

      const recordId = records[0].id;

      await base(airtableRidesTableName).update([
        {
          id: recordId,
          fields: updates
        }
      ]);

      logger.info('Ride updated in Airtable', { rideId, recordId });
    }, 'updateRideInAirtable');
  } catch (error) {
    logger.error('Failed to update ride in Airtable', {
      rideId,
      error: error.message
    });
  }
}

/**
 * Log an SMS to the SMS Logs table in Airtable
 * Idempotent based on Twilio message SID if provided in templateId
 * @param {Object} sms
 * @param {string} sms.rideId - Associated ride ID
 * @param {string} sms.direction - 'Inbound' or 'Outbound'
 * @param {string} sms.to - To phone number
 * @param {string} sms.from - From phone number
 * @param {string} sms.body - Message body
 * @param {string} sms.templateId - Template identifier or Twilio message SID (optional)
 * @param {string} sms.deliveryStatus - 'Queued', 'Sent', 'Delivered', 'Failed'
 * @param {string} sms.messageSid - Twilio message SID for idempotency (optional)
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
  const base = getAirtableBase();

  if (!base) {
    logger.debug('Skipping Airtable SMS log because Airtable is not configured');
    return;
  }

  // Check for duplicate based on messageSid (idempotency)
  if (messageSid && smsLogCache.has(messageSid)) {
    logger.debug('SMS already logged to Airtable (duplicate detected)', { messageSid });
    return;
  }

  try {
    const fields = {
      Direction: direction,
      'To (phone)': to,
      'From (phone)': from,
      Body: body,
      'Template ID': templateId,
      'Sent/received at': new Date().toISOString(),
      'Delivery status': deliveryStatus
    };

    // Add message SID if provided
    if (messageSid) {
      fields['Message SID'] = messageSid;
    }

    await withRetry(async () => {
      // Link to ride if rideId is provided
      if (rideId) {
        // Find the Airtable record ID for this ride
        const rideRecords = await base(airtableRidesTableName)
          .select({
            filterByFormula: `{Ride ID} = "${rideId}"`,
            maxRecords: 1
          })
          .firstPage();

        if (rideRecords.length > 0) {
          fields.Ride = [rideRecords[0].id];
        }
      }

      await base(airtableSmsLogsTableName).create([{ fields }], { typecast: true });
    }, 'logSmsToAirtable');

    // Mark as logged for idempotency
    if (messageSid) {
      smsLogCache.add(messageSid);
      // Cleanup cache after 1 hour to prevent memory leaks
      setTimeout(() => smsLogCache.delete(messageSid), 3600000);
    }

    logger.info('SMS logged to Airtable', { direction, to, templateId, messageSid });
  } catch (error) {
    logger.error('Failed to log SMS to Airtable', {
      direction,
      to,
      error: error.message
    });
  }
}

function __setAirtableBase(base) {
  airtableBase = base;
}

module.exports = {
  logRideEvent,
  logRideToAirtable,
  updateRideInAirtable,
  logSmsToAirtable,
  __setAirtableBase
};
