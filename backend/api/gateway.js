const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Validation middleware for incoming event payloads
const validateEvent = [
  body('id').isString(),
  body('type').isString(),
  body('timestamp').isISO8601(),
  body('region_id').isInt().toInt(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

router.post('/events', validateEvent, (req, res) => {
  // Event processing would occur here
  res.status(202).json({ status: 'accepted' });
});

module.exports = router;
