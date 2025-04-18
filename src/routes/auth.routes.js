const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Login routes
router.get('/login', authController.getLoginPage);
router.post('/login', authController.login);

// Register routes
router.get('/register', authController.getRegisterPage);
// Check if you have a route like this:
router.post('/register', authController.register);

// Logout route
router.get('/logout', authController.logout);

// Add or verify this route exists
router.get('/login', authController.getLoginPage);

module.exports = router;
