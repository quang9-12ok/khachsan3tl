const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const userController = require('../controllers/user.controller');
const roomController = require('../controllers/room.controller');
const bookingController = require('../controllers/booking.controller');
const { isAuthenticated, verifyAdmin } = require('../middlewares/auth.middleware');
const bodyParser = require('body-parser');

// Add body-parser middleware
router.use(bodyParser.urlencoded({ extended: true }));

// Dashboard
router.get('/', isAuthenticated, verifyAdmin, adminController.getDashboard);

// User management routes
router.get('/users', isAuthenticated, verifyAdmin, userController.getAllUsers);
router.get('/users/create', isAuthenticated, verifyAdmin, userController.getCreateUserForm);
router.post('/users', isAuthenticated, verifyAdmin, userController.createUser);
router.get('/users/:id', isAuthenticated, verifyAdmin, userController.getUserById);
router.get('/users/:id/edit', isAuthenticated, verifyAdmin, userController.getEditUserForm);
router.put('/users/:id', isAuthenticated, verifyAdmin, userController.updateUser);
router.delete('/users/:id', isAuthenticated, verifyAdmin, userController.deleteUser);

// Room management routes
router.get('/rooms', isAuthenticated, verifyAdmin, roomController.getAdminRooms);
router.get('/rooms/create', isAuthenticated, verifyAdmin, roomController.getCreateRoomForm);
router.post('/rooms', isAuthenticated, verifyAdmin, roomController.createRoom);
router.get('/rooms/:id', isAuthenticated, verifyAdmin, roomController.getAdminRoomById);
router.get('/rooms/:id/edit', isAuthenticated, verifyAdmin, roomController.getEditRoomForm);
//router.post('/rooms/:id', isAuthenticated, verifyAdmin, roomController.updateRoom); // Handle POST with _method=PUT
router.delete('/rooms/:id', isAuthenticated, verifyAdmin, roomController.deleteRoom);

// Booking management routes
router.get('/bookings', isAuthenticated, verifyAdmin, adminController.getAllBookings);
router.get('/bookings/:id', isAuthenticated, verifyAdmin, adminController.getBookingById);
router.put('/bookings/:id/status', isAuthenticated, verifyAdmin, adminController.updateBookingStatus);

// Add these routes for booking management
router.get('/bookings/:id/confirm', adminController.confirmBooking);
router.get('/bookings/:id/cancel', adminController.cancelBooking);
router.get('/bookings/:id/payment', adminController.renderPaymentForm);
router.post('/bookings/:id/payment', adminController.processPayment);

// Add this route for checkout
router.get('/bookings/:id/checkout', adminController.completeCheckout);

// Add service management routes
router.get('/services', isAuthenticated, verifyAdmin, adminController.getAllAdminServices);
router.get('/services/create', isAuthenticated, verifyAdmin, adminController.getCreateServiceForm);

// Update the POST route to ensure it works with file uploads
router.post('/services', isAuthenticated, verifyAdmin, (req, res, next) => {
  console.log('Service creation route hit');
  console.log('Request body before multer:', req.body);
  next();
}, adminController.createService);

router.get('/services/:id', isAuthenticated, verifyAdmin, adminController.getServiceById);
router.get('/services/:id/edit', isAuthenticated, verifyAdmin, adminController.getEditServiceForm);
// Make sure you have a route like this:
router.put('/services/:id', adminController.updateService);

// And also make sure you have a POST route that can handle the method override:
router.post('/services/:id', (req, res, next) => {
  if (req.body._method === 'PUT') {
    req._method = 'PUT';
    return adminController.updateService(req, res, next);
  }
  next();
});
router.delete('/services/:id', isAuthenticated, verifyAdmin, adminController.deleteService);

// REMOVE THESE DUPLICATE ROUTES
// router.get('/rooms', adminController.getRooms);
// router.get('/rooms/create', adminController.showCreateRoomForm);
// router.post('/rooms', adminController.createRoom);
// router.get('/rooms/:id/edit', adminController.showEditRoomForm);
// router.put('/rooms/:id', adminController.updateRoom);
// router.delete('/rooms/:id', adminController.deleteRoom);

// Add multer configuration for file uploads
// Move the middleware to the top, before any routes
// Add this near the top of your file, after the imports
router.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Body:`, req.body);
  next();
});

router.use('/rooms', (req, res, next) => {
  console.log('Admin rooms middleware hit:', req.method, req.url);
  console.log('Request body:', req.body);
  console.log('Request files:', req.files);
  console.log('Request file:', req.file);
  next();
});

// Update the routes to use multer correctly
// Make sure this is BEFORE the route definition
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/rooms'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, 'room-' + uniqueSuffix + ext);
  }
});
const serviceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/services'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, 'service-' + uniqueSuffix + ext);
  }
});

// Khởi tạo upload cho dịch vụ
const uploadService = multer({ 
  storage: serviceStorage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    // Chỉ cho phép hình ảnh
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh!'));
    }
  }
});
router.post('/services', isAuthenticated, verifyAdmin, uploadService.single('image'), adminController.createService);
router.put('/services/:id', isAuthenticated, verifyAdmin, uploadService.single('image'), adminController.updateService);

// Cập nhật route POST với method override cho dịch vụ
router.post('/services/:id', isAuthenticated, verifyAdmin, uploadService.single('image'), (req, res, next) => {
  if (req.body._method === 'PUT') {
    return adminController.updateService(req, res, next);
  }
  next();
});

// Initialize upload
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    // Allow only images
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh!'));
    }
  }
});

// Add this middleware BEFORE your routes, not inside a route handler
// Add this near the top of your file, before defining routes
router.use('/rooms', (req, res, next) => {
  console.log('Admin rooms middleware hit:', req.method, req.url);
  console.log('Request body:', req.body);
  console.log('Request files:', req.files);
  console.log('Request file:', req.file);
  next();
});

// Update the routes to use multer
router.post('/rooms', isAuthenticated, verifyAdmin, upload.single('image'), roomController.createRoom);

// Fix the route for updating rooms - make sure it's using multer correctly
// IMPORTANT: Remove any duplicate route definitions for this path
router.post('/rooms/:id', isAuthenticated, verifyAdmin, upload.single('image'), (req, res) => {
  console.log('Processing room update with form data:', req.body);
  console.log('Processing room update with file:', req.file);
  roomController.updateRoom(req, res);
});
module.exports = router;
