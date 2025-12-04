/**
 * Initial relational schema for SupportCarr
 */
exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('role').notNullable().defaultTo('rider');
    table.string('name').notNullable();
    table.string('phone_number').notNullable();
    table.string('stripe_customer_id');
    table.jsonb('refresh_tokens').defaultTo('[]');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('drivers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('vehicle_type').notNullable();
    table.string('vehicle_description');
    table.string('license_plate');
    table.boolean('active').notNullable().defaultTo(false);
    table.string('status').notNullable().defaultTo('offline');
    table.specificType('location', 'geography(POINT,4326)');
    table.decimal('service_radius_miles', 5, 2).defaultTo(10);
    table.decimal('rating', 2, 1).defaultTo(5.0);
    table.integer('total_rides').defaultTo(0);
    table.timestamp('last_ride_completed_at');
    table.string('stripe_account_id');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('rides', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('rider_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.string('rider_phone').index();
    table
      .uuid('driver_id')
      .references('id')
      .inTable('drivers')
      .onDelete('SET NULL');
    table.jsonb('pickup').notNullable();
    table.jsonb('dropoff').notNullable();
    table.string('bike_type').notNullable().defaultTo('analog');
    table.decimal('distance_miles', 8, 2);
    table.integer('price_cents');
    table.string('status').notNullable().defaultTo('requested');
    table.string('cancellation_reason');
    table.integer('driver_eta_minutes');
    table.text('notes');
    table.string('payment_intent_id');
    table.string('payment_charge_id');
    table.string('payment_status');
    table.timestamp('payment_captured_at');
    table.text('last_payment_error');
    table.boolean('wtp_asked').notNullable().defaultTo(false);
    table.string('wtp_response');
    table.decimal('wtp_amount_usd', 8, 2);
    table.boolean('assist_required').notNullable().defaultTo(false);
    table.string('assist_reason');
    table.timestamps(true, true);
    table.index(['status', 'created_at']);
    table.index(['driver_id', 'status']);
    table.index(['rider_id', 'created_at']);
  });

  await knex.schema.createTable('zones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.specificType('polygon', 'geometry(POLYGON,4326)').notNullable();
    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('zones');
  await knex.schema.dropTableIfExists('rides');
  await knex.schema.dropTableIfExists('drivers');
  await knex.schema.dropTableIfExists('users');
};
