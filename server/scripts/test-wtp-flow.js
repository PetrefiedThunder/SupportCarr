#!/usr/bin/env node

/**
 * Test script for WTP (Willingness To Pay) SMS flow
 *
 * This script:
 * 1. Creates a test user (rider)
 * 2. Creates a test ride
 * 3. Completes the ride (which triggers WTP SMS)
 * 4. Simulates an inbound SMS reply
 *
 * Usage:
 *   node scripts/test-wtp-flow.js +13105551234
 *
 * Where +13105551234 is YOUR actual phone number (to receive the SMS)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Ride = require('../src/models/Ride');
const { updateRideStatus } = require('../src/services/rideService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supportcarr';

async function testWtpFlow(phoneNumber) {
  try {
    console.log('🚀 Starting WTP flow test...\n');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Create or find test user
    console.log('👤 Creating test user...');
    let user = await User.findOne({ email: 'test-rider@supportcarr.com' });

    if (!user) {
      user = await User.create({
        email: 'test-rider@supportcarr.com',
        passwordHash: 'not-used-for-test',
        name: 'Test Rider',
        phoneNumber: phoneNumber,
        role: 'rider'
      });
      console.log(`✅ Created user: ${user.email} (${user.phoneNumber})\n`);
    } else {
      // Update phone number
      user.phoneNumber = phoneNumber;
      await user.save();
      console.log(`✅ Using existing user: ${user.email} (${user.phoneNumber})\n`);
    }

    // Step 2: Create test ride
    console.log('🚴 Creating test ride...');
    const ride = await Ride.create({
      rider: user._id,
      pickup: {
        lat: 34.0195,
        lng: -118.4912,
        address: 'Santa Monica Pier, Santa Monica, CA 90405'
      },
      dropoff: {
        lat: 34.0259,
        lng: -118.4798,
        address: '123 Main St, Santa Monica, CA 90401'
      },
      bikeType: 'bike',
      status: 'requested',
      distanceMiles: 1.2,
      priceCents: 5000
    });
    console.log(`✅ Created ride: ${ride._id}\n`);

    // Step 3: Complete the ride (triggers WTP SMS)
    console.log('📱 Completing ride (this will send WTP SMS)...');
    await updateRideStatus({
      rideId: ride._id,
      status: 'completed'
    });
    console.log('✅ Ride completed and WTP SMS sent!\n');

    // Step 4: Instructions
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📲 NEXT STEPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`1. Check your phone (${phoneNumber}) for the WTP SMS`);
    console.log('2. Reply with one of:');
    console.log('   - "YES"');
    console.log('   - "NO"');
    console.log('   - A number like "25" or "$30"');
    console.log('\n3. Check your Airtable base:');
    console.log('   - Rides table should show the ride with WTP asked = true');
    console.log('   - SMS Logs table should show the outbound SMS');
    console.log('   - After you reply, both tables should update\n');
    console.log('4. To test the inbound webhook locally:');
    console.log(`   curl -X POST http://localhost:4000/api/twilio/inbound \\`);
    console.log(`     -d "From=${encodeURIComponent(phoneNumber)}&Body=YES"`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✨ Test setup complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Get phone number from command line
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('❌ Error: Please provide a phone number');
  console.log('\nUsage:');
  console.log('  node scripts/test-wtp-flow.js +13105551234');
  console.log('\nExample:');
  console.log('  node scripts/test-wtp-flow.js +13105551234');
  process.exit(1);
}

// Validate E.164 format
if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
  console.error('❌ Error: Phone number must be in E.164 format');
  console.log('\nExample: +13105551234 (must start with +, include country code)');
  process.exit(1);
}

testWtpFlow(phoneNumber);
