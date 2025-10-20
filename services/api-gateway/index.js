const express = require('express');
const pkceJwt = require('../../src/middleware/pkceJwt');
const validateEvent = require('../../src/middleware/validateEvent');
const validateRideRequest = require('../../src/middleware/validateRideRequest');
const errorHandler = require('../../src/middleware/errorHandler');

const app = express();
app.use(express.json());

const apiRouter = express.Router();
apiRouter.post('/events', validateEvent, (req, res) => {
  res.status(202).json({ status: 'accepted' });
});

app.use('/api', pkceJwt, apiRouter);

app.post('/rides', validateRideRequest, (req, res) => {
  res.status(201).json({ message: 'Ride request received' });
});

app.get('/v1/rides', (req, res) => {
  res.json({ rideId: 'mock-ride-id' });
});

app.use(errorHandler);

module.exports = app;
