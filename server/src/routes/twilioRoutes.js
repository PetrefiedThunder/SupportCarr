const express = require('express');
const Ride = require('../models/Ride');
const { logSmsToAirtable, updateRideInAirtable } = require('../services/analyticsService');
const logger = require('../config/logger');

const router = express.Router();

/**
 * Twilio inbound SMS webhook
 * Handles incoming SMS messages from riders (primarily WTP responses)
 */
router.post('/inbound', express.urlencoded({ extended: false }), async (req, res) => {
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

    // Log inbound SMS to Airtable
    await logSmsToAirtable({
      rideId: null, // Will be linked later if we find a matching ride
      direction: 'Inbound',
      to: toPhone,
      from: fromPhone,
      body: bodyRaw,
      templateId: null,
      deliveryStatus: 'Delivered'
    });

    // Try to match this SMS to a WTP response
    await handleWtpResponse(fromPhone, body, upper);

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
 */
async function handleWtpResponse(fromPhone, body, upper) {
  try {
    // Find the most recent ride for this phone number where WTP was asked
    const ride = await Ride.findOne({
      wtpAsked: true,
      wtpResponse: null
    })
      .populate('rider')
      .sort({ createdAt: -1 });

    // Check if rider phone matches
    if (!ride || ride.rider?.phoneNumber !== fromPhone) {
      logger.debug('No matching ride found for WTP response', {
        fromPhone
      });
      return;
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
    }
  } catch (error) {
    logger.error('Error handling WTP response', {
      fromPhone,
      error: error.message
    });
  }
}

module.exports = router;
