'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Bookings', 'payment_status', {
      type: Sequelize.ENUM('unpaid', 'paid'),
      defaultValue: 'unpaid'
    });

    await queryInterface.addColumn('Bookings', 'payment_method', {
      type: Sequelize.ENUM('cash', 'transfer'),
      allowNull: true
    });

    await queryInterface.addColumn('Bookings', 'payment_date', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Bookings', 'payment_status');
    await queryInterface.removeColumn('Bookings', 'payment_method');
    await queryInterface.removeColumn('Bookings', 'payment_date');
  }
};