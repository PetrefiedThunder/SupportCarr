const express = require('express');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema, refreshSchema } = require('../utils/validation');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', validate(refreshSchema), authController.logout);

module.exports = router;
