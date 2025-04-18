const sequelize = require('../config/db');

async function addBookingIdToReviews() {
  try {
    // Check if the column already exists
    const [columns] = await sequelize.query('SHOW COLUMNS FROM reviews LIKE "booking_id"');
    
    if (columns.length === 0) {
      // Add the booking_id column if it doesn't exist
      await sequelize.query(`
        ALTER TABLE reviews 
        ADD COLUMN booking_id INT NULL AFTER room_id,
        ADD CONSTRAINT fk_reviews_booking_id FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
      `);
      console.log('Successfully added booking_id column to reviews table');
    } else {
      console.log('booking_id column already exists in reviews table');
    }
    
    // Add status column if it doesn't exist
    const [statusColumns] = await sequelize.query('SHOW COLUMNS FROM reviews LIKE "status"');
    
    if (statusColumns.length === 0) {
      await sequelize.query(`
        ALTER TABLE reviews 
        ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER comment;
      `);
      console.log('Successfully added status column to reviews table');
    } else {
      console.log('status column already exists in reviews table');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error modifying reviews table:', error);
    process.exit(1);
  }
}

addBookingIdToReviews();