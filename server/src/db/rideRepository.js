const { getDatabase } = require('./knex');

function mapRide(row) {
  if (!row) return null;

  return {
    id: row.id,
    riderId: row.rider_id,
    riderPhone: row.rider_phone,
    driverId: row.driver_id,
    pickup: row.pickup,
    dropoff: row.dropoff,
    bikeType: row.bike_type,
    distanceMiles: row.distance_miles,
    priceCents: row.price_cents,
    status: row.status,
    cancellationReason: row.cancellation_reason,
    driverEtaMinutes: row.driver_eta_minutes,
    notes: row.notes,
    paymentIntentId: row.payment_intent_id,
    paymentChargeId: row.payment_charge_id,
    paymentStatus: row.payment_status,
    paymentCapturedAt: row.payment_captured_at ? new Date(row.payment_captured_at) : null,
    lastPaymentError: row.last_payment_error,
    wtpAsked: row.wtp_asked,
    wtpResponse: row.wtp_response,
    wtpAmountUsd: row.wtp_amount_usd,
    assistRequired: row.assist_required,
    assistReason: row.assist_reason,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
  };
}

function mapRideWithDriver(row) {
  if (!row) return null;
  return {
    ...mapRide(row),
    rider: row.rider_id
      ? {
          id: row.rider_id,
          name: row.rider_name,
          phoneNumber: row.rider_phone_number,
          email: row.rider_email
        }
      : null,
    driver: row.driver_id
      ? {
          id: row.driver_id,
          user: row.driver_user_id
            ? {
                id: row.driver_user_id,
                name: row.driver_user_name,
                email: row.driver_user_email,
                phoneNumber: row.driver_user_phone
              }
            : null
        }
      : null
  };
}

async function createRide(data) {
  const db = await getDatabase();
  const [row] = await db('rides')
    .insert({
      rider_id: data.riderId,
      rider_phone: data.riderPhone,
      driver_id: data.driverId || null,
      pickup: data.pickup,
      dropoff: data.dropoff,
      bike_type: data.bikeType,
      distance_miles: data.distanceMiles,
      price_cents: data.priceCents,
      status: data.status,
      notes: data.notes,
      payment_intent_id: data.paymentIntentId || null,
      wtp_asked: data.wtpAsked ?? false
    })
    .returning('*');
  return mapRide(row);
}

async function updateRide(rideId, updates) {
  const db = await getDatabase();
  const payload = { updated_at: db.fn.now() };

  const mapping = {
    driverId: 'driver_id',
    status: 'status',
    driverEtaMinutes: 'driver_eta_minutes',
    cancellationReason: 'cancellation_reason',
    assistRequired: 'assist_required',
    assistReason: 'assist_reason',
    paymentIntentId: 'payment_intent_id',
    paymentChargeId: 'payment_charge_id',
    paymentStatus: 'payment_status',
    paymentCapturedAt: 'payment_captured_at',
    lastPaymentError: 'last_payment_error',
    wtpAsked: 'wtp_asked',
    wtpResponse: 'wtp_response',
    wtpAmountUsd: 'wtp_amount_usd'
  };

  Object.entries(mapping).forEach(([key, column]) => {
    if (updates[key] !== undefined) {
      payload[column] = updates[key];
    }
  });

  const [row] = await db('rides').where({ id: rideId }).update(payload).returning('*');
  return mapRide(row);
}

async function findById(rideId) {
  const db = await getDatabase();
  const row = await db('rides').where({ id: rideId }).first();
  return mapRide(row);
}

async function findByIdWithDriver(rideId) {
  const db = await getDatabase();
  const row = await db('rides as r')
    .leftJoin('drivers as d', 'd.id', 'r.driver_id')
    .leftJoin('users as u', 'u.id', 'd.user_id')
    .leftJoin('users as rider', 'rider.id', 'r.rider_id')
    .select(
      'r.*',
      'd.user_id as driver_user_id',
      'u.name as driver_user_name',
      'u.email as driver_user_email',
      'u.phone_number as driver_user_phone',
      'rider.name as rider_name',
      'rider.email as rider_email',
      'rider.phone_number as rider_phone_number'
    )
    .where('r.id', rideId)
    .first();
  return mapRideWithDriver(row);
}

async function listByRider(riderId) {
  const db = await getDatabase();
  const rows = await db('rides').where({ rider_id: riderId }).orderBy('created_at', 'desc');
  return rows.map(mapRide);
}

async function listActiveByDriver(driverId) {
  const db = await getDatabase();
  const rows = await db('rides')
    .where({ driver_id: driverId })
    .whereIn('status', ['accepted', 'en_route'])
    .orderBy('created_at', 'desc');
  return rows.map(mapRide);
}

async function findLatestWtpRideForPhone(phone) {
  const db = await getDatabase();
  const row = await db('rides')
    .where({ rider_phone: phone, wtp_asked: true })
    .whereNull('wtp_response')
    .orderBy('created_at', 'desc')
    .first();
  return mapRide(row);
}

module.exports = {
  createRide,
  updateRide,
  findById,
  findByIdWithDriver,
  listByRider,
  listActiveByDriver,
  findLatestWtpRideForPhone
};
