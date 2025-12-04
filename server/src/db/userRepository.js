const { getDatabase } = require('./knex');

function mapUser(row) {
  if (!row) return null;

  const refreshTokens = (row.refresh_tokens || []).map((entry) => ({
    ...entry,
    expiresAt: entry.expiresAt ? new Date(entry.expiresAt) : entry.expiresAt
  }));

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    name: row.name,
    phoneNumber: row.phone_number,
    stripeCustomerId: row.stripe_customer_id,
    refreshTokens,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined
  };
}

async function createUser({ email, passwordHash, name, phoneNumber, role }) {
  const db = await getDatabase();
  const [row] = await db('users')
    .insert({
      email,
      password_hash: passwordHash,
      role,
      name,
      phone_number: phoneNumber,
      refresh_tokens: JSON.stringify([])
    })
    .returning('*');

  return mapUser(row);
}

async function findByEmail(email) {
  const db = await getDatabase();
  const row = await db('users').where({ email }).first();
  return mapUser(row);
}

async function findById(id) {
  const db = await getDatabase();
  const row = await db('users').where({ id }).first();
  return mapUser(row);
}

async function findByRefreshToken(refreshToken) {
  const db = await getDatabase();
  const row = await db('users')
    .whereRaw('refresh_tokens @> ?', [JSON.stringify([{ token: refreshToken }])])
    .first();
  return mapUser(row);
}

async function appendRefreshToken(userId, tokenEntry) {
  const db = await getDatabase();
  const user = await findById(userId);
  if (!user) return null;

  const refreshed = [...(user.refreshTokens || []), tokenEntry];
  const [row] = await db('users')
    .where({ id: userId })
    .update({ refresh_tokens: JSON.stringify(refreshed), updated_at: db.fn.now() })
    .returning('*');
  return mapUser(row);
}

async function removeRefreshToken(refreshToken) {
  const db = await getDatabase();
  const user = await findByRefreshToken(refreshToken);
  if (!user) return null;

  const filtered = (user.refreshTokens || []).filter((entry) => entry.token !== refreshToken);
  const [row] = await db('users')
    .where({ id: user.id })
    .update({ refresh_tokens: JSON.stringify(filtered), updated_at: db.fn.now() })
    .returning('*');
  return mapUser(row);
}

async function updateStripeCustomerId(userId, stripeCustomerId) {
  const db = await getDatabase();
  const [row] = await db('users')
    .where({ id: userId })
    .update({ stripe_customer_id: stripeCustomerId, updated_at: db.fn.now() })
    .returning('*');
  return mapUser(row);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findByRefreshToken,
  appendRefreshToken,
  removeRefreshToken,
  updateStripeCustomerId
};
