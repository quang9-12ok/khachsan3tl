const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const Room = require('../models/room.model');

exports.canReview = async (req, res, next) => {
    try {
        const bookingId = req.params.bookingId || req.body.bookingId;
        
        if (!bookingId) {
            req.flash('error', 'Không tìm thấy thông tin đặt phòng');
            return res.redirect('/bookings/my');
        }

        // Find the booking and check if it's paid
        const booking = await Booking.findOne({
            where: {
                id: bookingId,
                userId: req.session.user.id,
                // Allow reviews if payment is completed, regardless of checkout status
                paymentStatus: 'paid'
            },
            include: [
                {
                    model: Room,
                    as: 'Room'
                }
            ]
        });

        if (!booking) {
            req.flash('error', 'Bạn chỉ có thể đánh giá sau khi đã thanh toán');
            return res.redirect('/bookings/my');
        }

        // Find an existing review by userId and roomId
        const existingReview = await Review.findOne({
            where: { 
                userId: req.session.user.id,
                roomId: booking.roomId
            }
        });

        if (existingReview) {
            // If there's an existing review, store it in the request for potential editing
            req.existingReview = existingReview;
        }

        // Store the booking in the request for use in the controller
        req.booking = booking;

        next();
    } catch (error) {
        console.error('Review permission check error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi kiểm tra quyền đánh giá: ' + error.message);
        return res.redirect('/bookings/my');
    }
};

// Add a new middleware to check if user can edit a review
exports.canEditReview = async (req, res, next) => {
    try {
        const reviewId = req.params.id;
        const userId = req.session.user.id;
        
        // Find the review
        const review = await Review.findOne({
            where: {
                id: reviewId,
                userId: userId
            },
            include: [
                {
                    model: Room,
                    as: 'Room'
                }
            ]
        });
        
        if (!review) {
            req.flash('error', 'Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa');
            return res.redirect('/bookings/my');
        }
        
        // Find the booking associated with this review
        let booking = null;
        if (review.bookingId) {
            booking = await Booking.findOne({
                where: {
                    id: review.bookingId,
                    userId: userId
                },
                include: [{ model: Room, as: 'Room' }]
            });
        } else {
            // If no bookingId, find the booking by userId and roomId
            booking = await Booking.findOne({
                where: {
                    userId: userId,
                    roomId: review.roomId,
                    paymentStatus: 'paid'
                },
                include: [{ model: Room, as: 'Room' }]
            });
        }
        
        // Store the review and booking in the request
        req.review = review;
        req.booking = booking;
        
        next();
    } catch (error) {
        console.error('Review edit permission check error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi kiểm tra quyền chỉnh sửa đánh giá: ' + error.message);
        return res.redirect('/bookings/my');
    }
};