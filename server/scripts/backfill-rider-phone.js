#!/usr/bin/env node

/**
 * One-time migration script to backfill riderPhone field
 *
 * This script populates the denormalized riderPhone field for existing rides
 * that were created before the WTP (Willingness To Pay) feature was implemented.
 *
 * Why this is needed:
 * - New WTP matching logic relies on riderPhone for correctness in multi-rider scenarios
 * - Legacy rides only have the rider ObjectId reference, not the phone number
 * - Without this backfill, WTP replies for old rides will not match
 *
 * What it does:
 * - Finds all rides missing riderPhone field (null or empty string)
 * - Populates rider relationship to get phone number
 * - Updates each ride with the rider's phone number
 * - Logs statistics about the migration
 *
 * Usage:
 *   node scripts/backfill-rider-phone.js
 *
 * Safe to run multiple times (idempotent) - will only update rides with missing riderPhone
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Ride = require('../src/models/Ride');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supportcarr';

async function backfillRiderPhone() {
  try {
    console.log('🔄 Starting riderPhone backfill migration...\n');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all rides missing riderPhone
    console.log('🔍 Finding rides with missing riderPhone...');
    const rides = await Ride.find({
      riderPhone: { $in: [null, ''] }
    }).populate('rider');

    console.log(`📊 Found ${rides.length} rides to update\n`);

    if (rides.length === 0) {
      console.log('✨ No rides need updating. Migration complete!\n');
      return;
    }

    // Update each ride
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const ride of rides) {
      try {
        if (!ride.rider) {
          console.warn(`⚠️  Skipping ride ${ride._id} - no rider reference`);
          skipCount++;
          continue;
        }

        if (!ride.rider.phoneNumber) {
          console.warn(`⚠️  Skipping ride ${ride._id} - rider ${ride.rider.email} has no phone number`);
          skipCount++;
          continue;
        }

        ride.riderPhone = ride.rider.phoneNumber;
        await ride.save();

        successCount++;

        // Log progress every 10 rides
        if (successCount % 10 === 0) {
          console.log(`   ... updated ${successCount} rides`);
        }
      } catch (error) {
        console.error(`❌ Error updating ride ${ride._id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 MIGRATION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully updated: ${successCount} rides`);
    console.log(`⚠️  Skipped: ${skipCount} rides`);
    console.log(`❌ Errors: ${errorCount} rides`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (errorCount > 0) {
      console.log('⚠️  Some rides could not be updated. Review errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

backfillRiderPhone();
