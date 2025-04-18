'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add images column
    await queryInterface.addColumn('rooms', 'images', {
      type: Sequelize.JSON,
      defaultValue: null,
      after: 'amenities'
    });
    
    // Add discount column
    await queryInterface.addColumn('rooms', 'discount', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      after: 'images'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('rooms', 'images');
    await queryInterface.removeColumn('rooms', 'discount');
  }
};