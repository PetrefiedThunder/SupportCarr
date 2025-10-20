import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
}
