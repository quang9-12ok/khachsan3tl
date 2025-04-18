// Add these imports at the top of the file if they don't exist
const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const Room = require('../models/room.model');
const Service = require('../models/service.model');
const { Op, Sequelize } = require('sequelize'); // Add Sequelize import
const sequelize = require('../config/db'); // Import sequelize instance
const logger = require('../config/logger');
// Make sure models are properly associated
require('../models/index');

// Update the getDashboard function to handle the case where Room.image might not exist
exports.getDashboard = async (req, res) => {
  try {
    // Get counts
    const userCount = await User.count();
    const roomCount = await Room.count();
    const bookingCount = await Booking.count();
    const serviceCount = await Service.count();
    
    // Get recent bookings with careful selection of fields
    const recentBookings = await Booking.findAll({
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Room,
          as: 'Room',
          // Only select fields that definitely exist in the database
          attributes: ['id', 'room_number', 'type', 'price']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // Get revenue statistics
    const totalRevenue = await Booking.sum('totalPrice', {
      where: {
        status: 'confirmed'
      }
    }) || 0; // Set default value to 0 if null
    
    // Get room type distribution
    const roomTypes = await Room.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type']
    });
    
    res.render('admin/dashboard', {
      title: 'Dashboard',
      userCount,
      roomCount,
      bookingCount,
      serviceCount,
      recentBookings,
      totalRevenue: totalRevenue || 0, // Ensure totalRevenue is never undefined
      roomTypes,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải dữ liệu dashboard');
    res.render('admin/dashboard', {
      title: 'Dashboard',
      userCount: 0,
      roomCount: 0,
      bookingCount: 0,
      serviceCount: 0,
      recentBookings: [],
      totalRevenue: 0, // Provide default values for all variables
      roomTypes: [],
      error: 'Đã xảy ra lỗi khi tải dữ liệu dashboard'
    });
  }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json({
            success: true,
            data: users
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi máy chủ', 
            error: error.message 
        });
    }
};

exports.getBookingStats = async (req, res) => {
    try {
        // Get all bookings
        const bookings = await Booking.findAll({
            attributes: ['id', 'createdAt', 'totalPrice', 'status']
        });
        
        // Process bookings to get monthly stats
        const stats = {};
        
        bookings.forEach(booking => {
            const date = new Date(booking.createdAt);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!stats[month]) {
                stats[month] = {
                    month,
                    count: 0,
                    revenue: 0
                };
            }
            
            stats[month].count += 1;
            stats[month].revenue += Number(booking.totalPrice) || 0;
        });
        
        // Convert to array and sort by month
        const bookingStats = Object.values(stats).sort((a, b) => a.month.localeCompare(b.month));
        
        return res.status(200).json({
            success: true,
            data: bookingStats
        });
    } catch (error) {
        console.error('Get booking stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy thống kê đặt phòng'
        });
    }
};

exports.getRoomStats = async (req, res) => {
    try {
        // Simplify the query to avoid potential issues
        const rooms = await Room.findAll({
            attributes: ['id', 'type', 'status']
        });
        
        // Make sure we have rooms before processing
        if (!rooms || rooms.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }
        
        // Group rooms by type
        const roomStats = {};
        
        rooms.forEach(room => {
            const type = room.type || 'Unknown';
            
            if (!roomStats[type]) {
                roomStats[type] = {
                    type: type,
                    total_rooms: 0,
                    available: 0,
                    booked: 0
                };
            }
            
            roomStats[type].total_rooms += 1;
            
            // Count available vs booked rooms
            if (room.status === 'available') {
                roomStats[type].available += 1;
            } else if (room.status === 'booked') {
                roomStats[type].booked += 1;
            }
        });
        
        return res.status(200).json({
            success: true,
            data: Object.values(roomStats)
        });
    } catch (error) {
        console.error('Get room stats error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Đã xảy ra lỗi khi lấy thống kê phòng' 
        });
    }
};

// Get all bookings for admin
exports.getAllBookings = async (req, res) => {
    try {
        const { status, search } = req.query;
        
        // Build where condition
        const whereCondition = {};
        
        if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
            whereCondition.status = status;
        }
        
        if (search) {
            whereCondition[Op.or] = [
                { bookingCode: { [Op.like]: `%${search}%` } },
                { '$User.name$': { [Op.like]: `%${search}%` } },
                { '$User.email$': { [Op.like]: `%${search}%` } }
            ];
        }
        
        const bookings = await Booking.findAll({
            where: whereCondition,
            include: [
                {
                    model: User,
                    as: 'User',
                    attributes: ['id', 'name', 'email', 'phone']
                },
                {
                    model: Room,
                    as: 'Room',
                    attributes: ['id', 'room_number', 'type', 'price']
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Format booking data to ensure booking codes are present and dates are correct
        const formattedBookings = bookings.map(booking => {
            const bookingData = booking.toJSON();
            
            // Generate a booking code if one doesn't exist
            if (!bookingData.bookingCode) {
                const prefix = 'BK';
                const id = String(bookingData.id).padStart(4, '0');
                const timestamp = new Date(bookingData.createdAt).getTime().toString().slice(-6);
                bookingData.bookingCode = `${prefix}${id}${timestamp}`;
                
                // Update the booking in the database with the new code
                Booking.update(
                    { bookingCode: bookingData.bookingCode },
                    { where: { id: bookingData.id } }
                ).catch(err => console.error('Error updating booking code:', err));
            }
            
            return bookingData;
        });

        res.render('admin/bookings', {
            title: 'Quản lý đặt phòng',
            bookings: formattedBookings,
            user: req.session.user,
            search: search || '',
            currentStatus: status || 'all',
            formatCurrency: (amount) => {
                if (!amount) return 'N/A';
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            },
            formatDate: (date) => {
                if (!date) return 'N/A';
                try {
                    return new Date(date).toLocaleDateString('vi-VN');
                } catch (e) {
                    return 'Invalid Date';
                }
            }
        });
    } catch (error) {
        console.error('Get all bookings error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải danh sách đặt phòng');
        res.redirect('/admin');
    }
};

// Confirm booking
exports.confirmBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const booking = await Booking.findByPk(bookingId, {
            include: [
                {
                    model: User,
                    as: 'User'
                },
                {
                    model: Room,
                    as: 'Room'
                }
            ]
        });

        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/admin/bookings');
        }

        booking.status = 'confirmed';
        await booking.save();

        // Update room status to booked
        if (booking.Room) {
            booking.Room.status = 'booked';
            await booking.Room.save();
        }

        // Send confirmation email
        if (booking.User && booking.User.email) {
            try {
                // Import the mailer function
                const { sendBookingConfirmationEmail } = require('../config/mailer');
                
                // Send email with booking details
                await sendBookingConfirmationEmail(
                    booking.User.email,
                    {
                        id: booking.id,
                        bookingCode: booking.bookingCode || `BK${booking.id}`,
                        check_in: booking.checkIn,
                        check_out: booking.checkOut,
                        total_price: booking.totalPrice,
                        room: {
                            type: booking.Room.type,
                            room_number: booking.Room.room_number
                        },
                        user: {
                            name: booking.User.name
                        }
                    }
                );
                
                console.log(`Confirmation email sent to ${booking.User.email}`);
            } catch (emailError) {
                console.error('Error sending confirmation email:', emailError);
            }
        }

        req.flash('success', 'Xác nhận đặt phòng thành công');
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Confirm booking error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi xác nhận đặt phòng');
        res.redirect('/admin/bookings');
    }
};

// Add this method if it doesn't exist
exports.cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const booking = await Booking.findByPk(bookingId, {
            include: [
                {
                    model: Room,
                    as: 'Room'
                }
            ]
        });

        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/admin/bookings');
        }

        booking.status = 'cancelled';
        await booking.save();

        // Update room status to available
        if (booking.Room) {
            booking.Room.status = 'available';
            await booking.Room.save();
        }

        req.flash('success', 'Hủy đặt phòng thành công');
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Cancel booking error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi hủy đặt phòng');
        res.redirect('/admin/bookings');
    }
};

// Update the getBookings function in the admin controller

exports.getBookings = async (req, res) => {
    try {
        const { status } = req.query;
        let whereCondition = {};
        
        if (status) {
            whereCondition.status = status;
        }
        
        const bookings = await Booking.findAll({
            where: whereCondition,
            include: [
                { model: Room, as: 'Room' },
                { model: User, as: 'User' } // Add the 'as' property here
            ],
            order: [['createdAt', 'DESC']]
        });
        
        // Format the booking data
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
        
        res.render('admin/bookings', {
            title: 'Quản lý đặt phòng',
            bookings: formattedBookings,
            currentStatus: status || 'all',
            success: req.flash('success'),
            error: req.flash('error'),
            // Add these helper functions
            formatCurrency: (amount) => {
                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
            },
            formatDate: (date) => {
                return new Date(date).toLocaleDateString('vi-VN');
            }
        });
    } catch (error) {
        console.error('Admin get bookings error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải danh sách đặt phòng');
        res.redirect('/admin/dashboard');
    }
};

// Add this method to view booking details
exports.getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    // Find the booking with associated user and room data
    const booking = await Booking.findByPk(bookingId, {
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Room,
          as: 'Room',
          attributes: ['id', 'room_number', 'type', 'price', 'status']
        }
      ]
    });
    
    if (!booking) {
      req.flash('error', 'Không tìm thấy đơn đặt phòng');
      return res.redirect('/admin/bookings');
    }
    
    // Create a formatted booking object with all necessary fields
    const formattedBooking = booking.toJSON();
    
    // Set a default value for number of guests if it doesn't exist
    formattedBooking.guestCount = formattedBooking.guestCount || 
                                 formattedBooking.numGuests || 
                                 formattedBooking.guests || 
                                 formattedBooking.numberOfGuests || 
                                 formattedBooking.num_guests || 2; // Default to 2 if no value exists
    
    res.render('admin/booking-detail', {
      title: `Chi tiết đơn đặt phòng #${booking.id}`,
      booking: formattedBooking,
      success: req.flash('success'),
      error: req.flash('error'),
      formatCurrency: (amount) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
      },
      formatDate: (date) => {
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleDateString('vi-VN');
        } catch (e) {
          return 'Invalid Date';
        }
      }
    });
  } catch (error) {
    console.error('Get booking by id error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải thông tin đơn đặt phòng');
    res.redirect('/admin/bookings');
  }
};

// Add this method for cancelling bookings
exports.cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const booking = await Booking.findByPk(bookingId, {
            include: [
                {
                    model: Room,
                    as: 'Room'
                }
            ]
        });

        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/admin/bookings');
        }

        // Update booking status
        booking.status = 'cancelled';
        await booking.save();

        // Update room status back to available
        if (booking.Room) {
            booking.Room.status = 'available';
            await booking.Room.save();
        }

        // Log the cancellation
        const logger = require('../config/logger');
        logger.info(`Admin ${req.session.user.id} (${req.session.user.name}) cancelled booking ${booking.id}`);

        req.flash('success', 'Hủy đặt phòng thành công');
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Cancel booking error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi hủy đặt phòng');
        res.redirect('/admin/bookings');
    }
};

// Complete checkout for a booking
exports.completeCheckout = async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        // Find the booking
        const booking = await Booking.findByPk(bookingId, {
            include: [
                {
                    model: User,
                    as: 'User'
                },
                {
                    model: Room,
                    as: 'Room'
                }
            ]
        });
        
        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/admin/bookings');
        }
        
        // Check if payment has been completed
        if (booking.paymentStatus !== 'paid') {
            req.flash('error', 'Cần thanh toán trước khi hoàn thành check-out');
            return res.redirect(`/admin/bookings/${bookingId}`);
        }
        
        // Update booking status
        booking.checkoutCompleted = true;
        booking.status = 'completed';
        await booking.save();
        
        // Update room status to available
        if (booking.Room) {
            booking.Room.status = 'available';
            await booking.Room.save();
        }
        
        // Log the checkout
        logger.info(`Checkout completed for booking ${booking.id} (${booking.bookingCode || 'No code'}) by admin ${req.session.user.id}`);
        
        // Send confirmation email to user if email service is configured
        if (booking.User && booking.User.email) {
            try {
                const { sendMail } = require('../config/mailer');
                
                const mailOptions = {
                    to: booking.User.email,
                    subject: 'Xác nhận trả phòng thành công',
                    html: `
                        <h1>Xác nhận trả phòng thành công</h1>
                        <p>Kính gửi ${booking.User.name},</p>
                        <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi. Bạn đã hoàn thành việc trả phòng.</p>
                        <p>Mã đặt phòng: <strong>${booking.bookingCode || `BK${booking.id}`}</strong></p>
                        <p>Phòng: ${booking.Room ? booking.Room.type + ' - ' + booking.Room.room_number : 'N/A'}</p>
                        <p>Thời gian lưu trú: ${new Date(booking.checkIn).toLocaleDateString('vi-VN')} - ${new Date(booking.checkOut).toLocaleDateString('vi-VN')}</p>
                        <p>Chúng tôi rất mong được phục vụ bạn trong tương lai!</p>
                    `
                };
                
                sendMail(mailOptions).catch(err => {
                    console.error('Error sending checkout confirmation email:', err);
                });
            } catch (emailError) {
                console.error('Error with email service:', emailError);
            }
        }
        
        req.flash('success', 'Hoàn thành check-out thành công');
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Complete checkout error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi hoàn thành check-out: ' + error.message);
        res.redirect('/admin/bookings');
    }
};

// Render payment form
exports.renderPaymentForm = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const booking = await Booking.findByPk(bookingId, {
            include: [
                {
                    model: User,
                    as: 'User'
                },
                {
                    model: Room,
                    as: 'Room'
                }
            ]
        });

        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/admin/bookings');
        }

        res.render('admin/payment', {
            title: 'Xử lý thanh toán',
            booking,
            user: req.session.user
        });
    } catch (error) {
        console.error('Render payment form error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi tải form thanh toán: ' + error.message);
        res.redirect('/admin/bookings');
    }
};

// Process payment
exports.processPayment = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { paymentMethod, paymentAmount } = req.body;
        
        const booking = await Booking.findByPk(bookingId, {
            include: [
                {
                    model: Room,
                    as: 'Room'
                }
            ]
        });

        if (!booking) {
            req.flash('error', 'Không tìm thấy đặt phòng');
            return res.redirect('/admin/bookings');
        }

        // Update booking payment status
        booking.paymentStatus = 'paid';
        
        // If checkout is completed, mark booking as completed
        if (booking.checkoutCompleted) {
            booking.status = 'completed';
            
            // Update room status to available
            if (booking.Room) {
                booking.Room.status = 'available';
                await booking.Room.save();
            }
        }
        
        await booking.save();
        
        // Log the payment
        const logger = require('../config/logger');
        logger.info(`Payment processed for booking ${booking.id} (${booking.bookingCode}) by admin ${req.session.user.id}`);
        
        req.flash('success', 'Thanh toán thành công');
        res.redirect('/admin/bookings');
    } catch (error) {
        console.error('Process payment error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi xử lý thanh toán: ' + error.message);
        res.redirect('/admin/bookings');
    }
};

// Add this method if it doesn't exist
exports.updateBookingStatus = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      req.flash('error', 'Trạng thái không hợp lệ');
      return res.redirect(`/admin/bookings/${bookingId}`);
    }
    
    // Find the booking
    const booking = await Booking.findByPk(bookingId);
    
    if (!booking) {
      req.flash('error', 'Không tìm thấy đơn đặt phòng');
      return res.redirect('/admin/bookings');
    }
    
    // Update booking status
    booking.status = status;
    await booking.save();
    
    // If status is cancelled, make the room available again
    if (status === 'cancelled' || status === 'completed') {
      const room = await Room.findByPk(booking.roomId);
      if (room) {
        room.status = 'available';
        await room.save();
      }
    }
    
    req.flash('success', 'Cập nhật trạng thái đơn đặt phòng thành công');
    res.redirect(`/admin/bookings/${bookingId}`);
  } catch (error) {
    console.error('Update booking status error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi cập nhật trạng thái đơn đặt phòng');
    res.redirect(`/admin/bookings/${req.params.id}`);
  }
};

// Add this method to handle room updates
exports.updateRoom = async (req, res) => {
    try {
        const roomId = req.params.id;
        const { room_number, type, price, capacity, description, status, amenities } = req.body;
        
        // Find the room
        const room = await Room.findByPk(roomId);
        
        if (!room) {
            req.flash('error', 'Không tìm thấy phòng');
            return res.redirect('/admin/rooms');
        }
        
        // Update room details
        room.room_number = room_number;
        room.type = type;
        room.price = price;
        room.capacity = capacity;
        room.description = description;
        room.status = status;
        
        // Handle amenities if they're provided as an array
        if (amenities) {
            // If amenities is sent as a string, convert it to an array
            room.amenities = Array.isArray(amenities) ? amenities : [amenities];
        }
        
        // Handle image upload if a new image is provided
        if (req.file) {
            // Delete old image if it exists
            if (room.image) {
                try {
                    const oldImagePath = path.join(__dirname, '../../public', room.image);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                    }
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }
            
            // Set new image path
            room.image = '/uploads/rooms/' + req.file.filename;
        }
        
        // Save the updated room
        await room.save();
        
        req.flash('success', 'Cập nhật phòng thành công');
        res.redirect('/admin/rooms');
    } catch (error) {
        console.error('Update room error:', error);
        req.flash('error', 'Đã xảy ra lỗi khi cập nhật phòng: ' + error.message);
        res.redirect('/admin/rooms');
    }
};

// Service management methods
exports.getAllAdminServices = async (req, res) => {
  try {
    const services = await Service.findAll({
      order: [['id', 'DESC']]
    });
    
    res.render('admin/services', {
      title: 'Quản lý dịch vụ',
      services,
      success: req.flash('success'),
      error: req.flash('error'),
      formatCurrency: (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
      }
    });
  } catch (error) {
    console.error('Get all services error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải danh sách dịch vụ');
    res.redirect('/admin');
  }
};

// ... existing code ...

exports.getCreateServiceForm = async (req, res) => {
    try {
      // When creating a new service, we need to set isNew to true and provide an empty service object
      res.render('admin/service-form', {
        title: 'Thêm dịch vụ mới',
        isNew: true,
        isEdit: false,
        service: {}, // Provide an empty object instead of null
        error: req.flash('error'),
        success: req.flash('success'),
        formatCurrency: (amount) => {
          return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
        }
      });
    } catch (error) {
      console.error('Error rendering service form:', error);
      req.flash('error', 'Đã xảy ra lỗi khi tải form tạo dịch vụ');
      res.redirect('/admin/services');
    }
  };
  
  

// ... existing code ...

// Update the createService function in your admin controller

// ... existing code ...

exports.createService = async (req, res) => {
    try {
      console.log('Create service request body:', req.body);
      console.log('Create service request file:', req.file);
      
      // Debug the request
      console.log('Request headers:', req.headers);
      console.log('Request method:', req.method);
      console.log('Request content-type:', req.headers['content-type']);
      
      // Validate required fields
      if (!req.body.name || !req.body.type || !req.body.price || !req.body.description) {
        req.flash('error', 'Vui lòng điền đầy đủ thông tin bắt buộc');
        return res.redirect('/admin/services/create');
      }
      
      // Create service object
      const serviceData = {
        name: req.body.name,
        type: req.body.type,
        description: req.body.description,
        details: req.body.details || null,
        price: parseFloat(req.body.price),
        openingHours: req.body.openingHours || null,
        status: 'active'
      };
      
      // Add image if uploaded
      if (req.file) {
        serviceData.image = `/uploads/services/${req.file.filename}`;
      }
      
      // Create the service
      const Service = require('../models/service.model');
      const newService = await Service.create(serviceData);
      
      console.log('Service created successfully:', newService);
      req.flash('success', 'Tạo dịch vụ mới thành công');
      res.redirect('/admin/services');
    } catch (error) {
      console.error('Error creating service:', error);
      req.flash('error', `Lỗi khi tạo dịch vụ: ${error.message}`);
      res.redirect('/admin/services/create');
    }
  };

  
  

exports.getServiceById = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Service.findByPk(serviceId);
    
    if (!service) {
      req.flash('error', 'Không tìm thấy dịch vụ');
      return res.redirect('/admin/services');
    }
    
    res.render('admin/service-detail', {
      title: 'Chi tiết dịch vụ',
      service,
      success: req.flash('success'),
      error: req.flash('error'),
      formatCurrency: (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
      }
    });
  } catch (error) {
    console.error('Get service by ID error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải thông tin dịch vụ');
    res.redirect('/admin/services');
  }
};

exports.getEditServiceForm = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Service.findByPk(serviceId);
    
    if (!service) {
      req.flash('error', 'Không tìm thấy dịch vụ');
      return res.redirect('/admin/services');
    }
    
    res.render('admin/service-form', {
      title: 'Chỉnh sửa dịch vụ',
      service,
      isEdit: true,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Get edit service form error:', error);
    req.flash('error', 'Đã xảy ra lỗi khi tải form chỉnh sửa dịch vụ');
    res.redirect('/admin/services');
  }
};

// ... existing code ...

exports.updateService = async (req, res) => {
    try {
      const serviceId = req.params.id;
      
      // Log the incoming data to debug
      console.log('Update service request body:', req.body);
      
      // Find the service first
      const service = await Service.findByPk(serviceId);
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Dịch vụ không tồn tại'
        });
      }
      
      // Make sure name is included and not empty
      if (!req.body.name || req.body.name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Tên dịch vụ không được để trống'
        });
      }
      
      // Prepare update data with all fields
      const updateData = {
        name: req.body.name,
        type: req.body.type || service.type,
        description: req.body.description || service.description,
        details: req.body.details || service.details,
        price: req.body.price || service.price,
        status: req.body.status || service.status,
        openingHours: req.body.openingHours || service.openingHours
      };
      
      // Handle image separately
      if (req.file) {
        updateData.image = `/uploads/services/${req.file.filename}`;
      }
      
      // Update the service
      await service.update(updateData);
      
      return res.status(200).json({
        success: true,
        message: 'Cập nhật dịch vụ thành công',
        service: service
      });
    } catch (error) {
      console.error('Error updating service:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi cập nhật dịch vụ',
        error: error.message
      });
    }
  };
  
 

exports.deleteService = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Service.findByPk(serviceId);
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dịch vụ'
      });
    }
    
    // Delete image file if it exists
    if (service.image) {
      try {
        const imagePath = path.join(__dirname, '../../public', service.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (err) {
        console.error('Error deleting service image:', err);
      }
    }
    
    // Delete the service
    await service.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Xóa dịch vụ thành công'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xóa dịch vụ',
      error: error.message
    });
  }
};
