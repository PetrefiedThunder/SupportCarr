exports.up = async function (knex) {
  await knex.schema.createTable('payment_ledgers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('stripe_event_id').notNullable().unique();
    table.string('type').notNullable();
    table.jsonb('payload').notNullable();
    table.uuid('ride_id');
    table.string('payment_intent_id');
    table.string('charge_id');
    table.timestamp('processed_at');
    table.string('processing_error');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('payment_ledgers');
};
