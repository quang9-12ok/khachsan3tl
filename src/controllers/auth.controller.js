const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize'); // Add this import for Sequelize operators

// Login page
exports.getLoginPage = (req, res) => {
    const redirect = req.query.redirect || '/';
    
    res.render('auth/login', {
        title: 'Đăng nhập',
        redirect,
        error: req.flash('error'),
        success: req.flash('success')
    });
};

// Process login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await User.findOne({ where: { email } });
        
        // Check if user exists and password is correct
        if (!user || !(await bcrypt.compare(password, user.password))) {
            req.flash('error', 'Email hoặc mật khẩu không đúng');
            return res.redirect('/auth/login');
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Set user in session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token
        };
        
        // Redirect to returnTo URL or home page
        const redirectTo = req.session.returnTo || '/';
        delete req.session.returnTo;
        
        req.flash('success', 'Đăng nhập thành công');
        res.redirect(redirectTo);
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi đăng nhập');
        res.redirect('/auth/login');
    }
};

// Register page
// Check the getRegisterPage function
exports.getRegisterPage = (req, res) => {
    try {
        // If user is already logged in, redirect to home page
        if (req.session.user) {
            return res.redirect('/');
        }
        
        res.render('auth/register', {
            title: 'Đăng ký tài khoản',
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Error rendering register page:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải trang đăng ký',
            error
        });
    }
};

// Process registration
exports.register = async (req, res) => {
    try {
        const { username, email, password, fullname, phone } = req.body;
        
        // Validate input
        if (!username || !email || !password || !fullname || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ thông tin'
            });
        }
        
        // Check if email already exists
        const existingUser = await User.findOne({
            where: { email: email }
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã tồn tại'
            });
        }
        
        // Create new user with timestamp fields
        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date();
        
        // Use snake_case column names to match the database schema
        const [user] = await User.sequelize.query(
            `INSERT INTO Users (name, email, password, phone, role, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    fullname,
                    email,
                    hashedPassword,
                    phone,
                    'user',
                    now,
                    now
                ],
                type: User.sequelize.QueryTypes.INSERT
            }
        );
        
        // Get the newly created user
        const newUser = await User.findOne({ where: { email } });
        
        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi đăng ký'
        });
    }
};

// Logout function
exports.logout = (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.redirect('/');
    }
    
    // Clear the cookie
    res.clearCookie('connect.sid');
    
    // Redirect to home page
    res.redirect('/');
  });
};
