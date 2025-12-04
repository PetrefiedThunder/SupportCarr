const mongoose = require('mongoose');

const paymentLedgerSchema = new mongoose.Schema(
  {
    stripeEventId: {
      type: String,
      unique: true,
      required: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true
    },
    type: String,
    stripeCreatedAt: Date,
    paymentIntentId: {
      type: String,
      index: true
    },
    chargeId: String,
    balanceTransactionId: String,
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride'
    },
    status: String,
    amountReceivedCents: Number,
    amountCapturedCents: Number,
    currency: String,
    applicationFeeAmountCents: Number,
    balanceFeeCents: Number,
    payload: {},
    processedAt: Date,
    processingError: String
  },
  { timestamps: true }
);

paymentLedgerSchema.index({ rideId: 1, stripeCreatedAt: -1 });
paymentLedgerSchema.index({ paymentIntentId: 1, type: 1 });

module.exports = mongoose.model('PaymentLedger', paymentLedgerSchema);
