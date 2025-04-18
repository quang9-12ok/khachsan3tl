const sequelize = require('./db');
const Review = require('../models/review.model');

// This will add any missing columns to the Review table
(async () => {
  try {
    // Force Sequelize to add the timestamps columns (created_at, updated_at)
    await Review.sync({ alter: true });
    console.log('Review table updated successfully with timestamp columns');
    
    // Verify the table structure
    const [results] = await sequelize.query('DESCRIBE Reviews');
    console.log('Review table structure:', results.map(r => r.Field));
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating Review table:', error);
    process.exit(1);
  }
})();