const express = require('express');
const authRoutes = require('./authRoutes');
const rideRoutes = require('./rideRoutes');
const driverRoutes = require('./driverRoutes');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/rides', rideRoutes);
router.use('/drivers', driverRoutes);

module.exports = router;
