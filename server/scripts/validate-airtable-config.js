#!/usr/bin/env node

/**
 * Airtable Configuration Validator
 * 
 * This script outputs the expected Airtable schema based on the SupportCarr code configuration.
 * Use this to validate your Airtable base configuration matches what the code expects.
 * 
 * Usage:
 *   node server/scripts/validate-airtable-config.js
 * 
 * The output can be compared side-by-side with your actual Airtable column configuration
 * to spot naming errors, missing fields, or incorrect field types before deployment.
 */

require('dotenv').config();
const { getAirtableStatusOptions } = require('../src/utils/airtableStatusMapper');

/**
 * Expected Airtable schema based on code configuration
 */
const expectedSchema = {
  base: {
    name: 'SupportCarr Pilot – Santa Monica',
    baseId: process.env.AIRTABLE_BASE_ID || 'NOT_CONFIGURED',
    configured: !!process.env.AIRTABLE_BASE_ID
  },
  tables: [
    {
      name: 'Rides',
      envVar: 'AIRTABLE_RIDES_TABLE',
      configuredName: process.env.AIRTABLE_RIDES_TABLE || 'Rides',
      fields: [
        {
          name: 'Ride ID',
          type: 'Single line text',
          required: true,
          description: 'MongoDB _id (primary key for linking)',
          example: '507f1f77bcf86cd799439011'
        },
        {
          name: 'Rider phone (E.164)',
          type: 'Single line text',
          required: false,
          description: 'Phone number in E.164 format',
          example: '+13105551234'
        },
        {
          name: 'Pickup address (normalized)',
          type: 'Single line text',
          required: false,
          description: 'Human-readable pickup address',
          example: 'Santa Monica Pier, Santa Monica, CA'
        },
        {
          name: 'Drop-off address (normalized)',
          type: 'Single line text',
          required: false,
          description: 'Human-readable dropoff address',
          example: '123 Main St, Santa Monica, CA 90401'
        },
        {
          name: 'Ride status',
          type: 'Single select',
          required: true,
          options: getAirtableStatusOptions(),
          description: 'Current ride status (mapped from internal codes)',
          mapping: {
            'requested': 'New',
            'accepted': 'Assigned',
            'en_route': 'Driver en route',
            'arrived': 'Driver arrived',
            'in_transit': 'In transit',
            'completed': 'Completed',
            'cancelled': 'Cancelled – Rider no-show (default)',
            'cancelled_rider_noshow': 'Cancelled – Rider no-show',
            'cancelled_safety': 'Cancelled – Safety',
            'rejected_geofence': 'Rejected – Geofence'
          }
        },
        {
          name: 'Dispatched at',
          type: 'Date',
          required: false,
          includeTime: true,
          description: 'Timestamp when ride was assigned to driver',
          example: '2024-01-15T10:30:00.000Z'
        },
        {
          name: 'Arrived pickup at',
          type: 'Date',
          required: false,
          includeTime: true,
          description: 'Timestamp when driver arrived at pickup (not yet implemented)',
          example: '2024-01-15T10:45:00.000Z'
        },
        {
          name: 'Completed at',
          type: 'Date',
          required: false,
          includeTime: true,
          description: 'Timestamp when ride was completed',
          example: '2024-01-15T11:00:00.000Z'
        },
        {
          name: 'WTP asked?',
          type: 'Checkbox',
          required: false,
          description: 'Whether WTP SMS was sent to rider',
          example: true
        },
        {
          name: 'WTP response',
          type: 'Single select',
          required: false,
          options: ['YES', 'NO', 'No reply'],
          description: 'Rider\'s willingness-to-pay response',
          example: 'YES'
        },
        {
          name: 'WTP amount (USD)',
          type: 'Number',
          required: false,
          decimalAllowed: true,
          description: 'Dollar amount rider said they would pay',
          example: 25.0
        },
        {
          name: 'Created at',
          type: 'Created time',
          required: false,
          description: 'Auto-populated by Airtable',
          example: '2024-01-15T10:00:00.000Z'
        },
        {
          name: 'Notes',
          type: 'Long text',
          required: false,
          description: 'Optional notes about the ride',
          example: 'Bike has flat tire'
        }
      ]
    },
    {
      name: 'SMS Logs',
      envVar: 'AIRTABLE_SMS_LOGS_TABLE',
      configuredName: process.env.AIRTABLE_SMS_LOGS_TABLE || 'SMS Logs',
      fields: [
        {
          name: 'SMS ID',
          type: 'Autonumber',
          required: true,
          description: 'Auto-generated unique identifier',
          example: 1
        },
        {
          name: 'Ride',
          type: 'Link to another record',
          required: false,
          linkedTable: 'Rides',
          allowMultiple: true,
          description: 'Link to associated ride(s)',
          example: ['rec123abc']
        },
        {
          name: 'Direction',
          type: 'Single select',
          required: true,
          options: ['Inbound', 'Outbound'],
          description: 'SMS direction',
          example: 'Outbound'
        },
        {
          name: 'To (phone)',
          type: 'Single line text',
          required: true,
          description: 'Recipient phone number (E.164)',
          example: '+13105551234'
        },
        {
          name: 'From (phone)',
          type: 'Single line text',
          required: true,
          description: 'Sender phone number (E.164)',
          example: '+13105556789'
        },
        {
          name: 'Body',
          type: 'Long text',
          required: true,
          description: 'SMS message body',
          example: 'SupportCarr: Your bike rescue is complete...'
        },
        {
          name: 'Template ID',
          type: 'Single select',
          required: false,
          options: ['R6_COMPLETE_WTP'],
          description: 'Template identifier (add more as needed)',
          example: 'R6_COMPLETE_WTP'
        },
        {
          name: 'Sent/received at',
          type: 'Date',
          required: true,
          includeTime: true,
          description: 'Timestamp of SMS',
          example: '2024-01-15T11:01:00.000Z'
        },
        {
          name: 'Delivery status',
          type: 'Single select',
          required: true,
          options: ['Queued', 'Sent', 'Delivered', 'Failed'],
          description: 'SMS delivery status from Twilio',
          example: 'Delivered'
        },
        {
          name: 'Message SID',
          type: 'Single line text',
          required: false,
          description: 'Twilio message SID for idempotency',
          example: 'SM1234567890abcdef'
        }
      ]
    }
  ]
};

/**
 * Validate current environment configuration
 */
function validateEnvironment() {
  const issues = [];
  
  if (!process.env.AIRTABLE_API_KEY) {
    issues.push('⚠️  AIRTABLE_API_KEY not set');
  }
  
  if (!process.env.AIRTABLE_BASE_ID) {
    issues.push('⚠️  AIRTABLE_BASE_ID not set');
  }
  
  if (!process.env.AIRTABLE_RIDES_TABLE) {
    issues.push('ℹ️  AIRTABLE_RIDES_TABLE not set (defaulting to "Rides")');
  }
  
  if (!process.env.AIRTABLE_SMS_LOGS_TABLE) {
    issues.push('ℹ️  AIRTABLE_SMS_LOGS_TABLE not set (defaulting to "SMS Logs")');
  }
  
  return issues;
}

/**
 * Main execution
 */
function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         Airtable Configuration Validator v1.0                  ║');
  console.log('║         SupportCarr Pilot – Santa Monica                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Environment validation
  console.log('📋 Environment Configuration:');
  console.log('─────────────────────────────');
  const envIssues = validateEnvironment();
  
  if (envIssues.length > 0) {
    console.log('\n' + envIssues.join('\n'));
  } else {
    console.log('✅ All environment variables configured');
  }
  
  console.log('\n\n📊 Expected Airtable Schema:');
  console.log('─────────────────────────────\n');
  
  // Output JSON for programmatic comparison
  console.log(JSON.stringify(expectedSchema, null, 2));
  
  console.log('\n\n📝 Human-Readable Summary:');
  console.log('─────────────────────────────\n');
  
  // Tables summary
  expectedSchema.tables.forEach(table => {
    console.log(`\n🗂️  Table: "${table.name}"`);
    console.log(`   Environment Variable: ${table.envVar}`);
    console.log(`   Configured Name: "${table.configuredName}"\n`);
    
    console.log('   Fields:');
    table.fields.forEach((field, index) => {
      console.log(`   ${index + 1}. "${field.name}" (${field.type})`);
      
      if (field.options) {
        console.log(`      Options: ${field.options.join(', ')}`);
      }
      
      if (field.mapping) {
        console.log('      Status Mapping:');
        Object.entries(field.mapping).forEach(([internal, display]) => {
          console.log(`        - "${internal}" → "${display}"`);
        });
      }
    });
  });
  
  console.log('\n\n✅ Validation Instructions:');
  console.log('─────────────────────────────');
  console.log('1. Open your Airtable base');
  console.log('2. Compare each field name EXACTLY (case-sensitive!)');
  console.log('3. Verify field types match');
  console.log('4. Check Single Select options match exactly');
  console.log('5. Ensure "Rides" table has all status options listed above');
  console.log('\n⚠️  Common Issues:');
  console.log('   - Field name case mismatch: "ride status" vs "Ride status"');
  console.log('   - Missing status options in Single Select');
  console.log('   - Wrong field type (Text vs Date, etc.)');
  console.log('   - Table name mismatch\n');
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { expectedSchema, validateEnvironment };
