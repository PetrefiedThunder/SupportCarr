const express = require('express');
const authenticate = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { rideCreationSchema, rideUpdateSchema } = require('../utils/validation');
const rideController = require('../controllers/rideController');

const router = express.Router();

router.post('/', authenticate(['rider', 'admin']), validate(rideCreationSchema), rideController.createRide);
router.get('/', authenticate(['rider', 'admin']), rideController.listUserRides);
router.patch('/:rideId', authenticate(['driver', 'admin']), validate(rideUpdateSchema), rideController.updateRide);
router.get('/drivers/:driverId', authenticate(['driver', 'admin']), rideController.listDriverRides);

module.exports = router;
