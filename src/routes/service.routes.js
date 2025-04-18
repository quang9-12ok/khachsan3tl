const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');

// Service routes
router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);

module.exports = router;
