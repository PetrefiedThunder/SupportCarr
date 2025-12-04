require('dotenv').config();

const Stripe = require('stripe');
const logger = require('../config/logger');
const userRepository = require('../db/userRepository');
const rideRepository = require('../db/rideRepository');

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

  if (user.stripeCustomerId) {
    try {
      // Verify the customer still exists
      await stripe.customers.retrieve(user.stripeCustomerId);
      return user.stripeCustomerId;
    } catch {
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
  await userRepository.updateStripeCustomerId(user.id, customer.id);

  logger.info('Stripe customer created', {
    userId: user.id,
    customerId: customer.id
  });

  return customer.id;
}

async function ensureRidePaymentIntent({ ride, amountCents }) {
  const stripe = getStripeClient();

  try {
    // Get the rider user to ensure they have a Stripe customer
    const riderUser = await userRepository.findById(ride.riderId || ride.rider);
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
        await rideRepository.updateRide(ride.id, { paymentStatus: updatedIntent.status });
        return updatedIntent;
      }

      await rideRepository.updateRide(ride.id, { paymentStatus: existingIntent.status });
      return existingIntent;
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        capture_method: 'manual',
        customer: customerId,
        metadata: {
          rideId: ride.id,
          riderId: ride.riderId ? String(ride.riderId) : undefined,
          driverId: ride.driverId ? String(ride.driverId) : undefined
        }
      },
      {
        idempotencyKey: `ride_pi_${ride.id}`
      }
    );

    await rideRepository.updateRide(ride.id, {
      paymentIntentId: paymentIntent.id,
      paymentStatus: paymentIntent.status,
      lastPaymentError: null
    });

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

    await rideRepository.updateRide(ride.id, { lastPaymentError: error.message }).catch(() => {});

    throw new Error('Payment intent creation failed');
  }
}

async function captureRidePayment({ ride }) {
  const stripe = getStripeClient();

  try {
    if (!ride.paymentIntentId) {
      await ensureRidePaymentIntent({ ride, amountCents: ride.priceCents });
    }

    const capture = await stripe.paymentIntents.capture(
      ride.paymentIntentId,
      {},
      { idempotencyKey: `ride_capture_${ride.id}` }
    );

    ride.paymentStatus = 'processing';
    ride.lastPaymentError = null;
    await ride.save();

    logger.info('Stripe payment capture requested for ride', {
      rideId: ride.id,
      paymentIntentId: ride.paymentIntentId,
      captureId: capture.id
    });

    return capture;
  } catch (error) {
    logger.error('Failed to capture Stripe payment for ride', {
      rideId: ride.id,
      paymentIntentId: ride.paymentIntentId,
      error: error.message
    });

    await rideRepository
      .updateRide(ride.id, { paymentStatus: 'failed', lastPaymentError: error.message })
      .catch(() => {});

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
  getStripeClient,
  __setStripeClient,
  __resetStripeClient
};
