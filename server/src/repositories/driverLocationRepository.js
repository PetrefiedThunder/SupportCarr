const { getDatabase } = require('../db/knex');

const MILES_TO_METERS = 1609.34;
let schemaReady = false;

async function ensureSchema(client) {
  if (schemaReady) {
    return;
  }

  await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
  await client.query(`
    CREATE TABLE IF NOT EXISTS driver_locations (
      driver_id TEXT PRIMARY KEY,
      location GEOGRAPHY(Point, 4326),
      active BOOLEAN NOT NULL DEFAULT false,
      available BOOLEAN NOT NULL DEFAULT false,
      last_ride_completed_at TIMESTAMPTZ NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_driver_locations_location_gist ON driver_locations USING GIST (location)');
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
  const pool = getPostgresPool();
  const client = await pool.connect();
  const searchRadiusMeters = radiusMeters ?? (radiusMiles ? radiusMiles * MILES_TO_METERS : null);

  if (!searchRadiusMeters) {
    throw new Error('radiusMeters or radiusMiles is required to search for drivers');
  }

  try {
    await ensureSchema(client);
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT driver_id,
              ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters,
              last_ride_completed_at
         FROM driver_locations
        WHERE active = TRUE
          AND available = TRUE
          AND location IS NOT NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        ORDER BY last_ride_completed_at NULLS FIRST, distance_meters ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1`,
      [lng, lat, searchRadiusMeters]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return [];
    }

    await trx('drivers')
      .where({ id: candidate.id })
      .update({ status: 'busy', updated_at: trx.fn.now() });

    return [{
      driverId: best.driver_id,
      distanceMeters: Number(best.distance_meters),
      distanceMiles: Number(best.distance_meters) / MILES_TO_METERS,
      lastRideCompletedAt: best.last_ride_completed_at
    }];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to lock best driver', { error: error.message });
    throw error;
  } finally {
    client.release();
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
