const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Check if your Room model has the image field
// If not, you may need to add it and run a migration

// Example:
// Make sure the image field is defined in your Room model
const Room = sequelize.define('Room', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    room_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    type: {
        type: DataTypes.ENUM('standard', 'deluxe', 'suite', 'family', 'deluxeee'),
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            max: 9999999.99, // Set maximum value to prevent out of range errors
            min: 0 // Ensure price is not negative
        }
    },
    capacity: {
        type: DataTypes.INTEGER,
        defaultValue: 2
    },
    status: {
        type: DataTypes.ENUM('available'),
        defaultValue: 'available'
    },
    description: {
        type: DataTypes.TEXT
    },
    amenities: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    images: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    discount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'rooms',
    timestamps: true
});

module.exports = Room;
