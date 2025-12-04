const { getDatabase } = require('../db/knex');
const logger = require('../config/logger');

const MILES_TO_METERS = 1609.34;
let schemaReady = false;

async function ensureSchema(trx) {
  if (schemaReady) {
    return;
  }

  await trx.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  await trx.raw(`
    CREATE TABLE IF NOT EXISTS driver_locations (
      driver_id TEXT PRIMARY KEY,
      location GEOGRAPHY(Point, 4326),
      active BOOLEAN NOT NULL DEFAULT false,
      available BOOLEAN NOT NULL DEFAULT false,
      last_ride_completed_at TIMESTAMPTZ NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await trx.raw('CREATE INDEX IF NOT EXISTS idx_driver_locations_location_gist ON driver_locations USING GIST (location)');
  schemaReady = true;
}

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
  const parsedRadiusMiles = Number(radiusMiles);

  if (!Number.isFinite(parsedRadiusMiles) || parsedRadiusMiles <= 0) {
    throw new Error('radiusMiles is required to search for drivers');
  }

  const searchRadiusMeters = parsedRadiusMiles * MILES_TO_METERS;

  return db.transaction(async (trx) => {
    try {
      await ensureSchema(trx);
      const { rows } = await trx.raw(
        `SELECT driver_id,
                ST_Distance(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS distance_meters,
                last_ride_completed_at
           FROM driver_locations
          WHERE active = TRUE
            AND available = TRUE
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

      const [best] = rows;

      await trx('drivers')
        .where({ id: best.driver_id })
        .update({ status: 'busy', updated_at: trx.fn.now() });

      return [{
        driverId: best.driver_id,
        distanceMeters: parseFloat(best.distance_meters),
        distanceMiles: parseFloat(best.distance_meters) / MILES_TO_METERS,
        lastRideCompletedAt: best.last_ride_completed_at
      }];
    } catch (error) {
      logger.error('Failed to lock best driver', { error: error.message });
      throw error;
    }
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
  findBestDrivers,
  markDriverAvailable
};
