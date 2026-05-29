export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// Centralised error handler. Keeps stack traces out of responses.
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.expose ? err.message : status >= 500 ? 'Internal server error' : err.message || 'Request failed',
  });
}
