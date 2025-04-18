const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/process', authMiddleware.verifyUser, paymentController.processPayment);

module.exports = router;
