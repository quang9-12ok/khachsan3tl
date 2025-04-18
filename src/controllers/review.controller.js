const Review = require('../models/review.model');
const Room = require('../models/room.model');
const User = require('../models/user.model');
const { Op } = require('sequelize');

// Get all reviews
exports.getAllReviews = async (req, res) => {
    try {
        const { roomId, status } = req.query;
        let whereCondition = {};
        
        if (roomId) {
            whereCondition.roomId = roomId; // Changed back to roomId
        }
        
        if (status) {
            whereCondition.status = status;
        } else {
            // By default, only show approved reviews to regular users
            if (!req.session.user || req.session.user.role !== 'admin') {
                // Comment out status check for now since status column might not exist
                // whereCondition.status = 'approved';
            }
        }
        
        const reviews = await Review.findAll({
            where: whereCondition,
            include: [
                {
                    model: User,
                    attributes: ['id', 'email'] // Removed fullName and avatar which might not exist
                },
                {
                    model: Room,
                    attributes: ['id', 'room_number', 'type']
                }
            ],
            order: [['id', 'DESC']] // Changed from createdAt to id since timestamps might not exist
        });
        
        return res.status(200).json({
            success: true,
            data: reviews
        });
    } catch (error) {
        console.error('Get all reviews error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi tải đánh giá',
            error: error.message
        });
    }
};

// Get review by ID
exports.getReviewById = async (req, res) => {
    try {
        const review = await Review.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    attributes: ['id', 'email'] // Removed fullName and avatar
                },
                {
                    model: Room,
                    attributes: ['id', 'room_number', 'type']
                }
            ]
        });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error('Get review by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi tải đánh giá',
            error: error.message
        });
    }
};

// Create a new review
exports.createReview = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Bạn cần đăng nhập để đánh giá'
            });
        }
        
        const { roomId, rating, comment } = req.body;
        
        if (!roomId || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc'
            });
        }
        
        // Check if room exists
        const room = await Room.findByPk(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phòng'
            });
        }
        
        // Create review with camelCase column names to match the database
        const review = await Review.create({
            userId: req.session.user.id,  // Changed back to userId
            roomId: roomId,               // Changed back to roomId
            rating,
            comment
        });
        
        return res.status(201).json({
            success: true,
            message: 'Đánh giá của bạn đã được gửi thành công',
            data: review
        });
    } catch (error) {
        console.error('Create review error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi tạo đánh giá',
            error: error.message
        });
    }
};

// Add this method to handle updating a review
exports.updateReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.session.user.id;
    const { rating, comment } = req.body;
    
    // Find the review
    const review = await Review.findOne({
      where: {
        id: reviewId,
        userId: userId
      }
    });
    
    if (!review) {
      req.flash('error', 'Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa');
      return res.redirect('/bookings/my');
    }
    
    // Validate rating
    const parsedRating = parseInt(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      req.flash('error', 'Đánh giá phải là số từ 1 đến 5');
      return res.redirect(`/reviews/${review.id}/edit`);
    }
    
    // Update the review
    review.rating = parsedRating;
    review.comment = comment;
    review.status = 'pending'; // Reset to pending for re-approval
    
    await review.save();
    
    req.flash('success', 'Đánh giá đã được cập nhật và đang chờ phê duyệt');
    res.redirect('/bookings/my');
  } catch (error) {
    console.error('Update review error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi cập nhật đánh giá: ' + error.message);
    res.redirect('/bookings/my');
  }
};

// Delete a review
exports.deleteReview = async (req, res) => {
    try {
        const reviewId = req.params.id;
        const userId = req.session.user.id;
        
        // Find the review
        const review = await Review.findByPk(reviewId);
        
        if (!review) {
            req.flash('error', 'Không tìm thấy đánh giá');
            return res.redirect('/bookings/my');
        }
        
        // Check if user is the owner or an admin
        if (review.userId !== userId && req.session.user.role !== 'admin') {
            req.flash('error', 'Bạn không có quyền xóa đánh giá này');
            return res.redirect('/bookings/my');
        }
        
        // Find the associated booking and update hasReview flag
        if (review.bookingId) {
            const Booking = require('../models/booking.model');
            const booking = await Booking.findByPk(review.bookingId);
            if (booking) {
                // Explicitly set hasReview to false
                booking.hasReview = false;
                await booking.save();
                console.log(`Updated booking ${booking.id} hasReview to false`);
            }
        }
        
        // Delete the review
        await review.destroy();
        console.log(`Deleted review ${reviewId}`);
        
        req.flash('success', 'Đánh giá đã được xóa thành công');
        
        // If this is an API request, return JSON
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({
                success: true,
                message: 'Đánh giá đã được xóa thành công',
                redirect: '/bookings/my'
            });
        }
        
        // Otherwise redirect to booking history
        return res.redirect('/bookings/my');
    } catch (error) {
        console.error('Delete review error:', error);
        
        // If this is an API request, return JSON
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi xóa đánh giá',
                error: error.message
            });
        }
        
        req.flash('error', 'Đã xảy ra lỗi khi xóa đánh giá: ' + error.message);
        return res.redirect('/bookings/my');
    }
};

// Approve a review (admin only)
exports.approveReview = async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền phê duyệt đánh giá'
            });
        }
        
        const review = await Review.findByPk(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá'
            });
        }
        
        await review.update({ status: 'approved' });
        
        return res.status(200).json({
            success: true,
            message: 'Phê duyệt đánh giá thành công'
        });
    } catch (error) {
        console.error('Approve review error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi phê duyệt đánh giá',
            error: error.message
        });
    }
};

// Reject a review (admin only)
exports.rejectReview = async (req, res) => {
    try {
        if (!req.session.user || req.session.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền từ chối đánh giá'
            });
        }
        
        const review = await Review.findByPk(req.params.id);
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đánh giá'
            });
        }
        
        await review.update({ status: 'rejected' });
        
        return res.status(200).json({
            success: true,
            message: 'Từ chối đánh giá thành công'
        });
    } catch (error) {
        console.error('Reject review error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi từ chối đánh giá',
            error: error.message
        });
    }
};

// Add this method to handle the edit review form
// Fix the getEditReviewForm method
exports.getEditReviewForm = async (req, res) => {
  try {
    // The middleware has already verified the review and booking
    const review = req.review;
    const booking = req.booking;
    
    if (!review) {
      req.flash('error', 'Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa');
      return res.redirect('/bookings/my');
    }
    
    res.render('review/edit', {
      title: 'Chỉnh sửa đánh giá',
      review,
      booking,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Get edit review form error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải form chỉnh sửa đánh giá: ' + error.message);
    res.redirect('/bookings/my');
  }
};

// Update the updateReview method
exports.updateReview = async (req, res) => {
  try {
    // The middleware has already verified the review
    const review = req.review;
    const { rating, comment } = req.body;
    
    if (!review) {
      req.flash('error', 'Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa');
      return res.redirect('/bookings/my');
    }
    
    // Validate rating
    const parsedRating = parseInt(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      req.flash('error', 'Đánh giá phải là số từ 1 đến 5');
      return res.redirect(`/reviews/${review.id}/edit`);
    }
    
    // Update the review
    review.rating = parsedRating;
    review.comment = comment;
    review.status = 'pending'; // Reset to pending for re-approval
    
    await review.save();
    
    req.flash('success', 'Đánh giá đã được cập nhật và đang chờ phê duyệt');
    res.redirect('/bookings/my');
  } catch (error) {
    console.error('Update review error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi cập nhật đánh giá: ' + error.message);
    res.redirect('/bookings/my');
  }
};

// Add this method to handle the review form
// Update the getReviewForm method
exports.getReviewForm = async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const booking = req.booking; // Get the booking from the middleware
        
        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/bookings/my');
        }
        
        // Room is already included in the booking from the middleware
        const room = booking.Room;
        
        if (!room) {
            req.flash('error', 'Không tìm thấy thông tin phòng');
            return res.redirect('/bookings/my');
        }
        
        // Check if user has already reviewed this booking
        const existingReview = req.existingReview;
        
        res.render('review/create', {
            title: 'Đánh giá phòng',
            booking,
            room,
            existingReview
        });
    } catch (error) {
        console.error('Get review form error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải form đánh giá: ' + error.message);
        res.redirect('/bookings/my');
    }
};

// Update the createReview method with better logging and validation
exports.createReview = async (req, res) => {
    try {
        const bookingId = req.params.bookingId;
        const { rating, comment } = req.body;
        const booking = req.booking;
        
        console.log('Review submission data:', {
            bookingId,
            rating,
            comment,
            userId: req.session.user?.id,
            hasBooking: !!booking
        });
        
        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/bookings/my');
        }
        
        // Validate rating - ensure it's a number between 1-5
        const parsedRating = parseInt(rating);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            console.log('Invalid rating:', rating, 'Parsed as:', parsedRating);
            req.flash('error', 'Đánh giá phải là số từ 1 đến 5');
            return res.redirect(`/reviews/${bookingId}/create`);
        }
        
        // Check if a review already exists
        if (req.existingReview) {
            console.log('Updating existing review:', req.existingReview.id);
            // Update the existing review
            req.existingReview.rating = parsedRating;
            req.existingReview.comment = comment;
            req.existingReview.status = 'pending'; // Reset to pending for re-approval
            
            // Add bookingId if it doesn't exist
            if (!req.existingReview.bookingId) {
                req.existingReview.bookingId = booking.id;
            }
            
            await req.existingReview.save();
            
            req.flash('success', 'Đánh giá của bạn đã được cập nhật và đang chờ phê duyệt');
        } else {
            console.log('Creating new review for booking:', booking.id);
            // Create a new review
            const newReview = await Review.create({
                userId: req.session.user.id,
                roomId: booking.roomId,
                bookingId: booking.id,
                rating: parsedRating, // Use the validated rating
                comment,
                status: 'pending' // Reviews need approval
            });
            
            console.log('New review created:', newReview.id);
            
            // Update booking to indicate it has a review
            booking.hasReview = true;
            await booking.save();
            
            req.flash('success', 'Đánh giá của bạn đã được gửi và đang chờ phê duyệt');
        }
        
        // Add a session variable to ensure the flash message is displayed
        req.session.reviewSubmitted = true;
        
        return res.redirect('/bookings/my');
    } catch (error) {
        console.error('Create review error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tạo đánh giá: ' + error.message);
        return res.redirect('/bookings/my');
    }
    
};

// Add this new method to find a review by booking ID and redirect to the edit page
exports.findReviewByBooking = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const userId = req.session.user.id;
    
    // First, find the booking to get the room ID
    const Booking = require('../models/booking.model');
    const booking = await Booking.findOne({
      where: {
        id: bookingId,
        userId: userId
      }
    });
    
    if (!booking) {
      req.flash('error', 'Không tìm thấy đặt phòng');
      return res.redirect('/bookings/my');
    }
    
    // Now find the review using the user ID and room ID
    const review = await Review.findOne({
      where: {
        userId: userId,
        roomId: booking.roomId
      }
    });
    
    if (!review) {
      req.flash('error', 'Không tìm thấy đánh giá cho đặt phòng này');
      return res.redirect('/bookings/my');
    }
    
    // Redirect to the edit page with the review ID
    return res.redirect(`/reviews/${review.id}/edit`);
  } catch (error) {
    console.error('Find review by booking error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tìm đánh giá: ' + error.message);
    return res.redirect('/bookings/my');
  }
};
