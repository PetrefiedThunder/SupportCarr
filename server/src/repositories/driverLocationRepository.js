const { getDatabase } = require('../db/knex');
const logger = require('../config/logger');

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

async function findBestDrivers({ lat, lng, radiusMiles }) {
  const db = await getDatabase();
  const searchRadiusMeters = radiusMiles ? radiusMiles * MILES_TO_METERS : 5000;

  try {
    return await db.transaction(async (trx) => {
      // Find the best driver using raw PostGIS query from drivers table
      const { rows } = await trx.raw(
        `SELECT id AS driver_id,
                ST_Distance(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS distance_meters,
                last_ride_completed_at
           FROM drivers
          WHERE active = TRUE
            AND status = 'available'
            AND location IS NOT NULL
            AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
          ORDER BY last_ride_completed_at NULLS FIRST, distance_meters ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1`,
        [lng, lat, lng, lat, searchRadiusMeters]
      );

      if (!rows.length) {
        return [];
      }

      const best = rows[0];

      // Mark the driver as busy (atomically within the same transaction)
      await trx('drivers')
        .where({ id: best.driver_id })
        .update({
          status: 'busy',
          updated_at: trx.fn.now()
        });

      // Return the result mapped to service layer's expectation
      return [{
        driverId: best.driver_id,
        distanceMeters: Number(best.distance_meters),
        distanceMiles: Number(best.distance_meters) / MILES_TO_METERS,
        lastRideCompletedAt: best.last_ride_completed_at
      }];
    });
  } catch (error) {
    // Knex transaction automatically rolls back on error
    logger.error('Failed to lock best driver', { error: error.message });
    throw error;
  }
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
  findBestDrivers,
  markDriverAvailable
};
