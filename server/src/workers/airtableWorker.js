const { Worker } = require('bullmq');
const Airtable = require('airtable');
const logger = require('../config/logger');
const { mapStatusToAirtable } = require('../utils/airtableStatusMapper');

const airtableRidesTableName = process.env.AIRTABLE_RIDES_TABLE || 'Rides';
const airtableSmsLogsTableName = process.env.AIRTABLE_SMS_LOGS_TABLE || 'SMS Logs';
const AIRTABLE_TIMEOUT_MS = 10000; // 10 second timeout

let airtableBase = null;
const smsLogCache = new Set(); // Cache for SMS message SIDs to prevent duplicates

function getAirtableBase() {
  if (airtableBase !== null) {
    return airtableBase;
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    logger.warn('Airtable not configured; analytics jobs will be skipped');
    airtableBase = undefined;
    return airtableBase;
  }

  airtableBase = new Airtable({ apiKey }).base(baseId);
  return airtableBase;
}

/**
 * Process a job to log a ride to Airtable
 */
async function processLogRide(job) {
  const base = getAirtableBase();

  if (!base) {
    logger.debug('Skipping Airtable Rides log (not configured)', { jobId: job.id });
    return { skipped: true };
  }

  const { ride } = job.data;

  const fields = {
    'Ride ID': ride._id,
    'Rider phone (E.164)': ride.riderPhone || null,
    'Pickup address (normalized)': ride.pickup?.address || null,
    'Drop-off address (normalized)': ride.dropoff?.address || null,
    'Ride status': mapStatusToAirtable(ride.status, ride.cancellationReason),
    'Dispatched at': ride.status === 'accepted' ? new Date().toISOString() : null,
    'Completed at': ride.status === 'completed' ? new Date().toISOString() : null,
    'WTP asked?': ride.wtpAsked || false,
    'WTP response': ride.wtpResponse || null,
    'WTP amount (USD)': ride.wtpAmountUsd || null
  };

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Airtable operation timeout')), AIRTABLE_TIMEOUT_MS)
  );

  const result = await Promise.race([
    base(airtableRidesTableName).create([{ fields }], { typecast: true }),
    timeoutPromise
  ]);

  logger.info('Ride logged to Airtable via queue', { rideId: ride._id, jobId: job.id });
  return { success: true, recordId: result[0]?.id };
}

/**
 * Process a job to update a ride in Airtable
 */
async function processUpdateRide(job) {
  const base = getAirtableBase();

  if (!base) {
    logger.debug('Skipping Airtable Rides update (not configured)', { jobId: job.id });
    return { skipped: true };
  }

  const { rideId, updates } = job.data;

  // Find the record by Ride ID
  const records = await base(airtableRidesTableName)
    .select({
      filterByFormula: `{Ride ID} = "${rideId}"`,
      maxRecords: 1
    })
    .firstPage();

  if (records.length === 0) {
    logger.warn('Ride not found in Airtable for update', { rideId, jobId: job.id });
    return { notFound: true };
  }

  const recordId = records[0].id;

  await base(airtableRidesTableName).update([
    {
      id: recordId,
      fields: updates
    }
  ]);

  logger.info('Ride updated in Airtable via queue', { rideId, recordId, jobId: job.id });
  return { success: true, recordId };
}

/**
 * Process a job to log SMS to Airtable
 */
async function processLogSms(job) {
  const base = getAirtableBase();

  if (!base) {
    logger.debug('Skipping Airtable SMS log (not configured)', { jobId: job.id });
    return { skipped: true };
  }

  const {
    rideId,
    direction,
    to,
    from,
    body,
    templateId,
    deliveryStatus,
    messageSid
  } = job.data;

  // Check for duplicate based on messageSid (idempotency)
  if (messageSid && smsLogCache.has(messageSid)) {
    logger.debug('SMS already logged (duplicate)', { messageSid, jobId: job.id });
    return { duplicate: true };
  }

  const fields = {
    Direction: direction,
    'To (phone)': to,
    'From (phone)': from,
    Body: body,
    'Template ID': templateId,
    'Sent/received at': new Date().toISOString(),
    'Delivery status': deliveryStatus
  };

  if (messageSid) {
    fields['Message SID'] = messageSid;
  }

  // Link to ride if rideId is provided
  if (rideId) {
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

  const result = await base(airtableSmsLogsTableName).create([{ fields }], { typecast: true });

  // Mark as logged for idempotency
  if (messageSid) {
    smsLogCache.add(messageSid);
    // Cleanup cache after 1 hour
    setTimeout(() => smsLogCache.delete(messageSid), 3600000);
  }

  logger.info('SMS logged to Airtable via queue', { direction, to, templateId, jobId: job.id });
  return { success: true, recordId: result[0]?.id };
}

/**
 * Start the Airtable worker
 */
function startAirtableWorker() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const url = new URL(redisUrl);

  const connection = {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined
  };

  const worker = new Worker(
    'analytics',
    async (job) => {
      logger.debug('Processing analytics job', { jobId: job.id, type: job.name });

      try {
        let result;
        switch (job.name) {
          case 'logRide':
            result = await processLogRide(job);
            break;
          case 'updateRide':
            result = await processUpdateRide(job);
            break;
          case 'logSms':
            result = await processLogSms(job);
            break;
          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }
        return result;
      } catch (error) {
        logger.error('Analytics job failed', {
          jobId: job.id,
          type: job.name,
          error: error.message,
          attempt: job.attemptsMade
        });
        throw error; // Will trigger retry
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000 // per second (respects Airtable rate limits)
      }
    }
  );

  worker.on('completed', (job) => {
    logger.debug('Analytics job completed', { jobId: job.id, type: job.name });
  });

  worker.on('failed', (job, err) => {
    logger.error('Analytics job permanently failed', {
      jobId: job?.id,
      type: job?.name,
      error: err.message
    });
  });

  worker.on('error', (err) => {
    logger.error('Analytics worker error', { error: err.message });
  });

  logger.info('Airtable worker started');
  return worker;
}

module.exports = {
  startAirtableWorker
};
