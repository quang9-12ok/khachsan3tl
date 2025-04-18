'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, we need to modify the column to a VARCHAR type
    // This is a two-step process for MySQL when changing from ENUM
    
    // Step 1: Create a temporary column
    await queryInterface.addColumn('rooms', 'type_temp', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
    
    // Step 2: Copy data from old column to new column
    await queryInterface.sequelize.query(
      'UPDATE rooms SET type_temp = type'
    );
    
    // Step 3: Drop the old column
    await queryInterface.removeColumn('rooms', 'type');
    
    // Step 4: Rename the temporary column to the original name
    await queryInterface.renameColumn('rooms', 'type_temp', 'type');
    
    // Step 5: Set the NOT NULL constraint back
    await queryInterface.changeColumn('rooms', 'type', {
      type: Sequelize.STRING(50),
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // If you need to revert back to the original ENUM type
    // First, check what values are currently in use
    const results = await queryInterface.sequelize.query(
      'SELECT DISTINCT type FROM rooms', 
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const types = results.map(r => r.type);
    
    // Then convert back to ENUM with those values
    await queryInterface.changeColumn('rooms', 'type', {
      type: Sequelize.ENUM(...types, 'standard', 'deluxe', 'suite', 'family'),
      allowNull: false
    });
  }
};