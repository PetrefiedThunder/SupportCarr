const { getDatabase } = require('./knex');

function mapDriver(row) {
  if (!row) return null;

  const hasLocation = row.location_lat !== undefined && row.location_lng !== undefined;

  return {
    id: row.id,
    userId: row.user_id,
    vehicleType: row.vehicle_type,
    vehicleDescription: row.vehicle_description,
    licensePlate: row.license_plate,
    active: row.active,
    status: row.status,
    location: hasLocation ? { lat: Number(row.location_lat), lng: Number(row.location_lng) } : row.location,
    serviceRadiusMiles: row.service_radius_miles,
    rating: row.rating,
    totalRides: row.total_rides,
    lastRideCompletedAt: row.last_ride_completed_at ? new Date(row.last_ride_completed_at) : null,
    stripeAccountId: row.stripe_account_id,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
  };
}

function mapDriverWithUser(row) {
  if (!row) return null;
  return {
    ...mapDriver(row),
    user: row.user_id
      ? {
          id: row.user_id,
          email: row.user_email,
          name: row.user_name,
          phoneNumber: row.user_phone_number
        }
      : null
  };
}

async function upsertDriver({ userId, vehicleType, vehicleDescription, licensePlate }) {
  const db = await getDatabase();
  const [row] = await db('drivers')
    .insert({
      user_id: userId,
      vehicle_type: vehicleType,
      vehicle_description: vehicleDescription,
      license_plate: licensePlate
    })
    .onConflict('user_id')
    .merge({
      vehicle_type: vehicleType,
      vehicle_description: vehicleDescription,
      license_plate: licensePlate,
      updated_at: db.fn.now()
    })
    .returning('*');

  return mapDriver(row);
}

async function findById(id) {
  const db = await getDatabase();
  const row = await db('drivers')
    .select(
      '*',
      db.raw('ST_Y(ST_AsText(location::geometry)) as location_lat'),
      db.raw('ST_X(ST_AsText(location::geometry)) as location_lng')
    )
    .where({ id })
    .first();
  return mapDriver(row);
}

async function findByUserId(userId) {
  const db = await getDatabase();
  const row = await db('drivers')
    .select(
      '*',
      db.raw('ST_Y(ST_AsText(location::geometry)) as location_lat'),
      db.raw('ST_X(ST_AsText(location::geometry)) as location_lng')
    )
    .where({ user_id: userId })
    .first();
  return mapDriver(row);
}

async function listAllWithUsers() {
  const db = await getDatabase();
  const rows = await db('drivers as d')
    .leftJoin('users as u', 'u.id', 'd.user_id')
    .select(
      'd.*',
      'u.id as user_id',
      'u.name as user_name',
      'u.email as user_email',
      'u.phone_number as user_phone_number',
      db.raw('ST_Y(ST_AsText(d.location::geometry)) as location_lat'),
      db.raw('ST_X(ST_AsText(d.location::geometry)) as location_lng')
    );
  return rows.map(mapDriverWithUser);
}

async function findWithUserById(id) {
  const db = await getDatabase();
  const row = await db('drivers as d')
    .leftJoin('users as u', 'u.id', 'd.user_id')
    .select(
      'd.*',
      'u.id as user_id',
      'u.name as user_name',
      'u.email as user_email',
      'u.phone_number as user_phone_number',
      db.raw('ST_Y(ST_AsText(d.location::geometry)) as location_lat'),
      db.raw('ST_X(ST_AsText(d.location::geometry)) as location_lng')
    )
    .where('d.id', id)
    .first();
  return mapDriverWithUser(row);
}

async function updateDriverStatusAndLocation({ driverId, active, location }) {
  const db = await getDatabase();
  const updates = { updated_at: db.fn.now() };

  if (typeof active === 'boolean') {
    updates.active = active;
    updates.status = active ? 'available' : 'offline';
  }

  if (location) {
    updates.location = db.raw('ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography', [
      location.lng,
      location.lat
    ]);
  }

  const [row] = await db('drivers').where({ id: driverId }).update(updates).returning('*');
  return mapDriver(row);
}

async function markDriverBusy(driverId) {
  const db = await getDatabase();
  const [row] = await db('drivers')
    .where({ id: driverId })
    .update({ status: 'busy', updated_at: db.fn.now() })
    .returning('*');
  return mapDriver(row);
}

async function markDriverAvailable(driverId, lastRideCompletedAt) {
  const db = await getDatabase();
  const updates = { status: 'available', updated_at: db.fn.now() };
  if (lastRideCompletedAt) {
    updates.last_ride_completed_at = lastRideCompletedAt;
  }
  const [row] = await db('drivers').where({ id: driverId }).update(updates).returning('*');
  return mapDriver(row);
}

async function incrementRideStats(driverId) {
  const db = await getDatabase();
  const [row] = await db('drivers')
    .where({ id: driverId })
    .update({
      total_rides: db.raw('COALESCE(total_rides, 0) + 1'),
      last_ride_completed_at: db.fn.now(),
      status: 'available',
      updated_at: db.fn.now()
    })
    .returning('*');
  return mapDriver(row);
}

module.exports = {
  upsertDriver,
  findById,
  findByUserId,
  listAllWithUsers,
  findWithUserById,
  updateDriverStatusAndLocation,
  markDriverBusy,
  markDriverAvailable,
  incrementRideStats
};
