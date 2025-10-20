import express from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(express.json());

const rideRequestSchema = z.object({
  riderId: z.string(),
  pickup: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

app.post('/v1/rides', (req, res, next) => {
  try {
    const { riderId } = rideRequestSchema.parse(req.body);
    const rideId = uuid();
    res.status(201).json({ ride_id: rideId, rider_id: riderId });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

export default app;
