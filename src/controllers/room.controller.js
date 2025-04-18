const Room = require('../models/room.model');
const { Op } = require('sequelize');
const Review = require('../models/review.model');
const User = require('../models/user.model');
const sequelize = require('../config/db');
const Booking = require('../models/booking.model');

// Get all rooms for view
// Get all rooms for view
exports.getAllRooms = async (req, res) => {
    try {
        // Thêm trường 'image' vào danh sách thuộc tính cần lấy
        const rooms = await Room.findAll({
            attributes: ['id', 'room_number', 'type', 'price', 'status', 'description', 'image']
        });
        console.log('Rooms data:', rooms.map(room => ({
            id: room.id,
            image: room.image
          })));
        
        // Xử lý dữ liệu phòng để đảm bảo đường dẫn hình ảnh chính xác
        const roomsWithDefaults = rooms.map(room => {
            const roomData = room.toJSON();
            roomData.amenities = roomData.amenities || [];
            
            // Đảm bảo đường dẫn hình ảnh bắt đầu bằng dấu '/'
            if (roomData.image && !roomData.image.startsWith('http') && !roomData.image.startsWith('/')) {
                roomData.image = '/' + roomData.image;
            }
            
            return roomData;
        });
        
        // Thay đổi từ 'room/list' sang 'room/index' để phù hợp với template hiện có
        res.render('room/index', {
            title: 'Danh sách phòng',
            rooms: roomsWithDefaults,
            query: req.query, // Thêm query để hỗ trợ bộ lọc
            success: req.flash('success'),
            error: req.flash('error'),
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
    } catch (error) {
        console.error('Get all rooms error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải danh sách phòng');
        res.redirect('/');
    }
};
// Get room details for view
exports.getRoomById = async (req, res) => {
    try {
        const roomId = req.params.id;
        console.log('Getting room details for ID:', roomId);
        
        // Sử dụng findByPk với include để lấy thêm thông tin đánh giá
        const room = await Room.findByPk(roomId, {
            include: [{
                model: Review,
                include: [{
                    model: User,
                    attributes: ['id', 'name'] // Chỉ lấy id và name
                }],
                limit: 5,
                order: [['id', 'DESC']] // Changed from createdAt to id
            }]
        });
        
        if (!room) {
            console.log('Room not found for ID:', roomId);
            req.flash('error', 'Không tìm thấy phòng');
            return res.redirect('/rooms');
        }
        
        console.log('Room found, rendering detail template');
        
        // Chuyển đổi dữ liệu Sequelize thành JSON để dễ sử dụng trong template
        const roomData = room.toJSON();
        
        // Thêm các giá trị mặc định nếu cần
        if (!roomData.amenities) {
            roomData.amenities = ['Wi-Fi', 'TV', 'Điều hòa', 'Minibar'];
        }
        
        if (!roomData.bedType) {
            roomData.bedType = 'Giường đôi';
        }
        
        if (!roomData.area) {
            roomData.area = 30;
        }
        
        if (!roomData.capacity) {
            roomData.capacity = 2;
        }
        
        // Tính toán đánh giá trung bình nếu có
        if (roomData.Reviews && roomData.Reviews.length > 0) {
            const totalRating = roomData.Reviews.reduce((sum, review) => sum + review.rating, 0);
            roomData.rating = totalRating / roomData.Reviews.length;
            roomData.reviewCount = roomData.Reviews.length;
        } else {
            roomData.rating = 0;
            roomData.reviewCount = 0;
        }
        
        // Kiểm tra xem người dùng có thể đánh giá không
        let canReview = false;
        if (req.user) {
            const Booking = require('../models/booking.model');
            const completedBookings = await Booking.findOne({
                where: {
                    userId: req.user.id,
                    roomId: roomId,
                    status: 'completed'
                }
            });
            canReview = !!completedBookings;
        }
        
        res.render('room/detail', {
            title: `${roomData.type} - Chi tiết phòng`,
            room: roomData,
            reviews: roomData.Reviews || [],
            user: req.user,
            canReview: canReview,
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
        
    } catch (error) {
        console.error('Error getting room details:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải thông tin phòng',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// Search rooms
exports.searchRooms = async (req, res) => {
    try {
        const { checkIn, checkOut, guests, roomType } = req.query;
        
        // Build query conditions
        const whereConditions = {};
        
        if (roomType && roomType !== '') {
            whereConditions.type = roomType;
        }
        
        if (guests) {
            whereConditions.capacity = { $gte: parseInt(guests) };
        }
        
        // Find available rooms
        const rooms = await Room.findAll({
            where: whereConditions
        });
        
        res.render('room/search-results', {
            title: 'Kết quả tìm kiếm',
            rooms: rooms,
            searchParams: { checkIn, checkOut, guests, roomType },
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Search rooms error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tìm kiếm phòng');
        res.redirect('/');
    }
};

// API to get all rooms
exports.getRoomsAPI = async (req, res) => {
    try {
        // Get query parameters for filtering
        const { type, minPrice, maxPrice, status } = req.query;
        
        // Build filter conditions
        const whereConditions = {};
        
        if (type) {
            whereConditions.type = type;
        }
        
        if (minPrice) {
            whereConditions.price = {
                ...whereConditions.price,
                [Op.gte]: parseFloat(minPrice)
            };
        }
        
        if (maxPrice) {
            whereConditions.price = {
                ...whereConditions.price,
                [Op.lte]: parseFloat(maxPrice)
            };
        }
        
        if (status) {
            whereConditions.status = status;
        }
        
        // Fetch rooms with filters
        const rooms = await Room.findAll({
            where: whereConditions,
            attributes: ['id', 'room_number', 'type', 'price', 'status', 'description'],
            order: [['createdAt', 'DESC']]
        });
        
        return res.status(200).json({
            success: true,
            data: rooms
        });
    } catch (error) {
        console.error('Get rooms API error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách phòng'
        });
    }
};

// API to get room by ID
exports.getRoomByIdAPI = async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id);
        if (!room) {
            return res.status(404).json({ message: 'Không tìm thấy phòng' });
        }
        res.status(200).json(room);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

// Add these imports if they don't exist
const fs = require('fs');
const path = require('path');

// Update the createRoom function to handle image uploads
// Function to create a new room
// Function to create a new room
exports.createRoom = async (req, res) => {
    try {
      console.log('Create room request body:', req.body);
      console.log('Create room request file:', req.file);
      
      // Extract room data from request body
      const { room_number, type, price, status, description } = req.body;
      
      // Check if room with this number already exists
      const existingRoom = await Room.findOne({ 
        where: { room_number },
        attributes: ['id', 'room_number', 'type', 'price', 'capacity', 'status', 'description', 'amenities', 'discount']
      });
      
      if (existingRoom) {
        req.flash('error', 'Phòng với số này đã tồn tại');
        return res.redirect('/admin/rooms/create');
      }
      
      // Prepare room data
      const roomData = {
        room_number,
        type,
        price,
        status: status || 'available',
        description,
        // Set default values for other fields
        capacity: type === 'suite' ? 4 : (type === 'deluxe' ? 3 : 2),
        amenities: '[]',
        discount: 0
      };
      
      // Create the room without the image field first
      const room = await Room.create(roomData);
      
      // If room was created successfully and we have an image, update the image separately
      if (room && req.file) {
        try {
          // Use raw query to update the image field to avoid the column not found error
          await sequelize.query(
            'UPDATE rooms SET image = ? WHERE id = ?',
            {
              replacements: [`/uploads/rooms/${req.file.filename}`, room.id],
              type: sequelize.QueryTypes.UPDATE
            }
          );
        } catch (imageError) {
          console.error('Error updating image:', imageError);
          // Continue even if image update fails
        }
      }
      
      req.flash('success', 'Tạo phòng mới thành công');
      res.redirect('/admin/rooms');
    } catch (error) {
      console.error('Error creating room:', error);
      req.flash('error', 'Đã xảy ra lỗi khi tạo phòng mới');
      res.redirect('/admin/rooms/create');
    }
  };

  exports.updateRoom = async (req, res) => {
    try {
      const roomId = req.params.id;
      console.log('Đang cập nhật phòng:', roomId);
      console.log('Thông tin form:', req.body);
      console.log('Thông tin file:', req.file);
      
      // Tìm phòng cần cập nhật
      const room = await Room.findByPk(roomId);
      
      if (!room) {
        req.flash('error', 'Không tìm thấy phòng');
        return res.redirect('/admin/rooms');
      }
      
      // Check if form data is empty
      if (Object.keys(req.body).length === 0) {
        console.error('Form data is empty. This might be a multipart/form-data parsing issue.');
        req.flash('error', 'Không nhận được dữ liệu form. Vui lòng thử lại.');
        return res.redirect(`/admin/rooms/${roomId}/edit`);
      }
      
      // Kiểm tra dữ liệu đầu vào - more lenient validation
      if (!req.body.room_number) {
        req.flash('error', 'Thiếu số phòng');
        return res.redirect(`/admin/rooms/${roomId}/edit`);
      }
      
      // Cập nhật thông tin phòng - use existing values as fallbacks
      const updateData = {
        room_number: req.body.room_number,
        type: req.body.type || room.type,
        price: req.body.price ? parseFloat(req.body.price) : room.price,
        status: req.body.status || room.status,
        description: req.body.description || room.description
      };
      
      console.log('Dữ liệu cập nhật:', updateData);
      
    
      
      // Cập nhật các trường cơ bản
      await Room.update(updateData, {
        where: { id: roomId }
      });
      
      // Xử lý upload hình ảnh nếu có
      if (req.file) {
        console.log('Đã upload hình ảnh mới:', req.file.filename);
        
        // Sử dụng raw query để cập nhật trường image
        try {
          await sequelize.query(
            'UPDATE rooms SET image = ? WHERE id = ?',
            {
              replacements: [`/uploads/rooms/${req.file.filename}`, roomId],
              type: sequelize.QueryTypes.UPDATE
            }
          );
          console.log('Đã cập nhật hình ảnh thành công');
        } catch (imageError) {
          console.error('Lỗi cập nhật hình ảnh:', imageError);
        }
      }
      
      // Xóa cache nếu có
      if (req.app && req.app.locals && req.app.locals.roomCache) {
        req.app.locals.roomCache = null;
      }
      
      req.flash('success', 'Cập nhật phòng thành công');
      
      // Chuyển hướng với tham số timestamp để đảm bảo trang được làm mới
      res.redirect('/admin/rooms?updated=' + Date.now());
    } catch (error) {
      console.error('Lỗi cập nhật phòng:', error);
      req.flash('error', `Đã xảy ra lỗi khi cập nhật phòng: ${error.message}`);
      res.redirect(`/admin/rooms/${req.params.id}/edit`);
    }
  };

exports.deleteRoom = async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id);
        
        if (!room) {
            return res.status(404).json({ 
                success: false,
                message: 'Không tìm thấy phòng' 
            });
        }

        // Instead of checking for bookings, let's just delete the room directly
        // This will bypass the issue with the Booking model fields
        await room.destroy();
        
        return res.status(200).json({ 
            success: true,
            message: 'Xóa phòng thành công' 
        });
    } catch (error) {
        console.error('Delete room error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ khi xóa phòng',
            error: error.message 
        });
    }
};

exports.searchAvailableRooms = async (req, res) => {
    try {
        const { checkIn, checkOut, type } = req.query;

        // Tìm các phòng đã được đặt trong khoảng thời gian này
        const bookedRoomIds = await Booking.findAll({
            where: {
                status: 'confirmed',
                [Op.or]: [
                    {
                        check_in: {
                            [Op.between]: [checkIn, checkOut]
                        }
                    },
                    {
                        check_out: {
                            [Op.between]: [checkIn, checkOut]
                        }
                    }
                ]
            },
            attributes: ['room_id']
        });

        // Tạo điều kiện tìm kiếm
        const whereCondition = {
            status: 'available',
            id: {
                [Op.notIn]: bookedRoomIds.map(booking => booking.room_id)
            }
        };

        if (type) {
            whereCondition.type = type;
        }

        // Tìm các phòng còn trống
        const availableRooms = await Room.findAll({
            where: whereCondition
        });

        res.status(200).json(availableRooms);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

// Hiển thị danh sách phòng
exports.getRooms = async (req, res) => {
    try {
        const { checkIn, checkOut, guests, roomType, sort } = req.query;
        
        // Xây dựng điều kiện tìm kiếm
        let whereCondition = {};
        
        // Lọc theo loại phòng
        if (roomType) {
            whereCondition.type = roomType;
        }
        
        // Lọc theo số khách
        if (guests) {
            whereCondition.capacity = { [Op.gte]: parseInt(guests) };
        }
        
        // Lấy danh sách phòng
        let rooms = await Room.findAll({
            where: whereCondition,
            include: [
                {
                    model: Review,
                    attributes: ['rating']
                }
            ]
        });
        
        // Tính toán rating trung bình và thêm thông tin bổ sung
        rooms = rooms.map(room => {
            const roomData = room.toJSON();
            
            // Tính rating trung bình
            if (roomData.Reviews && roomData.Reviews.length > 0) {
                const totalRating = roomData.Reviews.reduce((sum, review) => sum + review.rating, 0);
                roomData.rating = totalRating / roomData.Reviews.length;
                roomData.reviewCount = roomData.Reviews.length;
            }
            
            // Thêm giá gốc nếu có giảm giá
            if (roomData.discount > 0) {
                roomData.originalPrice = roomData.price + roomData.discount;
            }
            
            delete roomData.Reviews;
            return roomData;
        });
        
        // Sắp xếp kết quả
        if (sort) {
            switch (sort) {
                case 'price_asc':
                    rooms.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    rooms.sort((a, b) => b.price - a.price);
                    break;
                case 'rating_desc':
                    rooms.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
                default:
                    rooms.sort((a, b) => a.price - b.price);
            }
        } else {
            // Mặc định sắp xếp theo giá tăng dần
            rooms.sort((a, b) => a.price - b.price);
        }
        
        res.render('room/list', {
            title: 'Danh sách phòng',
            rooms,
            query: req.query,
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
    } catch (error) {
        console.error('Error getting rooms:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải danh sách phòng',
            error
        });
    }
};

// Hiển thị chi tiết phòng
exports.getRoomDetail = async (req, res) => {
    try {
        const roomId = req.params.id;
        const reviewPage = parseInt(req.query.reviewPage) || 1;
        const reviewsPerPage = 5;
        
        // Lấy thông tin phòng với đánh giá
        const room = await Room.findByPk(roomId, {
            include: [{
                model: Review,
                include: [{
                    model: User,
                    attributes: ['id', 'name']
                }],
                limit: 5,
                order: [['id', 'DESC']] // Thay đổi từ createdAt sang id
            }]
        });
        
        if (!room) {
            return res.status(404).render('room/detail', {
                title: 'Không tìm thấy phòng',
                room: null
            });
        }
        
        // Lấy đánh giá của phòng với phân trang
        const reviewCount = await Review.count({ where: { roomId } });
        const reviewPages = Math.ceil(reviewCount / reviewsPerPage);
        
        // Lấy các phòng tương tự
        const similarRooms = await Room.findAll({
            where: {
                id: { [Op.ne]: roomId },
                type: room.type
            },
            limit: 3
        });
        
        // Kiểm tra xem người dùng có thể đánh giá không
        let canReview = false;
        if (req.session.user) {
            // Kiểm tra xem người dùng đã từng đặt phòng này chưa
            // Và chưa đánh giá phòng này
            const existingReview = await Review.findOne({
                where: {
                    roomId,
                    userId: req.session.user.id
                }
            });
            
            canReview = !existingReview;
        }
        
        // Tính rating trung bình
        const roomData = room.toJSON();
        const avgRating = await Review.findOne({
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount']
            ],
            where: { roomId }
        });
        
        if (avgRating) {
            roomData.rating = parseFloat(avgRating.getDataValue('avgRating')) || 0;
            roomData.reviewCount = parseInt(avgRating.getDataValue('reviewCount')) || 0;
        }
        
        // Thêm giá gốc nếu có giảm giá
        if (roomData.discount > 0) {
            roomData.originalPrice = roomData.price + roomData.discount;
        }
        
        res.render('room/detail', {
            title: `${room.type} - Chi tiết phòng`,
            room: roomData,
            reviews: roomData.Reviews || [],
            similarRooms,
            canReview,
            reviewPages,
            currentReviewPage: reviewPage,
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            },
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error getting room detail:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải thông tin phòng',
            error
        });
    }
};

// Hiển thị form đặt phòng
exports.getBookingForm = async (req, res) => {
    try {
        const { roomId, checkIn, checkOut, guests } = req.query;
        
        // Kiểm tra xem người dùng đã đăng nhập chưa
        if (!req.session.user) {
            return res.redirect(`/login?redirect=${encodeURIComponent(`/booking/create?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`)}`);
        }
        
        // Lấy thông tin phòng
        const room = await Room.findByPk(roomId);
        
        if (!room) {
            return res.status(404).render('error', {
                message: 'Không tìm thấy phòng',
                error: { status: 404 }
            });
        }
        
        // Kiểm tra xem phòng có sẵn sàng để đặt không
        const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut);
        
        if (!isAvailable) {
            return res.status(400).render('error', {
                message: 'Phòng đã được đặt trong khoảng thời gian này',
                error: { status: 400 }
            });
        }
        
        res.render('booking/create', {
            title: 'Đặt phòng',
            room,
            query: req.query,
            user: req.session.user,
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
    } catch (error) {
        console.error('Error getting booking form:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải form đặt phòng',
            error
        });
    }
};

// Kiểm tra phòng có sẵn sàng để đặt không
async function checkRoomAvailability(roomId, checkIn, checkOut) {
    try {
        const Booking = require('../models/booking.model');
        
        // Chuyển đổi chuỗi ngày thành đối tượng Date
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        
        // Tìm các đặt phòng đã xác nhận cho phòng này trong khoảng thời gian đã chọn
        const conflictingBookings = await Booking.findOne({
            where: {
                roomId,
                status: {
                    [Op.in]: ['confirmed', 'pending']
                },
                [Op.or]: [
                    // Trường hợp 1: check-in nằm trong khoảng thời gian đã đặt
                    {
                        checkIn: {
                            [Op.lt]: checkOutDate
                        },
                        checkOut: {
                            [Op.gt]: checkInDate
                        }
                    }
                ]
            }
        });
        
        return !conflictingBookings;
    } catch (error) {
        console.error('Error checking room availability:', error);
        return false;
    }
}

// API để kiểm tra phòng có sẵn sàng để đặt không
exports.checkAvailability = async (req, res) => {
    try {
        const { roomId, checkIn, checkOut } = req.query;
        
        if (!roomId || !checkIn || !checkOut) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin cần thiết'
            });
        }
        
        const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut);
        
        res.status(200).json({
            success: true,
            available: isAvailable
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi kiểm tra tình trạng phòng',
            error: error.message
        });
    }
};

// Hiển thị trang quản lý phòng (cho admin)
// Add these admin-specific controller functions if they don't exist

// // Function to get all rooms for admin view
// exports.getAdminRooms = async (req, res) => {
//     try {
//       // Include the image field in the query
//       const rooms = await Room.findAll({
//         attributes: [
//           'id', 
//           'room_number', 
//           'type', 
//           'price', 
//           'status', 
//           'description',
//           'image'  // Add this line to include image
//         ],
//         order: [['id', 'DESC']]
//       });
      
//       console.log('Rooms data:', rooms.map(r => ({
//         id: r.id,
//         room_number: r.room_number,
//         image: r.image
//       })));
      
//       res.render('admin/rooms', {
//         title: 'Quản lý phòng',
//         rooms,
//         success: req.flash('success'),
//         error: req.flash('error')
//       });
//     } catch (error) {
//       console.error('Get admin rooms error:', error);
//       req.flash('error', 'Đã xảy ra lỗi khi tải danh sách phòng');
//       res.redirect('/admin');
//     }
//   };

// Function to get room creation form
exports.getCreateRoomForm = async (req, res) => {
  try {
    res.render('admin/room-form', {
      title: 'Thêm phòng mới',
      room: null,
      isEdit: false,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Get create room form error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải form tạo phòng');
    res.redirect('/admin/rooms');
  }
};

// Function to get room by ID for admin view
exports.getAdminRoomById = async (req, res) => {
  try {
    const roomId = req.params.id;
    
    // Only select columns that definitely exist in the database
    const room = await Room.findByPk(roomId, {
      attributes: [
        'id', 
        'room_number', 
        'type', 
        'price', 
        'capacity', 
        'status', 
        'description',
        'amenities',
        'discount'
        // Exclude 'image' to avoid the error
      ]
    });
    
    if (!room) {
      req.flash('error', 'Không tìm thấy phòng');
      return res.redirect('/admin/rooms');
    }
    
    res.render('admin/room-detail', {
      title: 'Chi tiết phòng',
      room,
      success: req.flash('success'),
      error: req.flash('error'),
      formatCurrency: (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
      }
    });
  } catch (error) {
    console.error('Get admin room by ID error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải thông tin phòng');
    res.redirect('/admin/rooms');
  }
};

// // Function to get room edit form
// // Update the updateRoom function to handle missing image column
// exports.updateRoom = async (req, res) => {
//   try {
//     const roomId = req.params.id;
    
//     // Only select columns that definitely exist in the database
//     const room = await Room.findByPk(roomId, {
//       attributes: [
//         'id', 
//         'room_number', 
//         'type', 
//         'price', 
//         'capacity', 
//         'status', 
//         'description',
//         'amenities',
//         'discount'
//         // Exclude 'image' to avoid the error
//       ]
//     });
    
//     if (!room) {
//       req.flash('error', 'Không tìm thấy phòng');
//       return res.redirect('/admin/rooms');
//     }
    
//     // Update room data
//     const { room_number, type, price, status, description } = req.body;
    
//     // Update only fields that are provided
//     if (room_number) room.room_number = room_number;
//     if (type) room.type = type;
//     if (price) room.price = price;
//     if (status) room.status = status;
//     if (description) room.description = description;
    
//     // Handle image upload if available
//     if (req.file) {
//       // Check if image column exists before trying to update it
//       try {
//         const [imageColumns] = await sequelize.query('SHOW COLUMNS FROM rooms LIKE "image"');
//         if (imageColumns.length > 0) {
//           // Image column exists, update it
//           room.image = `/uploads/rooms/${req.file.filename}`;
//         }
//       } catch (error) {
//         console.error('Error checking image column:', error);
//       }
//     }
    
//     await room.save();
    
//     req.flash('success', 'Cập nhật phòng thành công');
//     res.redirect('/admin/rooms');
//   } catch (error) {
//     console.error('Update room error:', error);
//     req.flash('error', 'Đã xảy ra lỗi khi cập nhật phòng');
//     res.redirect('/admin/rooms');
//   }
// };

exports.deleteRoom = async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id);
        
        if (!room) {
            return res.status(404).json({ 
                success: false,
                message: 'Không tìm thấy phòng' 
            });
        }

        // Instead of checking for bookings, let's just delete the room directly
        // This will bypass the issue with the Booking model fields
        await room.destroy();
        
        return res.status(200).json({ 
            success: true,
            message: 'Xóa phòng thành công' 
        });
    } catch (error) {
        console.error('Delete room error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Lỗi máy chủ khi xóa phòng',
            error: error.message 
        });
    }
};

exports.searchAvailableRooms = async (req, res) => {
    try {
        const { checkIn, checkOut, type } = req.query;

        // Tìm các phòng đã được đặt trong khoảng thời gian này
        const bookedRoomIds = await Booking.findAll({
            where: {
                status: 'confirmed',
                [Op.or]: [
                    {
                        check_in: {
                            [Op.between]: [checkIn, checkOut]
                        }
                    },
                    {
                        check_out: {
                            [Op.between]: [checkIn, checkOut]
                        }
                    }
                ]
            },
            attributes: ['room_id']
        });

        // Tạo điều kiện tìm kiếm
        const whereCondition = {
            status: 'available',
            id: {
                [Op.notIn]: bookedRoomIds.map(booking => booking.room_id)
            }
        };

        if (type) {
            whereCondition.type = type;
        }

        // Tìm các phòng còn trống
        const availableRooms = await Room.findAll({
            where: whereCondition
        });

        res.status(200).json(availableRooms);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

// Hiển thị danh sách phòng
exports.getRooms = async (req, res) => {
    try {
        const { checkIn, checkOut, guests, roomType, sort } = req.query;
        
        // Xây dựng điều kiện tìm kiếm
        let whereCondition = {};
        
        // Lọc theo loại phòng
        if (roomType) {
            whereCondition.type = roomType;
        }
        
        // Lọc theo số khách
        if (guests) {
            whereCondition.capacity = { [Op.gte]: parseInt(guests) };
        }
        
        // Lấy danh sách phòng
        let rooms = await Room.findAll({
            where: whereCondition,
            include: [
                {
                    model: Review,
                    attributes: ['rating']
                }
            ]
        });
        
        // Tính toán rating trung bình và thêm thông tin bổ sung
        rooms = rooms.map(room => {
            const roomData = room.toJSON();
            
            // Tính rating trung bình
            if (roomData.Reviews && roomData.Reviews.length > 0) {
                const totalRating = roomData.Reviews.reduce((sum, review) => sum + review.rating, 0);
                roomData.rating = totalRating / roomData.Reviews.length;
                roomData.reviewCount = roomData.Reviews.length;
            }
            
            // Thêm giá gốc nếu có giảm giá
            if (roomData.discount > 0) {
                roomData.originalPrice = roomData.price + roomData.discount;
            }
            
            delete roomData.Reviews;
            return roomData;
        });
        
        // Sắp xếp kết quả
        if (sort) {
            switch (sort) {
                case 'price_asc':
                    rooms.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    rooms.sort((a, b) => b.price - a.price);
                    break;
                case 'rating_desc':
                    rooms.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
                default:
                    rooms.sort((a, b) => a.price - b.price);
            }
        } else {
            // Mặc định sắp xếp theo giá tăng dần
            rooms.sort((a, b) => a.price - b.price);
        }
        
        res.render('room/list', {
            title: 'Danh sách phòng',
            rooms,
            query: req.query,
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
    } catch (error) {
        console.error('Error getting rooms:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải danh sách phòng',
            error
        });
    }
};

// Hiển thị chi tiết phòng
exports.getRoomDetail = async (req, res) => {
    try {
        const roomId = req.params.id;
        const reviewPage = parseInt(req.query.reviewPage) || 1;
        const reviewsPerPage = 5;
        
        // Lấy thông tin phòng với đánh giá
        const room = await Room.findByPk(roomId, {
            include: [{
                model: Review,
                include: [{
                    model: User,
                    attributes: ['id', 'name']
                }],
                limit: 5,
                order: [['id', 'DESC']] // Thay đổi từ createdAt sang id
            }]
        });
        
        if (!room) {
            return res.status(404).render('room/detail', {
                title: 'Không tìm thấy phòng',
                room: null
            });
        }
        
        // Lấy đánh giá của phòng với phân trang
        const reviewCount = await Review.count({ where: { roomId } });
        const reviewPages = Math.ceil(reviewCount / reviewsPerPage);
        
        // Lấy các phòng tương tự
        const similarRooms = await Room.findAll({
            where: {
                id: { [Op.ne]: roomId },
                type: room.type
            },
            limit: 3
        });
        
        // Kiểm tra xem người dùng có thể đánh giá không
        let canReview = false;
        if (req.session.user) {
            // Kiểm tra xem người dùng đã từng đặt phòng này chưa
            // Và chưa đánh giá phòng này
            const existingReview = await Review.findOne({
                where: {
                    roomId,
                    userId: req.session.user.id
                }
            });
            
            canReview = !existingReview;
        }
        
        // Tính rating trung bình
        const roomData = room.toJSON();
        const avgRating = await Review.findOne({
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount']
            ],
            where: { roomId }
        });
        
        if (avgRating) {
            roomData.rating = parseFloat(avgRating.getDataValue('avgRating')) || 0;
            roomData.reviewCount = parseInt(avgRating.getDataValue('reviewCount')) || 0;
        }
        
        // Thêm giá gốc nếu có giảm giá
        if (roomData.discount > 0) {
            roomData.originalPrice = roomData.price + roomData.discount;
        }
        
        res.render('room/detail', {
            title: `${room.type} - Chi tiết phòng`,
            room: roomData,
            reviews: roomData.Reviews || [],
            similarRooms,
            canReview,
            reviewPages,
            currentReviewPage: reviewPage,
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            },
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error getting room detail:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải thông tin phòng',
            error
        });
    }
};

// Hiển thị form đặt phòng
exports.getBookingForm = async (req, res) => {
    try {
        const { roomId, checkIn, checkOut, guests } = req.query;
        
        // Kiểm tra xem người dùng đã đăng nhập chưa
        if (!req.session.user) {
            return res.redirect(`/login?redirect=${encodeURIComponent(`/booking/create?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`)}`);
        }
        
        // Lấy thông tin phòng
        const room = await Room.findByPk(roomId);
        
        if (!room) {
            return res.status(404).render('error', {
                message: 'Không tìm thấy phòng',
                error: { status: 404 }
            });
        }
        
        // Kiểm tra xem phòng có sẵn sàng để đặt không
        const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut);
        
        if (!isAvailable) {
            return res.status(400).render('error', {
                message: 'Phòng đã được đặt trong khoảng thời gian này',
                error: { status: 400 }
            });
        }
        
        res.render('booking/create', {
            title: 'Đặt phòng',
            room,
            query: req.query,
            user: req.session.user,
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
    } catch (error) {
        console.error('Error getting booking form:', error);
        res.status(500).render('error', {
            message: 'Đã xảy ra lỗi khi tải form đặt phòng',
            error
        });
    }
};

// Kiểm tra phòng có sẵn sàng để đặt không
async function checkRoomAvailability(roomId, checkIn, checkOut) {
    try {
        const Booking = require('../models/booking.model');
        
        // Chuyển đổi chuỗi ngày thành đối tượng Date
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        
        // Tìm các đặt phòng đã xác nhận cho phòng này trong khoảng thời gian đã chọn
        const conflictingBookings = await Booking.findOne({
            where: {
                roomId,
                status: {
                    [Op.in]: ['confirmed', 'pending']
                },
                [Op.or]: [
                    // Trường hợp 1: check-in nằm trong khoảng thời gian đã đặt
                    {
                        checkIn: {
                            [Op.lt]: checkOutDate
                        },
                        checkOut: {
                            [Op.gt]: checkInDate
                        }
                    }
                ]
            }
        });
        
        return !conflictingBookings;
    } catch (error) {
        console.error('Error checking room availability:', error);
        return false;
    }
}

// API để kiểm tra phòng có sẵn sàng để đặt không
exports.checkAvailability = async (req, res) => {
    try {
        const { roomId, checkIn, checkOut } = req.query;
        
        if (!roomId || !checkIn || !checkOut) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin cần thiết'
            });
        }
        
        const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut);
        
        res.status(200).json({
            success: true,
            available: isAvailable
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi kiểm tra tình trạng phòng',
            error: error.message
        });
    }
};


exports.getAdminRooms = async (req, res) => {
    try {
      // Sử dụng raw query để lấy tất cả thông tin phòng bao gồm hình ảnh
      const [rooms] = await sequelize.query(`
        SELECT id, room_number, type, price, status, description, image
        FROM rooms
        ORDER BY id DESC
      `);
      
      console.log('Danh sách phòng:', rooms.map(r => ({
        id: r.id,
        room_number: r.room_number,
        image: r.image
      })));
      
      res.render('admin/rooms', {
        title: 'Quản lý phòng',
        rooms,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Get admin rooms error:', error);
      req.flash('error', 'Đã xảy ra lỗi khi tải danh sách phòng');
      res.redirect('/admin');
    }
  };

// Function to get room creation form
exports.getCreateRoomForm = async (req, res) => {
  try {
    res.render('admin/room-form', {
      title: 'Thêm phòng mới',
      room: null,
      isEdit: false,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Get create room form error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải form tạo phòng');
    res.redirect('/admin/rooms');
  }
};

// Function to get room by ID for admin view
// Function to get room by ID for admin view
exports.getAdminRoomById = async (req, res) => {
    try {
      const roomId = req.params.id;
      
      // Include the image field in the attributes
      let room;
      try {
        room = await Room.findByPk(roomId, {
          attributes: [
            'id', 
            'room_number', 
            'type', 
            'price', 
            'capacity', 
            'status', 
            'description',
            'amenities',
            'discount',
            'image'  // Add image field
          ]
        });
      } catch (err) {
        // If error occurs (likely due to missing image column), try without image field
        console.error('Error fetching room with image field:', err);
        room = await Room.findByPk(roomId, {
          attributes: [
            'id', 
            'room_number', 
            'type', 
            'price', 
            'capacity', 
            'status', 
            'description',
            'amenities',
            'discount'
          ]
        });
      }
      
      if (!room) {
        req.flash('error', 'Không tìm thấy phòng');
        return res.redirect('/admin/rooms');
      }
      
      res.render('admin/room-detail', {
        title: 'Chi tiết phòng',
        room,
        success: req.flash('success'),
        error: req.flash('error'),
        formatCurrency: (amount) => {
          return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
        }
      });
    } catch (error) {
      console.error('Get admin room by ID error:', error);
      req.flash('error', 'Đã xảy ra lỗi khi tải thông tin phòng');
      res.redirect('/admin/rooms');
    }
  };

// Function to get room edit form
// Function to get room edit form
exports.getEditRoomForm = async (req, res) => {
    try {
      const roomId = req.params.id;
      
      // Include the image field in the query
      const room = await Room.findByPk(roomId, {
        attributes: [
          'id', 
          'room_number', 
          'type', 
          'price', 
          'capacity', 
          'status', 
          'description',
          'amenities',
          'discount',
          'image'  // Add this line to include image
        ]
      });
      
      if (!room) {
        req.flash('error', 'Không tìm thấy phòng');
        return res.redirect('/admin/rooms');
      }
      
      res.render('admin/room-form', {
        title: 'Chỉnh sửa phòng',
        room,
        isEdit: true,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Get edit room form error:', error);
      req.flash('error', 'Đã xảy ra lỗi khi tải form chỉnh sửa phòng');
      res.redirect('/admin/rooms');
    }
  };

// The existing createRoom and updateRoom functions should remain as they are
  

