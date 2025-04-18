const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { isAuthenticated, verifyAdmin } = require('../middlewares/auth.middleware');

// User routes
router.get('/profile', isAuthenticated, userController.getUserProfile);
router.get('/edit-profile', isAuthenticated, userController.getEditProfileForm);
router.post('/edit-profile', isAuthenticated, userController.updateProfile);
router.get('/bookings', isAuthenticated, userController.getUserBookings);
router.get('/reviews', isAuthenticated, userController.getUserReviews);
router.get('/favorites', isAuthenticated, userController.getUserFavorites);

// Admin routes
router.get('/admin/users', isAuthenticated, verifyAdmin, userController.getAllUsers);
router.get('/admin/users/create', isAuthenticated, verifyAdmin, userController.getCreateUserForm);
router.post('/admin/users', isAuthenticated, verifyAdmin, userController.createUser);
router.get('/admin/users/:id', isAuthenticated, verifyAdmin, userController.getUserById);
router.get('/admin/users/:id/edit', isAuthenticated, verifyAdmin, userController.getEditUserForm);
router.put('/admin/users/:id', isAuthenticated, verifyAdmin, userController.updateUser);
router.delete('/admin/users/:id', isAuthenticated, verifyAdmin, userController.deleteUser);

module.exports = router;
