const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');

// Review routes
router.get('/reviews', reviewController.getAllReviews);
router.get('/reviews/:id', reviewController.getReviewById);
router.post('/reviews', reviewController.createReview);
router.put('/reviews/:id', reviewController.updateReview);
router.delete('/reviews/:id', reviewController.deleteReview);
router.patch('/reviews/:id/approve', reviewController.approveReview);
router.patch('/reviews/:id/reject', reviewController.rejectReview);

module.exports = router;