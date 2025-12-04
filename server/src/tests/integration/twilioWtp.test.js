process.env.STRIPE_SECRET_KEY = 'sk_test_mocked';
process.env.AIRTABLE_API_KEY = 'key_mocked';
process.env.AIRTABLE_BASE_ID = 'base_mocked';
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
process.env.NODE_ENV = 'test'; // Skip signature verification in tests

const request = require('supertest');
const express = require('express');
const Ride = require('../../models/Ride');
const User = require('../../models/User');
const analyticsService = require('../../services/analyticsService');
const twilioRoutes = require('../../routes/twilioRoutes');

describe('Twilio WTP webhook', () => {
  let app;
  let airtableBase;
  let airtableCreate;
  let airtableSelect;
  let airtableUpdate;

  beforeEach(() => {
    // Setup Express app with Twilio routes
    app = express();
    app.use('/twilio', twilioRoutes);

    // Mock Airtable
    airtableCreate = jest.fn().mockResolvedValue([{ id: 'rec_test' }]);
    airtableSelect = jest.fn().mockReturnValue({
      firstPage: jest.fn().mockResolvedValue([{ id: 'rec_test' }])
    });
    airtableUpdate = jest.fn().mockResolvedValue();
    airtableBase = jest.fn(() => ({
      create: airtableCreate,
      select: airtableSelect,
      update: airtableUpdate
    }));
    analyticsService.__setAirtableBase(airtableBase);
  });

  afterEach(() => {
    analyticsService.__setAirtableBase(null);
    jest.clearAllMocks();
  });

  describe('POST /twilio/inbound', () => {
    let rider;
    let ride;

    beforeEach(async () => {
      rider = await User.create({
        email: 'rider@test.com',
        passwordHash: 'test',
        name: 'Test Rider',
        phoneNumber: '+13105551234',
        role: 'rider'
      });

      ride = await Ride.create({
        rider: rider._id,
        riderPhone: rider.phoneNumber,
        pickup: { lat: 34.0, lng: -118.0, address: '123 Main St' },
        dropoff: { lat: 34.1, lng: -118.1, address: '456 Oak Ave' },
        bikeType: 'bike',
        status: 'completed',
        distanceMiles: 5,
        priceCents: 5000,
        wtpAsked: true,
        wtpResponse: null
      });
    });

    it('handles YES response', async () => {
      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: 'YES'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<Response></Response>');

      const updatedRide = await Ride.findById(ride._id);
      expect(updatedRide.wtpResponse).toBe('YES');
    });

    it('handles NO response', async () => {
      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: 'NO'
        });

      expect(response.status).toBe(200);

      const updatedRide = await Ride.findById(ride._id);
      expect(updatedRide.wtpResponse).toBe('NO');
    });

    it('handles numeric amount response', async () => {
      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: '30'
        });

      expect(response.status).toBe(200);

      const updatedRide = await Ride.findById(ride._id);
      expect(updatedRide.wtpResponse).toBe('YES');
      expect(updatedRide.wtpAmountUsd).toBe(30);
    });

    it('handles amount with dollar sign', async () => {
      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: '$25.50'
        });

      expect(response.status).toBe(200);

      const updatedRide = await Ride.findById(ride._id);
      expect(updatedRide.wtpResponse).toBe('YES');
      expect(updatedRide.wtpAmountUsd).toBe(25.5);
    });

    it('matches correct ride by phone number', async () => {
      // Create multiple riders with different phone numbers
      const rider2 = await User.create({
        email: 'rider2@test.com',
        passwordHash: 'test',
        name: 'Test Rider 2',
        phoneNumber: '+13105555678',
        role: 'rider'
      });

      const ride2 = await Ride.create({
        rider: rider2._id,
        riderPhone: rider2.phoneNumber,
        pickup: { lat: 34.0, lng: -118.0, address: '789 Pine St' },
        dropoff: { lat: 34.1, lng: -118.1, address: '101 Elm St' },
        bikeType: 'ebike',
        status: 'completed',
        distanceMiles: 3,
        priceCents: 5000,
        wtpAsked: true,
        wtpResponse: null
      });

      // Send response from rider2
      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105555678',
          To: '+15551234567',
          Body: 'YES'
        });

      expect(response.status).toBe(200);

      // Check that only ride2 was updated
      const updatedRide1 = await Ride.findById(ride._id);
      const updatedRide2 = await Ride.findById(ride2._id);
      
      expect(updatedRide1.wtpResponse).toBeNull();
      expect(updatedRide2.wtpResponse).toBe('YES');
    });

    it('matches most recent ride when multiple completed rides exist', async () => {
      // Create an older completed ride for the same rider
      const olderRide = await Ride.create({
        rider: rider._id,
        riderPhone: rider.phoneNumber,
        pickup: { lat: 34.0, lng: -118.0, address: '999 Old St' },
        dropoff: { lat: 34.1, lng: -118.1, address: '888 Old Ave' },
        bikeType: 'bike',
        status: 'completed',
        distanceMiles: 2,
        priceCents: 5000,
        wtpAsked: true,
        wtpResponse: null,
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      });

      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: 'YES'
        });

      expect(response.status).toBe(200);

      // The newer ride should be updated, not the older one
      const updatedNewRide = await Ride.findById(ride._id);
      const updatedOldRide = await Ride.findById(olderRide._id);

      expect(updatedNewRide.wtpResponse).toBe('YES');
      expect(updatedOldRide.wtpResponse).toBeNull();
    });

    it('ignores SMS when no matching ride found', async () => {
      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+19995551234', // Unknown number
          To: '+15551234567',
          Body: 'YES'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('<Response></Response>');

      // Original ride should not be updated
      const updatedRide = await Ride.findById(ride._id);
      expect(updatedRide.wtpResponse).toBeNull();
    });

    it('ignores SMS when ride already has WTP response', async () => {
      // Update ride to already have a response
      ride.wtpResponse = 'YES';
      await ride.save();

      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: 'NO'
        });

      expect(response.status).toBe(200);

      // Response should not change
      const updatedRide = await Ride.findById(ride._id);
      expect(updatedRide.wtpResponse).toBe('YES');
    });

    it('ignores invalid message format', async () => {
      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: 'This is not a valid response'
        });

      expect(response.status).toBe(200);

      const updatedRide = await Ride.findById(ride._id);
      expect(updatedRide.wtpResponse).toBeNull();
    });

    it('logs SMS to Airtable', async () => {
      await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: 'YES'
        });

      // Verify Airtable logging was called
      expect(airtableCreate).toHaveBeenCalled();
      const createCall = airtableCreate.mock.calls.find(call => 
        call[0][0].fields.Direction === 'Inbound'
      );
      expect(createCall).toBeTruthy();
    });

    it('updates ride in Airtable when WTP response recorded', async () => {
      await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: 'YES'
        });

      // Verify Airtable update was called
      expect(airtableUpdate).toHaveBeenCalled();
    });

    it('handles case-insensitive YES/NO', async () => {
      const response1 = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: 'yes'
        });

      expect(response1.status).toBe(200);
      
      const updatedRide = await Ride.findById(ride._id);
      expect(updatedRide.wtpResponse).toBe('YES');
    });

    it('returns valid TwiML even on error', async () => {
      // Force an error by providing malformed data
      const response = await request(app)
        .post('/twilio/inbound')
        .type('form')
        .send({
          // Missing required From field
          To: '+15551234567',
          Body: 'YES'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/xml');
      expect(response.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(response.text).toContain('<Response></Response>');
    });
  });

  describe('Twilio signature verification', () => {
    beforeEach(() => {
      // Enable signature verification by setting production mode
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      // Reset to test mode
      process.env.NODE_ENV = 'test';
    });

    it('rejects requests with invalid signature in production', async () => {
      const response = await request(app)
        .post('/twilio/inbound')
        .set('X-Twilio-Signature', 'invalid_signature')
        .type('form')
        .send({
          From: '+13105551234',
          To: '+15551234567',
          Body: 'YES'
        });

      // SECURITY: After Sprint 1 hardening, invalid signatures return 403 (not 200)
      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Forbidden' });

      // Request should be rejected - no ride should be updated
    });
  });
});
