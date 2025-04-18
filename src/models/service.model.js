const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  openingHours: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'opening_hours'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
}, {
  tableName: 'services',
  timestamps: true,
  underscored: true
});

module.exports = Service;
