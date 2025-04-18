const Room = require('../models/room.model');
const Service = require('../models/service.model');
const Review = require('../models/review.model');
const User = require('../models/user.model');
const Booking = require('../models/booking.model');
const { Op } = require('sequelize');

// Home page
exports.getHomePage = async (req, res) => {
    try {
        // Lấy 3 phòng nổi bật (có thể dựa vào rating, giá, hoặc bất kỳ tiêu chí nào)
        const featuredRooms = await Room.findAll({
            limit: 3,
            order: [['price', 'DESC']] // Ví dụ: lấy 3 phòng có giá cao nhất
        });
        
        // Lấy các đánh giá nổi bật
        const featuredReviews = await Review.findAll({
            where: { status: 'approved' },
            limit: 3,
            order: [['rating', 'DESC'], ['createdAt', 'DESC']],
            include: [
                {
                    model: Room,
                    attributes: ['id', 'type']
                }
            ]
        });
        
        // Thay đổi từ 'index' sang 'pages/home'
        res.render('pages/home', { 
            title: 'Trang chủ',
            featuredRooms,
            featuredReviews,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Home page error:', error);
        // Thay đổi từ 'index' sang 'pages/home'
        res.render('pages/home', { 
            title: 'Trang chủ',
            error: 'Đã xảy ra lỗi khi tải trang chủ'
        });
    }
};

// About page
exports.getAboutPage = (req, res) => {
    res.render('pages/about', {
        title: 'Về chúng tôi',
        success: req.flash('success'),
        error: req.flash('error')
    });
};

// Contact page
exports.getContactPage = (req, res) => {
    res.render('pages/contact', {
        title: 'Liên hệ',
        user: req.session.user,
        success: req.flash('success'),
        error: req.flash('error')
    });
};

// Reviews page
exports.getReviewsPage = async (req, res) => {
    try {
        const reviews = await Review.findAll({
            order: [['created_at', 'DESC']],
            include: [
                {
                    model: Room,
                    attributes: ['id', 'type', 'room_number']
                },
                {
                    model: User,
                    attributes: ['id', 'name']
                }
            ]
        });
        
        res.render('pages/reviews', {
            title: 'Đánh giá',
            reviews,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Get reviews page error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải trang đánh giá');
        res.redirect('/');
    }
};

// Newsletter subscription
exports.subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Lưu email vào database hoặc gửi đến dịch vụ email
        console.log('Newsletter subscription:', email);
        
        req.flash('success', 'Đăng ký nhận thông tin thành công!');
        res.redirect('back');
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi đăng ký');
        res.redirect('back');
    }
};