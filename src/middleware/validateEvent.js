const { body, validationResult } = require('express-validator');

const validateEvent = [
  body('id').isString(),
  body('type').isString(),
  body('timestamp').isISO8601(),
  body('region_id').isInt().toInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ status: 400, errors: errors.array(), message: 'Validation error' });
    }
    next();
  }
];

module.exports = validateEvent;
