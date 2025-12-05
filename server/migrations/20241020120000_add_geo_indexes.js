exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_drivers_location_gist ON drivers USING GIST (location)');
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_rides_pickup_location_gist ON rides USING GIST (pickup_location)');
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_rides_pickup_location_gist');
  await knex.raw('DROP INDEX IF EXISTS idx_drivers_location_gist');
};
