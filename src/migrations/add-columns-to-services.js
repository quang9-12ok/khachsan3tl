'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add type column
    await queryInterface.addColumn('services', 'type', {
      type: Sequelize.STRING(50),
      allowNull: true,
      after: 'name'
    });
    
    // Add details column
    await queryInterface.addColumn('services', 'details', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'description'
    });
    
    // Add image column
    await queryInterface.addColumn('services', 'image', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'price'
    });
    
    // Add opening_hours column
    await queryInterface.addColumn('services', 'opening_hours', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'image'
    });
    
    // Add status column
    await queryInterface.addColumn('services', 'status', {
      type: Sequelize.ENUM('active', 'inactive'),
      defaultValue: 'active',
      after: 'opening_hours'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('services', 'type');
    await queryInterface.removeColumn('services', 'details');
    await queryInterface.removeColumn('services', 'image');
    await queryInterface.removeColumn('services', 'opening_hours');
    await queryInterface.removeColumn('services', 'status');
  }
};