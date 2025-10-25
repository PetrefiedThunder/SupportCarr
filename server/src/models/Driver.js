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
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);
