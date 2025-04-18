// Sửa lại model để loại bỏ trường paymentStatus
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'room_id'
  },
  checkIn: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'check_in'
  },
  checkOut: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'check_out'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
    defaultValue: 'pending'
  },
  
  paymentStatus: {
    type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
    defaultValue: 'unpaid'
  },
  
  checkoutCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_price'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'payment_method'
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'payment_date'
  },
  hasReview: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'bookings',
  timestamps: true,
  underscored: true,
  version: false,
  optimisticLocking: false
});

module.exports = Booking;
