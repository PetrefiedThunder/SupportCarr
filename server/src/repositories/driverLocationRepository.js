const { getDatabase } = require('../db/knex');

const MILES_TO_METERS = 1609.34;

async function upsertDriverLocation({ driverId, lat, lng, active }) {
  const db = await getDatabase();
  const [row] = await db('drivers')
    .where({ id: driverId })
    .update({
      location: db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography', [lng, lat]),
      active: Boolean(active),
      status: Boolean(active) ? 'available' : 'offline',
      updated_at: db.fn.now()
    })
    .returning('*');

  if (!row) {
    throw new Error('Driver not found');
  }
}

async function findAndLockBestDriver({ lat, lng, radiusMiles }) {
  const db = await getDatabase();
  const radiusMeters = radiusMiles * MILES_TO_METERS;

  return db.transaction(async (trx) => {
    const candidate = await trx('drivers')
      .select(
        'id',
        'last_ride_completed_at',
        trx.raw('ST_Distance(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) as distance_meters', [
          lng,
          lat
        ])
      )
      .where({ active: true })
      .where({ status: 'available' })
      .whereNotNull('location')
      .whereRaw('ST_DWithin(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)', [
        lng,
        lat,
        radiusMeters
      ])
      .orderByRaw('last_ride_completed_at NULLS FIRST, distance_meters ASC')
      .forUpdate()
      .skipLocked()
      .first();

    if (!candidate) {
      return null;
    }

    await trx('drivers')
      .where({ id: candidate.id })
      .update({ status: 'busy', updated_at: trx.fn.now() });

    return {
      driverId: candidate.id,
      distanceMeters: Number(candidate.distance_meters),
      distanceMiles: Number(candidate.distance_meters) / MILES_TO_METERS,
      lastRideCompletedAt: candidate.last_ride_completed_at
    };
  });
}

async function markDriverAvailable(driverId, lastRideCompletedAt = null) {
  const db = await getDatabase();
  await db('drivers')
    .where({ id: driverId })
    .update({
      status: 'available',
      active: true,
      last_ride_completed_at: lastRideCompletedAt || db.raw('last_ride_completed_at'),
      updated_at: db.fn.now()
    });
}

module.exports = {
  upsertDriverLocation,
  findAndLockBestDriver,
  markDriverAvailable
};
