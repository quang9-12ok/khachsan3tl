const Booking = require('../models/booking.model');
const Room = require('../models/room.model');
const User = require('../models/user.model');
const logger = require('../config/logger');
const { mailer } = require('../config/mailer');

// Process payment for a booking
exports.processPayment = async (req, res) => {
    try {
        const { bookingId, paymentMethod } = req.body;
        
        // Find the booking
        const booking = await Booking.findByPk(bookingId, {
            include: [
                {
                    model: Room,
                    as: 'Room'
                },
                {
                    model: User,
                    as: 'User'
                }
            ]
        });
        
        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/bookings/my');
        }
        
        // Check if booking belongs to the current user (unless admin)
        if (booking.userId !== req.session.user.id && req.session.user.role !== 'admin') {
            req.flash('error', 'Bạn không có quyền thanh toán đặt phòng này');
            return res.redirect('/bookings/my');
        }
        
        // Update booking payment status
        booking.paymentStatus = 'paid';
        
        // If checkout is completed, mark booking as completed
        if (booking.checkoutCompleted) {
            booking.status = 'completed';
            
            // Update room status to available
            if (booking.Room) {
                booking.Room.status = 'available';
                await booking.Room.save();
            }
        }
        
        await booking.save();
        
        // Log the payment
        logger.info(`Payment processed for booking ${booking.id} (${booking.bookingCode}) by user ${req.session.user.id}`);
        
        req.flash('success', 'Thanh toán thành công');
        res.redirect('/bookings/my');
    } catch (error) {
        console.error('Process payment error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi xử lý thanh toán: ' + error.message);
        res.redirect('/bookings/my');
    }
};

// Mark booking as checked out
exports.completeCheckout = async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        // Find the booking
        const booking = await Booking.findByPk(bookingId, {
            include: [
                {
                    model: Room,
                    as: 'Room'
                }
            ]
        });
        
        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/admin/bookings');
        }
        
        // Update booking checkout status
        booking.checkoutCompleted = true;
        
        // If payment is already completed, mark booking as completed
        if (booking.paymentStatus === 'paid') {
            booking.status = 'completed';
            
            // Update room status to available
            if (booking.Room) {
                booking.Room.status = 'available';
                await booking.Room.save();
            }
        }
        
        await booking.save();
        
        // Log the checkout
        logger.info(`Checkout completed for booking ${booking.id} (${booking.bookingCode}) by admin ${req.session.user.id}`);
        
        req.flash('success', 'Đã hoàn thành checkout');
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Complete checkout error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi hoàn thành checkout: ' + error.message);
        res.redirect('/admin/bookings');
    }
};
