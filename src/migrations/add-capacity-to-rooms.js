'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('rooms', 'capacity', {
      type: Sequelize.INTEGER,
      defaultValue: 2,
      after: 'price'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('rooms', 'capacity');
  }
};