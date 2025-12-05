const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());

  // SECURITY: CORS configuration
  // In development, CORS_ORIGIN should be set (e.g., http://localhost:3000)
  // In production with Docker, frontend is served from same origin (no CORS needed)
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin && process.env.NODE_ENV !== 'production') {
    throw new Error('CORS_ORIGIN environment variable is required in development');
  }
  if (corsOrigin) {
    app.use(cors({ origin: corsOrigin, credentials: true }));
  }

  // Stripe webhooks require the raw body to validate signatures
  app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api/payments/stripe/webhook')) {
      return next();
    }
    return express.json()(req, res, next);
  });
  app.use(morgan('dev'));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
    })
  );

  app.get('/api/healthz', (req, res) => res.json({ status: 'ok' }));
  app.use('/api', routes);

  // Serve React PWA in production
  if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientBuildPath));

    // Catch-all handler for React Router
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

module.exports = createApp;
