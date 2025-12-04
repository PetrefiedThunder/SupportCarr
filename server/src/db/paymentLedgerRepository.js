const { getDatabase } = require('./knex');

function mapLedger(row) {
  if (!row) return null;

  return {
    id: row.id,
    stripeEventId: row.stripe_event_id,
    type: row.type,
    payload: row.payload,
    rideId: row.ride_id,
    paymentIntentId: row.payment_intent_id,
    chargeId: row.charge_id,
    processedAt: row.processed_at ? new Date(row.processed_at) : null,
    processingError: row.processing_error,
    createdAt: row.created_at ? new Date(row.created_at) : undefined
  };
}

async function findByStripeEventId(stripeEventId) {
  const db = await getDatabase();
  const row = await db('payment_ledgers').where({ stripe_event_id: stripeEventId }).first();
  return mapLedger(row);
}

async function createLedger({ stripeEventId, type, payload, rideId, paymentIntentId, chargeId }) {
  const db = await getDatabase();
  const [row] = await db('payment_ledgers')
    .insert({
      stripe_event_id: stripeEventId,
      type,
      payload,
      ride_id: rideId,
      payment_intent_id: paymentIntentId,
      charge_id: chargeId
    })
    .returning('*');
  return mapLedger(row);
}

async function markLedgerProcessed(id, { processingError = null }) {
  const db = await getDatabase();
  const [row] = await db('payment_ledgers')
    .where({ id })
    .update({ processed_at: db.fn.now(), processing_error: processingError })
    .returning('*');
  return mapLedger(row);
}

module.exports = {
  findByStripeEventId,
  createLedger,
  markLedgerProcessed
};
