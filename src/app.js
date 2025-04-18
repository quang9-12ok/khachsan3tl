const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const cors = require('cors');
const morgan = require('morgan');
// Add dotenv config at the top of the file
require('dotenv').config();

// Initialize Express app
const app = express();

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Add body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Cấu hình session (Lưu trạng thái đăng nhập)
app.use(session({
    // Provide a fallback secret if JWT_SECRET is not defined
    secret: process.env.JWT_SECRET || 'khachsan3tl_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Chỉ sử dụng secure trong môi trường production
        maxAge: 24 * 60 * 60 * 1000, // Thời gian sống của cookie: 24 giờ
        httpOnly: true, // Ngăn JavaScript truy cập cookie
        path: '/' // Đảm bảo cookie hoạt động trên tất cả các đường dẫn
    }
}));

// 🔹 Flash messages (Thông báo tạm thời)
app.use(flash());

// 🔹 CORS - Cho phép API được gọi từ các domain khác
app.use(cors());

// 🔹 Logging requests với Morgan
app.use(morgan('dev'));

// 🔹 Cấu hình thư mục chứa file tĩnh (CSS, JS, hình ảnh)
app.use(express.static(path.join(__dirname, '../public')));

// 🔹 Import routes
// Make sure you have this line to use the auth routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
// Routes
const roomRoutes = require('./routes/room.routes');
const bookingRoutes = require('./routes/booking.routes');
const serviceRoutes = require('./routes/service.routes'); // Add this line
const reviewRoutes = require('./routes/review.routes');
const adminRoutes = require('./routes/admin.routes'); // Keep this one
const viewRoutes = require('./routes/view.routes');
const contactRoutes = require('./routes/contact.routes'); 
const paymentRoutes = require('./routes/payment.routes');
const apiRoutes = require('./routes/api.routes');

// Add multer middleware for file uploads
const multer = require('multer');
const fs = require('fs');

// Configure storage for service images
const serviceStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/services');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    cb(null, 'service-' + Date.now() + path.extname(file.originalname));
  }
});

const serviceUpload = multer({ 
  storage: serviceStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Add this before your route registrations, after the service upload middleware

// Configure storage for room images
const roomStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadPath = path.join(__dirname, '../public/uploads/rooms');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function(req, file, cb) {
    cb(null, 'room-' + Date.now() + path.extname(file.originalname));
  }
});

const roomUpload = multer({ 
  storage: roomStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Apply multer middleware for room routes
app.use('/admin/rooms', (req, res, next) => {
  console.log('Admin rooms middleware hit:', req.method, req.path);
  
  if (req.method === 'POST' && req.path === '/') {
    console.log('Processing file upload for room creation');
    return roomUpload.single('image')(req, res, function(err) {
      if (err) {
        console.error('Multer error:', err);
        req.flash('error', `Upload error: ${err.message}`);
        return res.redirect('/admin/rooms/create');
      }
      console.log('File upload processed successfully');
      console.log('Request body after multer:', req.body);
      next();
    });
  } else if (req.method === 'POST' && req.path.match(/\/\d+/) && req.query._method === 'PUT') {
    // Fix the condition to match the actual request pattern
    console.log('Processing file upload for room update');
    return roomUpload.single('image')(req, res, function(err) {
      if (err) {
        console.error('Upload error:', err);
        req.flash('error', err.message);
        return res.redirect(req.originalUrl);
      }
      console.log('Request body after multer for update:', req.body);
      next();
    });
  } else {
    next();
  }
});

// Apply multer middleware for service routes
app.use('/admin/services', (req, res, next) => {
  console.log('Admin services middleware hit:', req.method, req.path);
  
  if (req.method === 'POST' && req.path === '/') {
    console.log('Processing file upload for service creation');
    serviceUpload.single('image')(req, res, function(err) {
      if (err) {
        console.error('Multer error:', err);
        req.flash('error', `Upload error: ${err.message}`);
        return res.redirect('/admin/services/create');
      }
      console.log('File upload processed successfully');
      console.log('Request body after multer:', req.body);
      next();
    });
  } else if ((req.method === 'PUT' || (req.method === 'POST' && req.path.match(/\/\d+$/))) && req.body && req.body._method === 'PUT') {
    console.log('Processing file upload for service update');
    serviceUpload.single('image')(req, res, function(err) {
      if (err) {
        console.error('Upload error:', err);
        req.flash('error', err.message);
        return res.redirect(req.originalUrl);
      }
      next();
    });
  } else {
    next();
  }
});

// Register all routes AFTER the multer middleware
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);
app.use('/services', serviceRoutes);
app.use('/bookings', bookingRoutes);
app.use('/reviews', reviewRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);
app.use('/contact', contactRoutes);
app.use('/payment', paymentRoutes);
app.use('/api', apiRoutes);

// This should be last to avoid conflicts
app.use('/', viewRoutes);

// REMOVE THESE DUPLICATE ROUTE REGISTRATIONS
// app.use('/contact', contactRoutes);
// app.use('/payment', paymentRoutes);
// app.use('/api', apiRoutes);

// Update error handling middleware to render an error page instead of just JSON response
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    // Check if the request expects JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        res.status(500).json({ message: 'Internal server error' });
    } else {
        // Render error page for browser requests
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    }
});



// Add redirects for common routes
app.get('/login', (req, res) => {
  res.redirect('/auth/login');
});

app.get('/register', (req, res) => {
  res.redirect('/auth/register');
});

app.get('/forgot-password', (req, res) => {
  res.redirect('/auth/forgot-password');
});

// Thêm các route chuyển hướng cho các trang có vấn đề
app.get('/booking/history', (req, res) => {
  res.redirect('/bookings/history');
});

app.get('/booking/my', (req, res) => {
  res.redirect('/bookings/my');
});

module.exports = app;

// REMOVE THE DUPLICATE MULTER MIDDLEWARE THAT WAS DEFINED AFTER module.exports

// Thêm middleware để ghi log session (chỉ trong môi trường development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    console.log('User in session:', req.session.user ? `ID: ${req.session.user.id}, Name: ${req.session.user.name}` : 'Not logged in');
    console.log('Request path:', req.path);
    next();
  });
}
