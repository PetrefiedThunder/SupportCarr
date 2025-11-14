require('dotenv').config();

const twilio = require('twilio');
const logger = require('../config/logger');
const { logSmsToAirtable } = require('./analyticsService');

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient !== null) {
    return twilioClient;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    logger.warn('Twilio not configured; SMS messages will not be sent');
    twilioClient = undefined;
    return twilioClient;
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

/**
 * Send an SMS via Twilio and log it to Airtable
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (E.164 format)
 * @param {string} params.body - Message body
 * @param {string} params.templateId - Template identifier (e.g., 'R6_COMPLETE_WTP')
 * @param {string} params.rideId - Associated ride ID for linking in Airtable
 * @returns {Promise<Object>} Twilio message object or null if not configured
 */
async function sendSms({ to, body, templateId = null, rideId = null }) {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!client || !fromNumber) {
    logger.warn('Skipping SMS send because Twilio is not configured', {
      to,
      templateId
    });
    return null;
  }

  try {
    const message = await client.messages.create({
      from: fromNumber,
      to,
      body
    });

    logger.info('SMS sent successfully', {
      to,
      templateId,
      messageSid: message.sid,
      status: message.status
    });

    // Log outbound SMS to Airtable
    await logSmsToAirtable({
      rideId,
      direction: 'Outbound',
      to,
      from: fromNumber,
      body,
      templateId,
      deliveryStatus: 'Sent'
    });

    return message;
  } catch (error) {
    logger.error('Failed to send SMS', {
      to,
      templateId,
      error: error.message
    });

    // Log failed SMS to Airtable
    await logSmsToAirtable({
      rideId,
      direction: 'Outbound',
      to,
      from: fromNumber,
      body,
      templateId,
      deliveryStatus: 'Failed'
    });

    throw error;
  }
}

/**
 * Send WTP (Willingness To Pay) SMS after ride completion
 * @param {Object} params
 * @param {string} params.riderPhone - Rider's phone number (E.164)
 * @param {string} params.dropoffAddress - Drop-off address
 * @param {string} params.rideId - Ride ID
 */
async function sendWtpSms({ riderPhone, dropoffAddress, rideId }) {
  const body = `SupportCarr: Your bike rescue is complete and the bike was dropped at ${dropoffAddress}. This is a free pilot. If this service cost $25 in the future, would you pay for it? Reply YES or NO.`;

  return sendSms({
    to: riderPhone,
    body,
    templateId: 'R6_COMPLETE_WTP',
    rideId
  });
}

function __setTwilioClient(client) {
  twilioClient = client;
}

module.exports = {
  sendSms,
  sendWtpSms,
  __setTwilioClient
};
