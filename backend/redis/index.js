const { createClient } = require('redis');

const client = createClient({ url: process.env.REDIS_URL });

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

async function init() {
  await client.connect();
  // Example geospatial index for regions
  await client.geoAdd('regions', [{ longitude: 0, latitude: 0, member: 'origin' }]);
  // Example stream for events
  try {
    await client.xGroupCreate('events', 'event_consumers', '$', { MKSTREAM: true });
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) {
      throw err;
    }
  }
}

module.exports = { client, init };
