const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validationMiddleware = require('../middlewares/validation.middleware');

// Make sure you have these routes defined
router.get('/create', authMiddleware.isAuthenticated, bookingController.renderBookingForm);
router.post('/', authMiddleware.isAuthenticated, bookingController.createBooking);

// Lịch sử đặt phòng của người dùng
// Change from verifyUser to isAuthenticated
// Add or update these routes
router.get('/my', authMiddleware.isAuthenticated, bookingController.getMyBookings);
router.get('/history', authMiddleware.isAuthenticated, bookingController.getMyBookings);

// Hủy đặt phòng
// Add or update this route
router.post('/:id/cancel', authMiddleware.isAuthenticated, bookingController.cancelBooking);

// Xác nhận đặt phòng (Admin)
router.patch('/:id/confirm', authMiddleware.verifyAdmin, bookingController.confirmBooking);

// Lấy danh sách tất cả đặt phòng (Admin)
router.get('/', authMiddleware.verifyAdmin, bookingController.getAllBookings);

// Cập nhật đặt phòng
router.put('/:id', 
    authMiddleware.verifyUser, 
    validationMiddleware.validateBooking, 
    bookingController.updateBooking
);

// Xem chi tiết booking
router.get('/:id', bookingController.getBookingById);

// Xóa booking (Admin)
router.delete('/:id', authMiddleware.verifyAdmin, bookingController.deleteBooking);

// Add this route to your booking routes
router.get('/:id/confirmation', authMiddleware.isAuthenticated, bookingController.renderConfirmation);

// Export router
module.exports = router;