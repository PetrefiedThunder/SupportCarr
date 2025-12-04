const express = require('express');
const authRoutes = require('./authRoutes');
const rideRoutes = require('./rideRoutes');
const driverRoutes = require('./driverRoutes');
const healthRoutes = require('./healthRoutes');
const twilioRoutes = require('./twilioRoutes');
const paymentRoutes = require('./paymentRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/rides', rideRoutes);
router.use('/drivers', driverRoutes);
router.use('/twilio', twilioRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;
