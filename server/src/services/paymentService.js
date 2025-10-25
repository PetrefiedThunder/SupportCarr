require('dotenv').config();

const Stripe = require('stripe');
const logger = require('../config/logger');

let stripeClient;

function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe configuration missing: STRIPE_SECRET_KEY');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2024-06-20'
  });
  return stripeClient;
}

async function ensureRidePaymentIntent({ ride, amountCents }) {
  const stripe = getStripeClient();

  try {
    if (ride.paymentIntentId) {
      const existingIntent = await stripe.paymentIntents.retrieve(ride.paymentIntentId);

      if (existingIntent.amount !== amountCents) {
        await stripe.paymentIntents.update(ride.paymentIntentId, {
          amount: amountCents
        });
        const updatedIntent = await stripe.paymentIntents.retrieve(ride.paymentIntentId);
        ride.paymentStatus = updatedIntent.status;
        await ride.save();
        return updatedIntent;
      }

      ride.paymentStatus = existingIntent.status;
      await ride.save();
      return existingIntent;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      capture_method: 'manual',
      metadata: {
        rideId: ride.id,
        riderId: ride.rider ? String(ride.rider) : undefined,
        driverId: ride.driver ? String(ride.driver) : undefined
      }
    });

    ride.paymentIntentId = paymentIntent.id;
    ride.paymentStatus = paymentIntent.status;
    ride.lastPaymentError = null;
    await ride.save();

    logger.info('Stripe payment intent created for ride', {
      rideId: ride.id,
      paymentIntentId: paymentIntent.id
    });

    return paymentIntent;
  } catch (error) {
    logger.error('Failed to initialize Stripe payment intent', {
      rideId: ride.id,
      error: error.message
    });

    ride.lastPaymentError = error.message;
    await ride.save().catch(() => {});

    throw new Error('Payment intent creation failed');
  }
}

async function captureRidePayment({ ride }) {
  const stripe = getStripeClient();

  try {
    if (!ride.paymentIntentId) {
      await ensureRidePaymentIntent({ ride, amountCents: ride.priceCents });
    }

    const capture = await stripe.paymentIntents.capture(ride.paymentIntentId);

    ride.paymentStatus = capture.status;
    ride.paymentChargeId = capture.latest_charge;
    ride.paymentCapturedAt = new Date();
    ride.lastPaymentError = null;
    await ride.save();

    logger.info('Stripe payment captured for ride', {
      rideId: ride.id,
      paymentIntentId: ride.paymentIntentId,
      chargeId: capture.latest_charge
    });

    return capture;
  } catch (error) {
    logger.error('Failed to capture Stripe payment for ride', {
      rideId: ride.id,
      paymentIntentId: ride.paymentIntentId,
      error: error.message
    });

    ride.paymentStatus = 'failed';
    ride.lastPaymentError = error.message;
    await ride.save().catch(() => {});

    throw new Error('Payment capture failed');
  }
}

function __setStripeClient(client) {
  stripeClient = client;
}

function __resetStripeClient() {
  stripeClient = undefined;
}

module.exports = {
  ensureRidePaymentIntent,
  captureRidePayment,
  __setStripeClient,
  __resetStripeClient
};
