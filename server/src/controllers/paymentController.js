const { handleStripeWebhook } = require('../services/paymentWebhookService');

async function stripeWebhook(req, res, next) {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe-Signature header' });
    }

    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      return res.status(400).json({ error: 'Missing Idempotency-Key header' });
    }

    const ledger = await handleStripeWebhook({
      rawBody: req.body,
      signature,
      idempotencyKey
    });

    return res.status(200).json({ received: true, ledgerId: ledger.id });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  stripeWebhook
};
