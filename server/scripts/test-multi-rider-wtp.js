#!/usr/bin/env node

/**
 * Test script for multi-rider WTP (Willingness To Pay) SMS flow
 *
 * This script tests the critical scenario where multiple riders have
 * open WTP questions simultaneously, ensuring replies are matched to
 * the correct ride and race conditions are handled properly.
 *
 * Test Scenarios:
 * 
 * **Sequential Replies Test:**
 * 1. Create two riders (A & B) with different phone numbers
 * 2. Create and complete a ride for Rider A
 * 3. Create and complete a ride for Rider B
 * 4. Simulate Rider B replying YES (should update Rider B's ride)
 * 5. Simulate Rider A replying NO (should update Rider A's ride)
 * 6. Verify both rides have correct WTP responses
 * 
 * **Race Condition Test:**
 * 1. Create two riders (C & D) with different phone numbers
 * 2. Create and complete rides for both riders
 * 3. Simulate SIMULTANEOUS YES replies from both riders
 * 4. Verify both rides updated correctly without data corruption
 *
 * Usage:
 *   node scripts/test-multi-rider-wtp.js
 */

require('dotenv').config();
// Set test mode to bypass Twilio signature verification (if not already set)
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

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

    // ========================================================================
    // RACE CONDITION TEST: Simultaneous replies from different riders
    // ========================================================================
    console.log('\n⚡ Testing race condition: simultaneous replies...');
    
    // Create two new riders with different phone numbers
    const riderC = await User.create({
      email: 'rider-c@test.com',
      passwordHash: 'test',
      name: 'Rider C',
      phoneNumber: '+19995553333',
      role: 'rider'
    });
    
    const riderD = await User.create({
      email: 'rider-d@test.com',
      passwordHash: 'test',
      name: 'Rider D',
      phoneNumber: '+19995554444',
      role: 'rider'
    });
    
    console.log(`✅ Created Rider C: ${riderC.email} (${riderC.phoneNumber})`);
    console.log(`✅ Created Rider D: ${riderD.email} (${riderD.phoneNumber})`);
    
    // Create and complete rides for both
    const rideC = await Ride.create({
      rider: riderC._id,
      riderPhone: riderC.phoneNumber,
      pickup: { lat: 34.0195, lng: -118.4912, address: 'Location C Pickup' },
      dropoff: { lat: 34.0259, lng: -118.4798, address: 'Location C Dropoff' },
      bikeType: 'bike',
      status: 'requested',
      distanceMiles: 1.0,
      priceCents: 5000
    });
    
    const rideD = await Ride.create({
      rider: riderD._id,
      riderPhone: riderD.phoneNumber,
      pickup: { lat: 34.0195, lng: -118.4912, address: 'Location D Pickup' },
      dropoff: { lat: 34.0259, lng: -118.4798, address: 'Location D Dropoff' },
      bikeType: 'ebike',
      status: 'requested',
      distanceMiles: 1.5,
      priceCents: 5000
    });
    
    await updateRideStatus({ rideId: rideC._id, status: 'completed' });
    await updateRideStatus({ rideId: rideD._id, status: 'completed' });
    
    console.log(`✅ Ride C completed: ${rideC._id}`);
    console.log(`✅ Ride D completed: ${rideD._id}`);
    
    // Simulate SIMULTANEOUS replies (send both at the exact same time using Promise.all)
    console.log('💬 Simulating SIMULTANEOUS replies from both riders...');
    
    await Promise.all([
      request(app)
        .post('/api/twilio/inbound')
        .send({
          From: riderC.phoneNumber,
          To: process.env.TWILIO_FROM_NUMBER || '+15551234567',
          Body: 'YES'
        }),
      request(app)
        .post('/api/twilio/inbound')
        .send({
          From: riderD.phoneNumber,
          To: process.env.TWILIO_FROM_NUMBER || '+15551234567',
          Body: 'YES'
        })
    ]);
    
    console.log('✅ Both replies sent simultaneously\n');
    
    // Verify both rides updated correctly
    console.log('🔍 Verifying race condition results...');
    const rideCFinal = await Ride.findById(rideC._id);
    const rideDFinal = await Ride.findById(rideD._id);
    
    console.log(`   Ride C: wtpResponse=${rideCFinal.wtpResponse} (expected: YES)`);
    console.log(`   Ride D: wtpResponse=${rideDFinal.wtpResponse} (expected: YES)\n`);
    
    if (rideCFinal.wtpResponse !== 'YES') {
      console.error('❌ FAIL: Ride C should have wtpResponse=YES (race condition failure)');
      allPassed = false;
    } else {
      console.log('✅ PASS: Ride C has correct response (YES) despite race condition');
    }
    
    if (rideDFinal.wtpResponse !== 'YES') {
      console.error('❌ FAIL: Ride D should have wtpResponse=YES (race condition failure)');
      allPassed = false;
    } else {
      console.log('✅ PASS: Ride D has correct response (YES) despite race condition');
    }
    
    // Clean up all test data
    console.log('\n🧹 Cleaning up all test data...');
    await User.deleteMany({ _id: { $in: [riderA._id, riderB._id, riderC._id, riderD._id] } });
    await Ride.deleteMany({ _id: { $in: [rideA._id, rideB._id, rideC._id, rideD._id] } });
    console.log('✅ Cleanup complete\n');

    if (allPassed) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ALL TESTS PASSED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('Multi-rider WTP matching is working correctly!');
      console.log('✅ Replies are properly matched to the correct rider');
      console.log('✅ Race conditions are handled correctly\n');
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
