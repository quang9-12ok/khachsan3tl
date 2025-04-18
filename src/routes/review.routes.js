const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { verifyUser } = require('../middlewares/auth.middleware');
const { canReview, canEditReview } = require('../middlewares/review.middleware');

// Hiển thị tất cả đánh giá
router.get('/', reviewController.getAllReviews);

// Hiển thị form đánh giá (chỉ khi đã check-out)
router.get('/:bookingId/create', verifyUser, canReview, reviewController.getReviewForm);

// Tạo đánh giá mới (chỉ khi đã check-out)
router.post('/:bookingId/create', verifyUser, canReview, reviewController.createReview);

// Add this new route to find a review by booking ID
router.get('/:bookingId/find-edit', verifyUser, reviewController.findReviewByBooking);

// Edit review form - use the new middleware
router.get('/:id/edit', verifyUser, canEditReview, reviewController.getEditReviewForm);

// Update review - use the new middleware
router.post('/:id/update', verifyUser, canEditReview, reviewController.updateReview);

// Update the delete review route to handle both API and web requests
// Change from router.delete to router.all to handle both GET and DELETE requests
router.all('/:id/delete', verifyUser, reviewController.deleteReview);

// Admin routes
router.patch('/:id/approve', reviewController.approveReview);
router.patch('/:id/reject', reviewController.rejectReview);

module.exports = router;
