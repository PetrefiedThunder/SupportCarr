function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const details = err.errors || undefined;

  const response = { error: { message } };
  if (details) {
    response.error.details = details;
  }
  res.status(status).json(response);
}

module.exports = errorHandler;
