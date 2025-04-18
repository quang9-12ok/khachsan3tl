const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    define: {
        timestamps: true,
        underscored: true
    },
    // Add these options to handle dates properly
    dialectOptions: {
        dateStrings: true,
        typeCast: function (field, next) {
            if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
                return field.string();
            }
            return next();
        }
    }
});

module.exports = sequelize;
