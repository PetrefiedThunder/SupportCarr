#!/usr/bin/env node

/**
 * Test script for multi-rider WTP (Willingness To Pay) SMS flow
 *
 * This script tests the critical scenario where multiple riders have
 * open WTP questions simultaneously, ensuring replies are matched to
 * the correct ride.
 *
 * Scenario:
 * 1. Create two riders with different phone numbers
 * 2. Create and complete a ride for Rider A
 * 3. Create and complete a ride for Rider B
 * 4. Simulate Rider B replying YES (should update Rider B's ride)
 * 5. Simulate Rider A replying NO (should update Rider A's ride)
 * 6. Verify both rides have correct WTP responses
 *
 * Usage:
 *   node scripts/test-multi-rider-wtp.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Ride = require('../src/models/Ride');
const { updateRideStatus } = require('../src/services/rideService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supportcarr';

async function testMultiRiderWtp() {
  try {
    console.log('🧪 Starting multi-rider WTP flow test...\n');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clean up any existing test data
    await User.deleteMany({ email: { $in: ['rider-a@test.com', 'rider-b@test.com'] } });
    await Ride.deleteMany({ riderPhone: { $in: ['+19995551111', '+19995552222'] } });

    // Step 1: Create two riders
    console.log('👥 Creating two test riders...');
    const riderA = await User.create({
      email: 'rider-a@test.com',
      passwordHash: 'test',
      name: 'Rider A',
      phoneNumber: '+19995551111',
      role: 'rider'
    });
    console.log(`✅ Created Rider A: ${riderA.email} (${riderA.phoneNumber})`);

    const riderB = await User.create({
      email: 'rider-b@test.com',
      passwordHash: 'test',
      name: 'Rider B',
      phoneNumber: '+19995552222',
      role: 'rider'
    });
    console.log(`✅ Created Rider B: ${riderB.email} (${riderB.phoneNumber})\n`);

    // Step 2: Create and complete ride for Rider A
    console.log('🚴 Creating and completing ride for Rider A...');
    const rideA = await Ride.create({
      rider: riderA._id,
      riderPhone: riderA.phoneNumber,
      pickup: {
        lat: 34.0195,
        lng: -118.4912,
        address: 'Santa Monica Pier'
      },
      dropoff: {
        lat: 34.0259,
        lng: -118.4798,
        address: '123 Main St, Santa Monica, CA'
      },
      bikeType: 'bike',
      status: 'requested',
      distanceMiles: 1.0,
      priceCents: 5000
    });

    await updateRideStatus({ rideId: rideA._id, status: 'completed' });
    console.log(`✅ Ride A completed: ${rideA._id}`);

    // Step 3: Create and complete ride for Rider B
    console.log('🚴 Creating and completing ride for Rider B...');
    const rideB = await Ride.create({
      rider: riderB._id,
      riderPhone: riderB.phoneNumber,
      pickup: {
        lat: 34.0195,
        lng: -118.4912,
        address: 'Venice Beach'
      },
      dropoff: {
        lat: 34.0259,
        lng: -118.4798,
        address: '456 Ocean Ave, Santa Monica, CA'
      },
      bikeType: 'ebike',
      status: 'requested',
      distanceMiles: 1.5,
      priceCents: 5000
    });

    await updateRideStatus({ rideId: rideB._id, status: 'completed' });
    console.log(`✅ Ride B completed: ${rideB._id}\n`);

    // Verify both rides have WTP asked
    const rideACheck1 = await Ride.findById(rideA._id);
    const rideBCheck1 = await Ride.findById(rideB._id);

    console.log('📊 Current state:');
    console.log(`   Ride A: wtpAsked=${rideACheck1.wtpAsked}, wtpResponse=${rideACheck1.wtpResponse}`);
    console.log(`   Ride B: wtpAsked=${rideBCheck1.wtpAsked}, wtpResponse=${rideBCheck1.wtpResponse}\n`);

    if (!rideACheck1.wtpAsked || !rideBCheck1.wtpAsked) {
      throw new Error('WTP SMS not sent for one or both rides');
    }

    // Step 4: Simulate Rider B replying YES
    console.log('💬 Simulating Rider B reply: YES...');
    const twilioRoutes = require('../src/routes/twilioRoutes');
    const express = require('express');
    const app = express();
    app.use(express.urlencoded({ extended: false }));
    app.use('/api/twilio', twilioRoutes);

    const request = require('supertest');

    await request(app)
      .post('/api/twilio/inbound')
      .send({
        From: riderB.phoneNumber,
        To: process.env.TWILIO_FROM_NUMBER || '+15551234567',
        Body: 'YES'
      });

    console.log('✅ Simulated Rider B reply\n');

    // Step 5: Simulate Rider A replying NO
    console.log('💬 Simulating Rider A reply: NO...');
    await request(app)
      .post('/api/twilio/inbound')
      .send({
        From: riderA.phoneNumber,
        To: process.env.TWILIO_FROM_NUMBER || '+15551234567',
        Body: 'NO'
      });

    console.log('✅ Simulated Rider A reply\n');

    // Step 6: Verify both rides have correct responses
    console.log('🔍 Verifying WTP responses...');
    const rideAFinal = await Ride.findById(rideA._id);
    const rideBFinal = await Ride.findById(rideB._id);

    console.log(`   Ride A: wtpResponse=${rideAFinal.wtpResponse} (expected: NO)`);
    console.log(`   Ride B: wtpResponse=${rideBFinal.wtpResponse} (expected: YES)\n`);

    // Assertions
    let allPassed = true;

    if (rideAFinal.wtpResponse !== 'NO') {
      console.error('❌ FAIL: Ride A should have wtpResponse=NO');
      allPassed = false;
    } else {
      console.log('✅ PASS: Ride A has correct response (NO)');
    }

    if (rideBFinal.wtpResponse !== 'YES') {
      console.error('❌ FAIL: Ride B should have wtpResponse=YES');
      allPassed = false;
    } else {
      console.log('✅ PASS: Ride B has correct response (YES)');
    }

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteMany({ _id: { $in: [riderA._id, riderB._id] } });
    await Ride.deleteMany({ _id: { $in: [rideA._id, rideB._id] } });
    console.log('✅ Cleanup complete\n');

    if (allPassed) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ALL TESTS PASSED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Multi-rider WTP matching is working correctly!');
      console.log('Replies are properly matched to the correct rider.\n');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ SOME TESTS FAILED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

testMultiRiderWtp();
