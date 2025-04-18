const sequelize = require('../config/db');
const Service = require('../models/service.model');

// This will add any missing columns to the Service table
(async () => {
  try {
    // Force Sequelize to add the missing columns
    await Service.sync({ alter: true });
    console.log('Service table updated successfully with new columns');
    
    // Verify the table structure
    const [results] = await sequelize.query('DESCRIBE services');
    console.log('Service table structure:', results.map(r => r.Field));
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating Service table:', error);
    process.exit(1);
  }
})();