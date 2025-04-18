// Update the Review model to handle missing booking_id column
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./user.model');
const Room = require('./room.model');

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    roomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'room_id',
        references: {
            model: 'rooms',
            key: 'id'
        }
    },
    // Make bookingId optional until we add it to the database
    bookingId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Changed to true to make it optional
        field: 'booking_id',
        references: {
            model: 'bookings',
            key: 'id'
        }
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
    }
}, {
    tableName: 'reviews',
    timestamps: true,
    underscored: true
});

module.exports = Review;
