const express = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { driverUpsertSchema, driverUpdateSchema } = require('../utils/validation');
const driverController = require('../controllers/driverController');

const router = express.Router();

router.post('/', authenticate(['driver']), validate(driverUpsertSchema), driverController.upsertDriver);
router.patch('/:driverId', authenticate(['driver', 'admin']), validate(driverUpdateSchema), driverController.updateDriver);

module.exports = router;
