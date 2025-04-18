const express = require('express');
const router = express.Router();
const viewController = require('../controllers/view.controller');

// Home page
router.get('/', (req, res) => {
    res.render('pages/home', { 
        title: 'Trang chủ',
        user: req.session.user,
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// About page
router.get('/about', viewController.getAboutPage);

// Contact page - Sửa lại để sử dụng controller đúng
router.get('/contact', (req, res) => {
    res.render('pages/contact', {
        title: 'Liên hệ',
        user: req.session.user,
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Reviews page
router.get('/reviews', viewController.getReviewsPage);

// Newsletter subscription
router.post('/newsletter/subscribe', viewController.subscribeNewsletter);

module.exports = router;
