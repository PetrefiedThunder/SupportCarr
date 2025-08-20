const express = require('express');
const { body, validationResult } = require('express-validator');
const errorHandler = require('./errorHandler');

const app = express();
app.use(express.json());

const validateRideRequest = [
  body('pickupLocation').notEmpty().withMessage('pickupLocation is required'),
  body('dropoffLocation').notEmpty().withMessage('dropoffLocation is required'),
  body('passengerName').notEmpty().withMessage('passengerName is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ status: 400, errors: errors.array(), message: 'Validation error' });
    }
    next();
  },
];

app.post('/rides', validateRideRequest, (req, res) => {
  res.status(201).json({ message: 'Ride request received' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
