process.env.STRIPE_SECRET_KEY = 'sk_test_mocked';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

const Ride = require('../../models/Ride');
const PaymentLedger = require('../../models/PaymentLedger');
const paymentService = require('../../services/paymentService');
const { handleStripeWebhook } = require('../../services/paymentWebhookService');

const baseStripeClient = () => ({
  webhooks: {
    constructEvent: jest.fn()
  },
  balanceTransactions: {
    retrieve: jest.fn().mockResolvedValue({ fee: 180 })
  }
});

describe('paymentWebhookService.handleStripeWebhook', () => {
  let stripeClient;

  beforeEach(() => {
    stripeClient = baseStripeClient();
    paymentService.__setStripeClient(stripeClient);
  });

  afterEach(() => {
    paymentService.__resetStripeClient();
    jest.clearAllMocks();
  });

  it('persists ledger events and reconciles ride payments idempotently', async () => {
    const ride = await Ride.create({
      rider: 'user_1',
      riderPhone: '+15555550123',
      paymentIntentId: 'pi_test',
      status: 'completed'
    });

    const eventBody = {
      id: 'evt_ledger_1',
      type: 'payment_intent.succeeded',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'pi_test',
          status: 'succeeded',
          amount_received: 4200,
          currency: 'usd',
          metadata: { rideId: ride.id },
          charges: { data: [{ id: 'ch_1', balance_transaction: 'txn_1' }] }
        }
      }
    };

    stripeClient.webhooks.constructEvent.mockReturnValue(eventBody);

    const rawBody = Buffer.from(JSON.stringify(eventBody));
    const ledger = await handleStripeWebhook({
      rawBody,
      signature: 'sig_test',
      idempotencyKey: 'idem-ledger-1'
    });

    expect(ledger.idempotencyKey).toBe('idem-ledger-1');
    expect(ledger.processedAt).toBeInstanceOf(Date);
    expect(PaymentLedger.__store).toHaveLength(1);

    const reconciledRide = await Ride.findById(ride.id);
    expect(reconciledRide.paymentStatus).toBe('succeeded');
    expect(reconciledRide.paymentChargeId).toBe('ch_1');

    // Retry with the same event should not duplicate processing
    const duplicate = await handleStripeWebhook({
      rawBody,
      signature: 'sig_test',
      idempotencyKey: 'idem-ledger-1'
    });

    expect(PaymentLedger.__store).toHaveLength(1);
    expect(duplicate.id).toBe(ledger.id);
    expect(stripeClient.balanceTransactions.retrieve).toHaveBeenCalledWith('txn_1');
  });

  it('rejects webhook calls without an idempotency key', async () => {
    const rawBody = Buffer.from('{}');
    await expect(
      handleStripeWebhook({ rawBody, signature: 'sig_test' })
    ).rejects.toThrow('Missing Idempotency-Key header');
  });
});
