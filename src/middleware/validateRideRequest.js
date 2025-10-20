const { body, validationResult } = require('express-validator');

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

module.exports = validateRideRequest;
