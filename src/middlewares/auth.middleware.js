const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

exports.verifyUser = async (req, res, next) => {
    try {
        // Kiểm tra xem user đã đăng nhập chưa (thông qua session)
        if (!req.session.user) {
            req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
            return res.redirect('/auth/login');  // Đường dẫn đã cập nhật
        }

        // Lấy token từ session
        const token = req.session.user.token;
        if (!token) {
            req.flash('error', 'Phiên đăng nhập đã hết hạn');
            return res.redirect('/auth/login');  // Đường dẫn đã cập nhật
        }

        // Xác thực token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Kiểm tra user có tồn tại trong DB không
        const user = await User.findByPk(decoded.id);
        if (!user) {
            req.flash('error', 'Người dùng không tồn tại');
            return res.redirect('/auth/login');  // Đường dẫn đã cập nhật
        }

        // Lưu thông tin user vào request để sử dụng ở các middleware tiếp theo
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        // Nếu token hết hạn hoặc không hợp lệ
        req.flash('error', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        req.session.destroy();
        return res.redirect('/auth/login');  // Đường dẫn đã cập nhật
    }
};

exports.verifyAdmin = async (req, res, next) => {
    try {
        // Kiểm tra xem user đã đăng nhập chưa
        if (!req.session.user) {
            req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
            return res.redirect('/login');
        }

        // Kiểm tra role của user
        if (req.session.user.role !== 'admin') {
            req.flash('error', 'Bạn không có quyền truy cập trang này');
            return res.redirect('/');
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        req.flash('error', 'Đã xảy ra lỗi, vui lòng thử lại');
        return res.redirect('/');
    }
};

// Authentication middleware
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  // Improved API request detection
  if (req.xhr || req.headers.accept && req.headers.accept.indexOf('json') > -1) {
    return res.status(401).json({
      success: false,
      message: 'Bạn cần đăng nhập để thực hiện hành động này'
    });
  }
  
  // Store the original URL for redirection after login
  req.session.returnTo = req.originalUrl;
  
  // Redirect to login page
  req.flash('error', 'Vui lòng đăng nhập để tiếp tục');
  res.redirect('/auth/login');
};

// Admin authorization middleware
exports.isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  
  // If AJAX request
  if (req.xhr) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện hành động này'
    });
  }
  
  res.status(403).render('error', {
    message: 'Bạn không có quyền truy cập trang này',
    error: { status: 403 }
  });
};

// Add this new middleware for API authentication
exports.verifyToken = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy token xác thực'
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'khachsan3tl_secret_key');
        
        // Check if user exists
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }
        
        // Add user info to request
        req.user = user;
        next();
    } catch (error) {
        console.error('API Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn'
        });
    }
};

// API admin authorization middleware
exports.isAdminAPI = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    
    return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này'
    });
};
