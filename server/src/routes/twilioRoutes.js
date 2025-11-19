const express = require('express');
const twilio = require('twilio');
const Ride = require('../models/Ride');
const { logSmsToAirtable, updateRideInAirtable } = require('../services/analyticsService');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Middleware to verify Twilio request signature
 * Prevents spoofed requests from corrupting WTP data
 */
function verifyTwilioSignature(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // If Twilio is not configured, allow requests (dev/test scenarios)
  if (!authToken) {
    logger.warn('Twilio signature verification skipped - TWILIO_AUTH_TOKEN not set');
    return next();
  }

  // SECURITY: Only skip verification in test environment AND when not in production
  // This prevents accidental bypass if NODE_ENV is misconfigured in production
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  if (isTest && !isProduction) {
    logger.debug('Twilio signature verification skipped - test mode');
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  // Validate signature
  const isValid = twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    req.body
  );

  if (!isValid) {
    logger.error('Invalid Twilio signature', {
      url,
      // Mask signature for security (log only first 6 chars)
      signature: twilioSignature ? `${twilioSignature.slice(0, Math.min(6, twilioSignature.length))}...` : null
    });
    // Return empty TwiML response but don't process the request
    return res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }

  next();
}

/**
 * Twilio inbound SMS webhook
 * Handles incoming SMS messages from riders (primarily WTP responses)
 */
router.post('/inbound', express.urlencoded({ extended: false }), verifyTwilioSignature, async (req, res) => {
  try {
    const fromPhone = req.body.From; // E.164 format
    const toPhone = req.body.To;
    const bodyRaw = req.body.Body || '';

    const body = bodyRaw.trim();
    const upper = body.toUpperCase();

    logger.info('Inbound SMS received', {
      from: fromPhone,
      to: toPhone,
      body
    });

    // Try to match this SMS to a WTP response and get the ride ID
    const rideId = await handleWtpResponse(fromPhone, body, upper);

    // Log inbound SMS to Airtable with ride link if found
    await logSmsToAirtable({
      rideId: rideId || null,
      direction: 'Inbound',
      to: toPhone,
      from: fromPhone,
      body: bodyRaw,
      templateId: rideId ? 'WTP_REPLY' : null,
      deliveryStatus: 'Delivered'
    });

    // Respond to Twilio with 200 OK (empty TwiML response)
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    logger.error('Error processing inbound SMS', {
      error: error.message,
      stack: error.stack
    });

    // Still return 200 to Twilio to prevent retries
    res.type('text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

/**
 * Handle WTP (Willingness To Pay) response from rider
 * @param {string} fromPhone - Rider's phone number (E.164)
 * @param {string} body - Original message body
 * @param {string} upper - Uppercase version of body
 * @returns {Promise<string|null>} Ride ID if matched, null otherwise
 */
async function handleWtpResponse(fromPhone, body, upper) {
  try {
    // Find the most recent ride for THIS PHONE NUMBER where WTP was asked but not answered
    // Query by riderPhone directly to avoid population and ensure correct matching
    const ride = await Ride.findOne({
      riderPhone: fromPhone,
      wtpAsked: true,
      wtpResponse: null
    })
      .sort({ createdAt: -1 });

    if (!ride) {
      logger.debug('No matching ride found for WTP response', {
        fromPhone
      });
      return null;
    }

    let wtpResponse = null;
    let wtpAmountUsd = null;

    // Parse response
    if (upper === 'YES') {
      wtpResponse = 'YES';
    } else if (upper === 'NO') {
      wtpResponse = 'NO';
    } else {
      // Try to parse as a number
      const numberMatch = body.match(/^\$?(\d+(?:\.\d+)?)$/);
      if (numberMatch) {
        wtpAmountUsd = parseFloat(numberMatch[1]);
        // Implicitly set response to YES if they provided an amount
        wtpResponse = 'YES';
      }
    }

    // Update ride if we got a valid response
    if (wtpResponse || wtpAmountUsd) {
      if (wtpResponse) {
        ride.wtpResponse = wtpResponse;
      }
      if (wtpAmountUsd) {
        ride.wtpAmountUsd = wtpAmountUsd;
      }
      await ride.save();

      logger.info('WTP response recorded', {
        rideId: ride._id,
        fromPhone,
        wtpResponse,
        wtpAmountUsd
      });

      // Update Airtable
      const updates = {};
      if (wtpResponse) {
        updates['WTP response'] = wtpResponse;
      }
      if (wtpAmountUsd) {
        updates['WTP amount (USD)'] = wtpAmountUsd;
      }

      await updateRideInAirtable(ride._id.toString(), updates);

      return ride._id.toString();
    }

    return null;
  } catch (error) {
    logger.error('Error handling WTP response', {
      fromPhone,
      error: error.message
    });
    return null;
  }
}

module.exports = router;
