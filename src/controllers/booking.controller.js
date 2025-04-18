const Room = require('../models/room.model');
const Booking = require('../models/booking.model');
const { Op } = require('sequelize');
const User = require('../models/user.model');

const logger = require('../config/logger');

const MAX_BOOKING_CHANGES = 3; // Giới hạn số lần thay đổi booking
const MAX_ADVANCE_BOOKING_DAYS = 90; // Giới hạn đặt trước 3 tháng

exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.findAll();
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.getRoomById = async (req, res) => {
    try {
        const room = await Room.findByPk(req.params.id);
        if (!room) return res.status(404).json({ message: 'Không tìm thấy phòng' });
        res.status(200).json(room);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.createRoom = async (req, res) => {
    try {
        const { room_number, type, price, status, description } = req.body;
        const room = await Room.create({ room_number, type, price, status, description });
        res.status(201).json({ message: 'Thêm phòng thành công', room });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.updateRoom = async (req, res) => {
    try {
        const { type, price, status, description } = req.body;
        await Room.update({ type, price, status, description }, { where: { id: req.params.id } });
        res.status(200).json({ message: 'Cập nhật phòng thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        await Room.destroy({ where: { id: req.params.id } });
        res.status(200).json({ message: 'Xóa phòng thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.getAllBookings = async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        let whereCondition = {};

        if (status) {
            whereCondition.status = status;
        }

        if (startDate && endDate) {
            whereCondition.check_in = {
                [Op.between]: [startDate, endDate]
            };
        }

        const bookings = await Booking.findAll({
            where: whereCondition,
            include: [
                {
                    model: Room,
                    attributes: ['room_number', 'type', 'price']
                },
                {
                    model: User,
                    attributes: ['name', 'email']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        // Format the booking data to ensure all fields are properly set
        const formattedBookings = bookings.map(booking => {
            const bookingData = booking.toJSON();
            return {
                ...bookingData,
                bookingCode: bookingData.bookingCode || 'N/A',
                totalPrice: bookingData.totalPrice || 0,
                formattedTotalPrice: bookingData.totalPrice ? 
                    bookingData.totalPrice.toLocaleString('vi-VN') + ' đ' : 'N/A'
            };
        });
        
        res.status(200).json(formattedBookings);
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({ message: 'Lỗi máy chủ', error });
    }
};

exports.getBookingById = async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        // Find booking with related room and user information
        const booking = await Booking.findOne({
            where: { id: bookingId },
            include: [
                { 
                    model: Room,
                    as: 'Room'
                }
            ]
        });
        
        if (!booking) {
            req.flash('error', 'Không thể tìm thấy thông tin đặt phòng');
            return res.redirect('/bookings/my');
        }
        
        // Check if the booking belongs to the current user or user is admin
        if (booking.userId !== req.session.user?.id && req.session.user?.role !== 'admin') {
            req.flash('error', 'Bạn không có quyền xem thông tin đặt phòng này');
            return res.redirect('/bookings/my');
        }
        
        // Create a safe booking object with default values for missing properties
        const safeBooking = {
            ...booking.toJSON(),
            roomPrice: booking.roomPrice || 0,
            nights: booking.nights || 0,
            discount: booking.discount || 0,
            totalAmount: booking.totalPrice || 0,
            room: booking.Room ? {
                id: booking.Room.id,
                type: booking.Room.type,
                roomNumber: booking.Room.roomNumber || booking.Room.room_number,
                description: booking.Room.description || '',
                images: booking.Room.images || []
            } : null
        };
        
        res.render('booking/detail', { 
            title: `Chi tiết đặt phòng #${booking.bookingCode}`,
            booking: safeBooking,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Get booking detail error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải thông tin đặt phòng: ' + error.message);
        res.redirect('/bookings/my');
    }
};

// Tạo đặt phòng mới
exports.createBooking = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false,
                message: 'Bạn cần đăng nhập để đặt phòng' 
            });
        }

        const { roomId, checkIn, checkOut, guests, paymentMethod, notes } = req.body;

        // Kiểm tra phòng có tồn tại không
        const room = await Room.findByPk(roomId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phòng'
            });
        }

        // Kiểm tra phòng có sẵn không
        const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut);
        if (!isAvailable) {
            return res.status(400).json({
                success: false,
                message: 'Phòng đã được đặt trong khoảng thời gian này'
            });
        }

        // Tính số đêm
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        // Tính tổng tiền phòng
        let totalPrice = room.price * nights;

        // Tạo mã đặt phòng
        const bookingCode = generateBookingCode();

        // Tạo booking không có trường paymentStatus
        const booking = await Booking.create({
            userId: req.session.user.id,
            roomId,
            checkIn,
            checkOut,
            guests,
            nights,
            roomPrice: room.price,
            totalPrice,
            notes,
            paymentMethod,
            status: 'pending',
            bookingCode
        });

        // Cập nhật trạng thái phòng
        await room.update({ status: 'booked' });

        // Send confirmation email
        try {
            const { sendBookingConfirmationEmail } = require('../config/mailer');
            const user = await User.findByPk(req.session.user.id);
            
            if (user && user.email) {
                // Format dates for email
                const checkInDate = new Date(checkIn).toLocaleDateString('vi-VN');
                const checkOutDate = new Date(checkOut).toLocaleDateString('vi-VN');
                
                // Prepare email data
                const emailData = {
                    bookingCode: bookingCode,
                    userName: user.name,
                    roomType: room.type,
                    roomNumber: room.roomNumber || room.room_number,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    nights: nights,
                    guests: guests,
                    totalPrice: totalPrice.toLocaleString('vi-VN') + ' VND',
                    paymentMethod: 'Thanh toán tại khách sạn'
                };
                
                console.log('Sending booking confirmation email with data:', emailData);
                
                await sendBookingConfirmationEmail(user.email, emailData);
                console.log(`Booking confirmation email sent to ${user.email}`);
            }
        } catch (emailError) {
            console.error('Error sending booking confirmation email:', emailError);
            // Continue even if email fails
        }

        return res.redirect(`/bookings/${booking.id}/confirmation`);

    } catch (error) {
        console.error('Create booking error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi đặt phòng: ' + error.message);
        return res.redirect('/rooms');
    }
};


// 🛠 Hàm kiểm tra phòng có sẵn không
async function checkRoomAvailability(roomId, checkIn, checkOut, excludeBookingId = null) {
    const whereCondition = {
        roomId,
        status: {
            [Op.ne]: 'cancelled'
        },
        [Op.or]: [
            {
                checkIn: {
                    [Op.between]: [checkIn, checkOut]
                }
            },
            {
                checkOut: {
                    [Op.between]: [checkIn, checkOut]
                }
            },
            {
                [Op.and]: [
                    { checkIn: { [Op.lte]: checkIn } },
                    { checkOut: { [Op.gte]: checkOut } }
                ]
            }
        ]
    };

    if (excludeBookingId) {
        whereCondition.id = { [Op.ne]: excludeBookingId };
    }

    const bookings = await Booking.findAll({ where: whereCondition });

    return bookings.length === 0;
}

// 🛠 Hàm tạo mã đặt phòng
function generateBookingCode() {
    const prefix = 'BK';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
}

// Update the getMyBookings function
exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    
    if (!userId) {
      req.flash('error', 'Bạn cần đăng nhập để xem trang này');
      return res.redirect('/auth/login');
    }
    
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
    
    // Add this for debugging
    console.log(`Found ${bookings.length} bookings for user ${userId}`);
    
    res.render('booking/history', {
      title: 'Lịch sử đặt phòng',
      bookings: bookings,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải danh sách đặt phòng: ' + error.message);
    res.redirect('/');
  }
};

// Update the cancelBooking function to use the correct alias
exports.cancelBooking = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.user) {
            req.flash('error', 'Bạn cần đăng nhập để hủy đặt phòng');
            return res.redirect('/auth/login');
        }

        const booking = await Booking.findOne({
            where: {
                id: req.params.id,
                // Remove userId condition if admin
                ...(req.session.user.role !== 'admin' ? { userId: req.session.user.id } : {})
            },
            include: [
                { 
                    model: Room,
                    as: 'Room'
                }
            ]
        });

        if (!booking) {
            req.flash('error', 'Không tìm thấy đơn đặt phòng');
            return res.redirect(req.session.user.role === 'admin' ? '/admin/bookings' : '/bookings/my');
        }

        if (booking.status === 'cancelled') {
            req.flash('error', 'Đơn đặt phòng đã được hủy trước đó');
            return res.redirect(req.session.user.role === 'admin' ? '/admin/bookings' : '/bookings/my');
        }

        // Skip time restriction check for admin users
        if (req.session.user.role !== 'admin') {
            // Kiểm tra thời gian hủy phòng (chỉ áp dụng cho người dùng thường)
            const checkInDate = new Date(booking.checkIn);
            const today = new Date();
            const diffTime = checkInDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 2) {
                req.flash('error', 'Không thể hủy phòng trước ngày nhận phòng ít hơn 2 ngày');
                return res.redirect('/bookings/my');
            }
        }

        await booking.update({ status: 'cancelled' });
        
        // Update room status back to available if needed
        if (booking.Room) {
            await booking.Room.update({ status: 'available' });
        }

        // Log the cancellation with admin info if applicable
        if (req.session.user.role === 'admin') {
            logger.info(`Admin ${req.session.user.id} (${req.session.user.name}) cancelled booking ${booking.id} (${booking.bookingCode})`);
        }

        req.flash('success', 'Hủy đặt phòng thành công');
        return res.redirect(req.session.user.role === 'admin' ? '/admin/bookings' : '/bookings/my');
    } catch (error) {
        console.error('Cancel booking error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi hủy đặt phòng: ' + error.message);
        return res.redirect(req.session.user.role === 'admin' ? '/admin/bookings' : '/bookings/my');
    }
};

// Update the confirmBooking function
exports.confirmBooking = async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id, {
            include: [
                { model: Room, as: 'Room' },
                { model: User }
            ]
        });
        
        if (!booking) {
            return res.status(404).json({ 
                success: false,
                message: 'Không tìm thấy đơn đặt phòng' 
            });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({ 
                success: false,
                message: 'Chỉ có thể xác nhận đơn đặt phòng đang chờ duyệt' 
            });
        }

        await booking.update({ status: 'confirmed' });
        
        // Gửi email xác nhận cho khách hàng
        try {
            const { sendBookingConfirmationEmail } = require('../config/mailer');
            
            // Get user email
            const user = booking.User || await User.findByPk(booking.userId);
            
            if (user && user.email) {
                // Format dates for email
                const checkInDate = new Date(booking.checkIn).toLocaleDateString('vi-VN');
                const checkOutDate = new Date(booking.checkOut).toLocaleDateString('vi-VN');
                
                // Get room details - make sure to use the correct association
                const room = booking.Room || await Room.findByPk(booking.roomId);
                
                if (!room) {
                    console.error('Room not found for booking:', booking.id);
                }
                
                // Prepare email data with all required fields and fallbacks
                const emailData = {
                    bookingCode: booking.bookingCode || 'N/A',
                    userName: user ? user.name : 'Quý khách',
                    roomType: room ? room.type : 'Phòng đã đặt',
                    roomNumber: room ? (room.roomNumber || room.room_number) : '',
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    nights: booking.nights || 'N/A',
                    guests: booking.guests || 'N/A',
                    totalPrice: booking.totalPrice ? booking.totalPrice.toLocaleString('vi-VN') + ' VND' : 'Liên hệ khách sạn',
                    paymentMethod: 'Thanh toán tại khách sạn'
                };
                
                console.log('Sending email with data:', emailData);
                
                // Send confirmation email
                await sendBookingConfirmationEmail(user.email, emailData);
                
                console.log(`Confirmation email sent to ${user.email} for booking ${booking.bookingCode}`);
            } else {
                console.error('User email not found for booking:', booking.id);
            }
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            // Continue even if email fails
        }

        // For admin actions, redirect back to the bookings page
        if (req.xhr) {
            return res.status(200).json({ 
                success: true,
                message: 'Xác nhận đặt phòng thành công' 
            });
        } else {
            req.flash('success', 'Xác nhận đặt phòng thành công');
            return res.redirect('/admin/bookings');
        }
    } catch (error) {
        console.error('Confirm booking error:', error);
        if (req.xhr) {
            return res.status(500).json({ 
                success: false,
                message: 'Đã xảy ra lỗi khi xác nhận đặt phòng',
                error: error.message
            });
        } else {
            req.flash('error', 'Đã xảy ra lỗi khi xác nhận đặt phòng');
            return res.redirect('/admin/bookings');
        }
    }
};

// Add the missing updateBooking function
exports.updateBooking = async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.user) {
            // For API requests, return JSON error instead of redirecting
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: 'Bạn cần đăng nhập để cập nhật đặt phòng'
                });
            }
            // Redirect to the correct login path
            return res.redirect('/auth/login');
        }

        const booking = await Booking.findOne({
            where: {
                id: req.params.id,
                userId: req.session.user.id // Changed from req.user.id to req.session.user.id
            }
        });
        
        if (!booking) {
            return res.status(404).json({ 
                success: false,
                message: 'Không tìm thấy đặt phòng' 
            });
        }

        // Kiểm tra số lần thay đổi
        if (booking.changeCount >= MAX_BOOKING_CHANGES) {
            return res.status(400).json({
                success: false,
                message: `Đã vượt quá số lần thay đổi cho phép (${MAX_BOOKING_CHANGES} lần)`
            });
        }

        // Kiểm tra trạng thái booking
        if (booking.status === 'cancelled' || booking.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Không thể cập nhật đặt phòng đã hủy hoặc đã hoàn thành'
            });
        }

        // Kiểm tra thời gian check-in
        const checkInDate = new Date(booking.checkIn);
        const today = new Date();
        const diffTime = checkInDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 2) {
            return res.status(400).json({
                success: false,
                message: 'Không thể thay đổi đặt phòng trước ngày nhận phòng ít hơn 2 ngày'
            });
        }

        // Cập nhật thông tin booking
        const { checkIn, checkOut, guests, notes } = req.body;
        
        // Nếu thay đổi ngày, kiểm tra phòng có sẵn không
        if ((checkIn && checkIn !== booking.checkIn) || 
            (checkOut && checkOut !== booking.checkOut)) {
            
            const isAvailable = await checkRoomAvailability(
                booking.roomId, 
                checkIn || booking.checkIn, 
                checkOut || booking.checkOut,
                booking.id // Exclude current booking from availability check
            );
            
            if (!isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: 'Phòng đã được đặt trong khoảng thời gian này'
                });
            }
            
            // Tính lại số đêm và tổng tiền nếu thay đổi ngày
            if (checkIn && checkOut) {
                const startDate = new Date(checkIn);
                const endDate = new Date(checkOut);
                const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                
                // Lấy thông tin phòng để tính giá
                const room = await Room.findByPk(booking.roomId);
                const totalPrice = room.price * nights;
                
                await booking.update({
                    checkIn,
                    checkOut,
                    nights,
                    totalPrice,
                    guests: guests || booking.guests,
                    notes: notes || booking.notes,
                    changeCount: booking.changeCount + 1
                });
            } else {
                await booking.update({
                    checkIn: checkIn || booking.checkIn,
                    checkOut: checkOut || booking.checkOut,
                    guests: guests || booking.guests,
                    notes: notes || booking.notes,
                    changeCount: booking.changeCount + 1
                });
            }
        } else {
            // Chỉ cập nhật thông tin khác
            await booking.update({
                guests: guests || booking.guests,
                notes: notes || booking.notes,
                changeCount: booking.changeCount + 1
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật đặt phòng thành công',
            data: booking
        });
    } catch (error) {
        console.error('Update booking error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi cập nhật đặt phòng',
            error: error.message
        });
    }
};

// Add the missing deleteBooking function
exports.deleteBooking = async (req, res) => {
    try {
        // Check if admin (only admins should be able to completely delete bookings)
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa đặt phòng'
            });
        }

        const booking = await Booking.findByPk(req.params.id);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn đặt phòng'
            });
        }

        // Update room status if booking was confirmed or pending
        if (booking.status === 'confirmed' || booking.status === 'pending') {
            const room = await Room.findByPk(booking.roomId);
            if (room) {
                await room.update({ status: 'available' });
            }
        }

        // Delete the booking
        await booking.destroy();

        return res.status(200).json({
            success: true,
            message: 'Xóa đặt phòng thành công'
        });
    } catch (error) {
        console.error('Delete booking error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xóa đặt phòng',
            error: error.message
        });
    }
};

// Add this method to render the payment page
exports.renderPaymentPage = async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        // Find the booking
        const booking = await Booking.findByPk(bookingId, {
            include: [
                {
                    model: Room,
                    as: 'Room'
                },
                {
                    model: User,
                    as: 'User'
                }
            ]
        });
        
        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/bookings/my');
        }
        
        // Check if booking belongs to the current user (unless admin)
        if (booking.userId !== req.session.user.id && req.session.user.role !== 'admin') {
            req.flash('error', 'Bạn không có quyền thanh toán đặt phòng này');
            return res.redirect('/bookings/my');
        }
        
        res.render('booking/payment', {
            title: 'Thanh toán đặt phòng',
            booking,
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            }
        });
    } catch (error) {
        console.error('Render payment page error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải trang thanh toán: ' + error.message);
        res.redirect('/bookings/my');
    }
};

// Add this method to your booking controller
exports.renderBookingForm = async (req, res) => {
    try {
        const { roomId, checkIn, checkOut, guests } = req.query;
        
        if (!roomId) {
            req.flash('error', 'Vui lòng chọn phòng để đặt');
            return res.redirect('/rooms');
        }
        
        const room = await Room.findByPk(roomId);
        
        if (!room) {
            req.flash('error', 'Không tìm thấy thông tin phòng');
            return res.redirect('/rooms');
        }
        
        // Pass the query parameters to the template
        res.render('booking/create', {
            title: 'Đặt phòng',
            room,
            query: { roomId, checkIn, checkOut, guests },
            user: req.session.user,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error('Render booking form error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải trang đặt phòng');
        res.redirect('/rooms');
    }
};

// Add this method if it doesn't exist
exports.renderConfirmation = async (req, res) => {
    try {
      const bookingId = req.params.id;
      
      // Check if user is logged in
      if (!req.session.user) {
        req.flash('error', 'Bạn cần đăng nhập để xem trang này');
        return res.redirect('/auth/login');
      }
      
      const userId = req.session.user.id;
      
      const booking = await Booking.findOne({
        where: { id: bookingId },
        include: [
          { 
            model: Room,
            as: 'Room' 
          },
          { 
            model: User,
            as: 'User'
          }
        ]
      });
      
      if (!booking) {
        req.flash('error', 'Không tìm thấy thông tin đặt phòng');
        return res.redirect('/bookings/my');
      }
      
      // Check if the booking belongs to the current user or user is admin
      if (booking.userId !== userId && req.session.user.role !== 'admin') {
        req.flash('error', 'Bạn không có quyền xem thông tin đặt phòng này');
        return res.redirect('/bookings/my');
      }
      
      res.render('booking/confirmation', {
        title: 'Xác nhận đặt phòng',
        booking,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Render confirmation error:', error);
      req.flash('error', 'Đã xảy ra lỗi khi tải trang xác nhận: ' + error.message);
      res.redirect('/bookings/my');
    }
  };

// Add this helper function to your booking controller
async function sendBookingEmail(booking) {
  try {
    const { sendBookingConfirmationEmail } = require('../config/mailer');
    
    // Get user and room details
    const user = await User.findByPk(booking.userId);
    const room = await Room.findByPk(booking.roomId);
    
    if (!user || !user.email) {
      console.error('User email not found for booking:', booking.id);
      return false;
    }
    
    // Format dates
    const checkInDate = new Date(booking.checkIn).toLocaleDateString('vi-VN');
    const checkOutDate = new Date(booking.checkOut).toLocaleDateString('vi-VN');
    
    // Prepare complete booking data for email
    const emailData = {
      bookingCode: booking.bookingCode,
      userName: user.name,
      customerName: user.name,
      roomType: room ? room.type : 'Phòng đã đặt',
      roomNumber: room ? (room.roomNumber || room.room_number) : '',
      room: room, // Pass the entire room object as well
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights: booking.nights,
      guests: booking.guests,
      totalPrice: booking.totalPrice ? booking.totalPrice.toLocaleString('vi-VN') + ' VND' : 'Liên hệ khách sạn',
      paymentMethod: 'Thanh toán tại khách sạn'
    };
    
    console.log('Sending booking email with data:', emailData);
    
    // Send the email
    const result = await sendBookingConfirmationEmail(user.email, emailData);
    return result;
  } catch (error) {
    console.error('Error preparing and sending booking email:', error);
    return false;
  }
}
