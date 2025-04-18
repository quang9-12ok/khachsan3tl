const sequelize = require('../config/db');

const AdminLog = require('./admin.model');
const User = require('./user.model');
const Room = require('./room.model');
const Booking = require('./booking.model');
const Service = require('./service.model');
const Review = require('./review.model');

// Thiết lập quan hệ giữa các bảng
User.hasMany(AdminLog, { foreignKey: 'adminId', as: 'adminLogs' });
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

User.hasMany(Review);
Review.belongsTo(User);

Room.hasMany(Review);
Review.belongsTo(Room);

Booking.belongsToMany(Service, { through: 'booking_services' });
Service.belongsToMany(Booking, { through: 'booking_services' });

// Fix these associations with proper aliases
User.hasMany(Booking, { as: 'Bookings', foreignKey: 'userId' });
Booking.belongsTo(User, { as: 'User', foreignKey: 'userId' });

Room.hasMany(Booking, { as: 'Bookings', foreignKey: 'roomId' });
Booking.belongsTo(Room, { as: 'Room', foreignKey: 'roomId' });

const db = {
    sequelize,
    AdminLog,
    User,
    Room,
    Booking,
    Service,
    Review
};

module.exports = db;
