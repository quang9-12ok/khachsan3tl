const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// API endpoint to get all rooms
router.get('/api', roomController.getRoomsAPI);

// Add API route for getting room by ID - Đặt route này TRƯỚC route chi tiết phòng
router.get('/api/:id', roomController.getRoomByIdAPI);

// Search rooms
router.get('/search', roomController.searchRooms);

// Get all rooms - Change from '/rooms' to '/'
router.get('/', roomController.getAllRooms);

// Create room
router.post('/', authMiddleware.verifyToken, authMiddleware.isAdminAPI, roomController.createRoom);

// Add route for updating a room
router.put('/:id', authMiddleware.verifyToken, authMiddleware.isAdminAPI, roomController.updateRoom);

// Add route for deleting a room
router.delete('/:id', authMiddleware.verifyToken, authMiddleware.isAdminAPI, roomController.deleteRoom);

// Get room details - Đặt route này CUỐI CÙNG
// Route cho trang chi tiết phòng
router.get('/:id', roomController.getRoomDetail);

module.exports = router;
