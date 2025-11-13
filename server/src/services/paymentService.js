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

async function ensureStripeCustomer({ user }) {
  const stripe = getStripeClient();
  const User = require('../models/User');

  if (user.stripeCustomerId) {
    try {
      // Verify the customer still exists
      await stripe.customers.retrieve(user.stripeCustomerId);
      return user.stripeCustomerId;
    } catch (error) {
      // Customer doesn't exist, create a new one
      logger.warn('Stripe customer not found, creating new one', {
        userId: user.id,
        oldCustomerId: user.stripeCustomerId
      });
    }
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      userId: String(user.id)
    }
  });

  // Update user with customer ID
  await User.findByIdAndUpdate(user.id, {
    stripeCustomerId: customer.id
  });

  logger.info('Stripe customer created', {
    userId: user.id,
    customerId: customer.id
  });

  return customer.id;
}

async function ensureRidePaymentIntent({ ride, amountCents }) {
  const stripe = getStripeClient();
  const User = require('../models/User');

  try {
    // Get the rider user to ensure they have a Stripe customer
    const riderUser = await User.findById(ride.rider);
    if (!riderUser) {
      throw new Error('Rider not found');
    }

    const customerId = await ensureStripeCustomer({ user: riderUser });

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
      customer: customerId,
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
  ensureStripeCustomer,
  ensureRidePaymentIntent,
  captureRidePayment,
  __setStripeClient,
  __resetStripeClient
};
