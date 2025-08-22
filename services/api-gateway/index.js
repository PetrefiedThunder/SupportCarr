const express = require('express');

const app = express();

app.get('/v1/rides', (req, res) => {
  res.json({ rideId: 'mock-ride-id' });
});

module.exports = app;
