const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AdminLog = sequelize.define('AdminLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    adminId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'admin_id',
        references: {
            model: 'users',
            key: 'id'
        }
    },
    action: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'admin_logs',
    timestamps: true,
    underscored: true
});

module.exports = AdminLog;
