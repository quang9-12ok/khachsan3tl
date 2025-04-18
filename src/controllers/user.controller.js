const User = require('../models/user.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');
const Room = require('../models/room.model');

// Get user profile
exports.getUserProfile = async (req, res) => {
    try {
        // Get user ID from session
        const userId = req.session.user?.id;
        
        if (!userId) {
            req.flash('error', 'Bạn cần đăng nhập để xem trang này');
            return res.redirect('/auth/login');
        }
        
        // Find user by ID
        const user = await User.findByPk(userId);
        
        if (!user) {
            req.flash('error', 'Không tìm thấy người dùng');
            return res.redirect('/');
        }
        
        // Get user's bookings with proper associations
        const bookings = await Booking.findAll({
            where: { userId: userId },
            include: [
                {
                    model: Room,
                    as: 'Room'
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        // Render profile page
        return res.render('user/profile', {
            title: 'Hồ sơ cá nhân',
            user: user,
            bookings: bookings,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải hồ sơ người dùng');
        return res.redirect('/');
    }
};

// Add this new function
// Get edit profile form
exports.getEditProfileForm = async (req, res) => {
    try {
        // Get user ID from session
        const userId = req.session.user?.id;
        
        if (!userId) {
            req.flash('error', 'Bạn cần đăng nhập để xem trang này');
            return res.redirect('/auth/login');
        }
        
        // Find user by ID
        const user = await User.findByPk(userId);
        
        if (!user) {
            req.flash('error', 'Không tìm thấy người dùng');
            return res.redirect('/');
        }
        
        // Render edit profile form
        return res.render('user/edit-profile', {
            title: 'Chỉnh sửa thông tin cá nhân',
            user: user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Get edit profile form error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải form chỉnh sửa');
        return res.redirect('/user/profile');
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        const userId = req.session.user?.id;
        
        if (!userId) {
            req.flash('error', 'Bạn cần đăng nhập để thực hiện thao tác này');
            return res.redirect('/auth/login');
        }
        
        await User.update(
            { name, email, phone, address },
            { where: { id: userId } }
        );
        
        // Update session user data
        req.session.user.name = name;
        req.session.user.email = email;
        req.session.user.phone = phone;
        if (address) req.session.user.address = address;
        
        req.flash('success', 'Cập nhật thông tin thành công');
        res.redirect('/user/profile');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi cập nhật thông tin');
        res.redirect('/user/edit-profile');
    }
};

// Get user bookings
exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.findAll({
            where: { userId: req.user.id },
            include: [
                { model: Room, attributes: ['id', 'type', 'room_number', 'price', 'images'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        res.render('user/bookings', {
            title: 'Đặt phòng của tôi',
            bookings: bookings,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Get user bookings error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải danh sách đặt phòng');
        res.redirect('/user/profile');
    }
};

// Get user reviews
exports.getUserReviews = async (req, res) => {
    try {
        const reviews = await Review.findAll({
            where: { userId: req.user.id },
            include: [
                { model: Room, attributes: ['id', 'type', 'room_number', 'images'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        res.render('user/reviews', {
            title: 'Đánh giá của tôi',
            reviews: reviews,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Get user reviews error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải danh sách đánh giá');
        res.redirect('/user/profile');
    }
};

// Get user favorites
exports.getUserFavorites = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                { model: Room, as: 'favoriteRooms', through: { attributes: [] } }
            ]
        });
        
        res.render('user/favorites', {
            title: 'Phòng yêu thích',
            rooms: user.favoriteRooms || [],
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Get user favorites error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải danh sách phòng yêu thích');
        res.redirect('/user/profile');
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }
        
        // Delete user
        await user.destroy();
        
        return res.status(200).json({
            success: true,
            message: 'Xóa người dùng thành công'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xóa người dùng'
        });
    }
};


// Add the missing getAllUsers function to your user controller

// Update the getAllUsers method to render the view
// Add these missing controller methods

// Make sure this function is properly implemented
exports.getAllUsers = async (req, res) => {
  try {
    // Get all users
    const users = await User.findAll({
      order: [['id', 'ASC']]
    });
    
    // Render users page with data
    res.render('admin/users', {
      title: 'Quản lý người dùng',
      users: users,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Get all users error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải danh sách người dùng');
    res.redirect('/admin');
  }
};

// Get create user form (for admin)
exports.getCreateUserForm = async (req, res) => {
  try {
    return res.render('admin/user-form', {
      title: 'Thêm người dùng mới',
      user: {},
      isNew: true
    });
  } catch (error) {
    console.error('Error rendering create user form:', error);
    return res.status(500).render('error', {
      message: 'Đã xảy ra lỗi khi tải form tạo người dùng',
      error
    });
  }
};

// Create new user (for admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const User = require('../models/user.model');
    const bcrypt = require('bcrypt');

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      req.flash('error', 'Email đã tồn tại trong hệ thống');
      return res.redirect('/admin/users/create');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || 'user'
    });

    req.flash('success', 'Tạo người dùng mới thành công');
    return res.redirect('/admin/users');
  } catch (error) {
    console.error('Error creating user:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tạo người dùng: ' + error.message);
    return res.redirect('/admin/users/create');
  }
};

// Get user by ID (for admin)
exports.getUserById = async (req, res) => {
  try {
    const User = require('../models/user.model');
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).render('error', {
        message: 'Không tìm thấy người dùng',
        error: { status: 404 }
      });
    }
    
    return res.render('admin/user-detail', {
      title: 'Chi tiết người dùng',
      user
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return res.status(500).render('error', {
      message: 'Đã xảy ra lỗi khi tải thông tin người dùng',
      error
    });
  }
};

// Get edit user form (for admin)
exports.getEditUserForm = async (req, res) => {
  try {
    const User = require('../models/user.model');
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).render('error', {
        message: 'Không tìm thấy người dùng',
        error: { status: 404 }
      });
    }
    
    return res.render('admin/user-form', {
      title: 'Chỉnh sửa người dùng',
      user,
      isNew: false
    });
  } catch (error) {
    console.error('Error getting edit user form:', error);
    return res.status(500).render('error', {
      message: 'Đã xảy ra lỗi khi tải form chỉnh sửa người dùng',
      error
    });
  }
};

// Update user (for admin)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, address } = req.body;
    const User = require('../models/user.model');
    
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Update user with address field
    await user.update({
      name,
      email,
      phone,
      role,
      address
    });
    
    // Set flash message for success
    req.flash('success', 'Cập nhật người dùng thành công');
    
    return res.status(200).json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      redirectUrl: '/admin/users'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi cập nhật người dùng',
      error: error.message
    });
  }
};

// Delete user (for admin)
exports.deleteUser = async (req, res) => {
  try {
    const User = require('../models/user.model');
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Don't allow deleting the current user
    if (user.id === req.session.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa tài khoản đang đăng nhập'
      });
    }
    
    await user.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Xóa người dùng thành công'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xóa người dùng',
      error: error.message
    });
  }
};


exports.register = async (req, res) => {
  try {
    // Existing registration logic
    
    // After successful user creation
    
    // Instead of returning JSON:
    // res.json({ success: true, message: "Đăng ký thành công", user: { id: user.id, name: user.name, email: user.email } });
    
    // Set a success flash message and redirect to login
    req.flash('success', 'Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
    return res.redirect('/auth/login');
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // For AJAX requests, return JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ 
        success: false, 
        message: 'Đã xảy ra lỗi khi đăng ký', 
        error: error.message 
      });
    }
    
    // For regular form submissions, redirect with flash message
    req.flash('error', 'Đã xảy ra lỗi khi đăng ký: ' + error.message);
    return res.redirect('/auth/register');
  }
};
