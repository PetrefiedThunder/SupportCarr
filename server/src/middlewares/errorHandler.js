const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error('Request failed', { error: err.message, stack: err.stack });
  if (err.isJoi) {
    return res.status(400).json({ message: err.message, details: err.details });
  }
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Unexpected error' });
}

module.exports = errorHandler;
