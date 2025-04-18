'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('rooms', 'amenities', {
      type: Sequelize.JSON,
      defaultValue: null,
      after: 'description'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('rooms', 'amenities');
  }
};