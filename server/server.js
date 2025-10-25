require('dotenv').config();
const http = require('http');
const createApp = require('./src/app');
const { connectDatabase } = require('./src/config/database');
const { getRedisClient } = require('./src/config/redis');
const logger = require('./src/config/logger');

async function start() {
  const port = process.env.PORT || 4000;
  const app = createApp();
  const server = http.createServer(app);

  await connectDatabase();
  await getRedisClient();

  server.listen(port, () => {
    logger.info(`SupportCarr API listening on port ${port}`);
  });
}

start().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
