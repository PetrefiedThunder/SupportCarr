const logger = require('../config/logger');
const rideEvents = require('../utils/rideEvents');
const paymentLedgerRepository = require('../db/paymentLedgerRepository');
const rideRepository = require('../db/rideRepository');
const { getStripeClient } = require('./paymentService');

function verifyStripeEvent({ rawBody, signature }) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Stripe configuration missing: STRIPE_WEBHOOK_SECRET');
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

async function fetchBalanceFee(charge) {
  const stripe = getStripeClient();
  if (!charge?.balance_transaction) {
    return {};
  }

  try {
    const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction);
    return {
      balanceFeeCents: balanceTx?.fee,
      applicationFeeAmountCents: balanceTx?.fee // best available approximation
    };
  } catch (error) {
    logger.warn('Unable to retrieve balance transaction for ledger entry', {
      balanceTransactionId: charge.balance_transaction,
      error: error.message
    });
    return {};
  }
}

async function persistLedgerEntry({ event, idempotencyKey }) {
  const object = event.data?.object || {};
  const rideId = object.metadata?.rideId;
  const charge = object.charges?.data?.[0];
  const feeInfo = await fetchBalanceFee(charge);

  const ledger = await PaymentLedger.findOneAndUpdate(
    { $or: [{ stripeEventId: event.id }, { idempotencyKey }] },
    {
      $setOnInsert: {
        stripeEventId: event.id,
        idempotencyKey,
        type: event.type,
        stripeCreatedAt: new Date(
          (event.created || Math.floor(Date.now() / 1000)) * 1000
        )
      },
      $set: {
        idempotencyKey,
        paymentIntentId: object.id,
        chargeId: charge?.id,
        balanceTransactionId: charge?.balance_transaction,
        rideId: rideId || undefined,
        status: object.status,
        amountReceivedCents: object.amount_received,
        amountCapturedCents:
          object.amount_received ?? object.amount_captured ?? object.amount_capturable,
        currency: object.currency,
        applicationFeeAmountCents:
          object.application_fee_amount ?? feeInfo.applicationFeeAmountCents,
        balanceFeeCents: feeInfo.balanceFeeCents,
        payload: object
      }
    },
    { new: true, upsert: true }
  );

  return { ledger, alreadyProcessed: Boolean(ledger.processedAt) };
}

async function reconcileLedgerToRide(ledger) {
  if (ledger.processedAt) {
    return ledger;
  }

  const rideId = ledger.rideId || ledger.payload?.metadata?.rideId;
  if (!rideId) {
    logger.warn('Payment ledger event missing ride reference', {
      stripeEventId: ledger.stripeEventId,
      paymentIntentId: ledger.paymentIntentId
    });
    return paymentLedgerRepository.markLedgerProcessed(ledger.id, {
      processingError: 'missing_ride_reference'
    });
  }

  const ride = await rideRepository.findById(rideId);
  if (!ride) {
    logger.warn('Payment ledger could not find ride', {
      rideId,
      stripeEventId: ledger.stripeEventId
    });
    return paymentLedgerRepository.markLedgerProcessed(ledger.id, {
      processingError: 'ride_not_found'
    });
  }

  try {
    const updates = {};
    if (ledger.paymentIntentId && !ride.paymentIntentId) {
      updates.paymentIntentId = ledger.paymentIntentId;
    }

    if (ledger.type === 'payment_intent.succeeded') {
      ride.paymentStatus = 'succeeded';
      ride.paymentChargeId = ledger.chargeId || ledger.payload?.charges?.data?.[0]?.id;
      ride.paymentCapturedAt = ledger.stripeCreatedAt || new Date();
      ride.lastPaymentError = null;
    } else if (ledger.type === 'payment_intent.payment_failed') {
      updates.paymentStatus = 'failed';
      updates.lastPaymentError =
        ledger.payload?.last_payment_error?.message || 'Payment failed';
    }

    if (Object.keys(updates).length > 0) {
      await rideRepository.updateRide(rideId, updates);
    }
    rideEvents.emit('ride-payment-updated', {
      rideId: ride.id,
      paymentStatus: updates.paymentStatus || ride.paymentStatus
    });

    return paymentLedgerRepository.markLedgerProcessed(ledger.id, { processingError: null });
  } catch (error) {
    logger.error('Failed to reconcile payment ledger to ride', {
      rideId,
      stripeEventId: ledger.stripeEventId,
      error: error.message
    });
    await paymentLedgerRepository.markLedgerProcessed(ledger.id, {
      processingError: error.message
    });
    throw error;
  }
}

async function handleStripeWebhook({ rawBody, signature, idempotencyKey }) {
  if (!idempotencyKey) {
    const error = new Error('Missing Idempotency-Key header');
    error.status = 400;
    throw error;
  }

  const event = verifyStripeEvent({ rawBody, signature });
  const { ledger, alreadyProcessed } = await persistLedgerEntry({ event, idempotencyKey });

  if (['payment_intent.succeeded', 'payment_intent.payment_failed'].includes(event.type)) {
    await reconcileLedgerToRide(ledger);
  } else if (!alreadyProcessed) {
    await paymentLedgerRepository.markLedgerProcessed(ledger.id, { processingError: null });
  }

  return ledger;
}

module.exports = {
  handleStripeWebhook,
  verifyStripeEvent,
  persistLedgerEntry,
  reconcileLedgerToRide
};
