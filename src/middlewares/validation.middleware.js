const { body, validationResult } = require('express-validator');

// Định nghĩa các middleware validation
const validateBooking = [
    body('roomId')
        .isInt()
        .withMessage('Room ID phải là một số nguyên'),
    
    body('checkInDate')
        .isISO8601()
        .withMessage('Ngày nhận phòng không hợp lệ')
        .custom((value) => {
            if (new Date(value) < new Date()) {
                throw new Error('Ngày nhận phòng phải từ ngày hiện tại trở đi');
            }
            return true;
        }),
    
    body('checkOutDate')
        .isISO8601()
        .withMessage('Ngày trả phòng không hợp lệ')
        .custom((value, { req }) => {
            if (new Date(value) <= new Date(req.body.checkInDate)) {
                throw new Error('Ngày trả phòng phải sau ngày nhận phòng');
            }
            return true;
        }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateRegister = [
    body('name')
        .notEmpty()
        .withMessage('Tên không được để trống')
        .isLength({ min: 2 })
        .withMessage('Tên phải có ít nhất 2 ký tự'),
    
    body('email')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail(),
    
    body('password')
        .isLength({ min: 6 })
        .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
        .matches(/\d/)
        .withMessage('Mật khẩu phải chứa ít nhất 1 số'),
    
    body('phone')
        .optional()
        .matches(/^[0-9]{10}$/)
        .withMessage('Số điện thoại không hợp lệ'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Email không hợp lệ'),
    body('password')
        .notEmpty()
        .withMessage('Mật khẩu không được để trống'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateChangePassword = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Mật khẩu hiện tại không được để trống'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateRoom = [
    body('room_number')
        .notEmpty()
        .withMessage('Số phòng không được để trống'),
    
    body('type')
        .isIn(['single', 'double', 'suite'])
        .withMessage('Loại phòng không hợp lệ'),
    
    body('price')
        .isFloat({ min: 0 })
        .withMessage('Giá phòng phải là số dương'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateReview = [
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Đánh giá phải từ 1 đến 5 sao'),
    
    body('comment')
        .optional()
        .isLength({ min: 10 })
        .withMessage('Nhận xét phải có ít nhất 10 ký tự'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

// Export tất cả các middleware
module.exports = {
    validateBooking,
    validateRegister,
    validateLogin,
    validateChangePassword,
    validateRoom,
    validateReview
};
