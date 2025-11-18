const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    riderPhone: {
      type: String,
      index: true
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },
    pickup: {
      lat: Number,
      lng: Number,
      address: String
    },
    dropoff: {
      lat: Number,
      lng: Number,
      address: String
    },
    bikeType: {
      type: String,
      enum: ['analog', 'ebike', 'cargo', 'folding'],
      default: 'analog'
    },
    distanceMiles: Number,
    priceCents: Number,
    status: {
      type: String,
      enum: [
        'requested',
        'accepted',
        'en_route',
        'arrived',
        'in_transit',
        'completed',
        'cancelled',
        'cancelled_rider_noshow',
        'cancelled_safety',
        'rejected_geofence'
      ],
      default: 'requested'
    },
    cancellationReason: {
      type: String,
      enum: ['rider_request', 'driver_unavailable', 'damaged_battery', 'hazmat', 'other', null],
      default: null
    },
    driverEtaMinutes: {
      type: Number,
      min: 0,
      default: null
    },
    notes: String,
    paymentIntentId: String,
    paymentChargeId: String,
    paymentStatus: {
      type: String,
      enum: [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
        'requires_capture',
        'canceled',
        'succeeded',
        'failed'
      ]
    },
    paymentCapturedAt: Date,
    lastPaymentError: String,
    wtpAsked: {
      type: Boolean,
      default: false
    },
    wtpResponse: {
      type: String,
      enum: ['YES', 'NO', 'No reply', null],
      default: null
    },
    wtpAmountUsd: {
      type: Number,
      default: null
    },
    assistRequired: {
      type: Boolean,
      default: false
    },
    assistReason: {
      type: String,
      enum: ['physical_help', 'equipment_issue', 'navigation', 'other', null],
      default: null
    }
  },
  { timestamps: true }
);

// Add compound indexes for frequently queried fields
rideSchema.index({ status: 1, createdAt: -1 }); // For listing rides by status
rideSchema.index({ driver: 1, status: 1 }); // For driver's active rides
rideSchema.index({ rider: 1, createdAt: -1 }); // For rider's ride history
rideSchema.index({ riderPhone: 1, wtpAsked: 1, wtpResponse: 1, createdAt: -1 }); // For WTP matching

module.exports = mongoose.model('Ride', rideSchema);
