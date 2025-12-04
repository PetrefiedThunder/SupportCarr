const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vehicleType: {
      type: String,
      enum: ['van', 'truck', 'suv', 'other'],
      required: true
    },
    vehicleDescription: String,
    licensePlate: {
      type: String,
      default: null
    },
    active: {
      type: Boolean,
      default: false
    },
    currentLocation: {
      type: {
        lat: Number,
        lng: Number
      },
      default: null
    },
    serviceRadiusMiles: {
      type: Number,
      default: 10
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 5.0 // Start with perfect rating
    },
    totalRides: {
      type: Number,
      default: 0
    },
    lastRideCompletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);
