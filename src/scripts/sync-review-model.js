const sequelize = require('../config/db');
const Review = require('../models/review.model');

(async () => {
  try {
    await Review.sync({ alter: true });
    console.log('Review table updated successfully with timestamp columns');
    process.exit(0);
  } catch (error) {
    console.error('Error updating Review table:', error);
    process.exit(1);
  }
})();