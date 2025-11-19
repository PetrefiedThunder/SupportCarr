const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());

  // SECURITY: Require explicit CORS_ORIGIN configuration
  // In development, CORS_ORIGIN should be set (e.g., http://localhost:3000)
  // In production, this MUST be set to the exact frontend origin
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin) {
    throw new Error('CORS_ORIGIN environment variable is required');
  }
  app.use(cors({ origin: corsOrigin, credentials: true }));

  app.use(express.json());
  app.use(morgan('dev'));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
    })
  );

  app.get('/api/healthz', (req, res) => res.json({ status: 'ok' }));
  app.use('/api', routes);

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
