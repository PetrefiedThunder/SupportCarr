const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['rider', 'driver', 'admin'],
      default: 'rider'
    },
    name: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    refreshTokens: [
      {
        token: String,
        expiresAt: Date
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
