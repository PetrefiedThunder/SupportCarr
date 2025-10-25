const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
      enum: ['bike', 'ebike', 'cargo', 'other'],
      default: 'bike'
    },
    distanceMiles: Number,
    priceCents: Number,
    status: {
      type: String,
      enum: ['requested', 'accepted', 'en_route', 'completed', 'cancelled'],
      default: 'requested'
    },
    driverEtaMinutes: {
      type: Number,
      min: 0,
      default: null
    },
    notes: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ride', rideSchema);
