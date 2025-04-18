const sequelize = require('../config/db');

async function addImageColumn() {
  try {
    console.log('Starting to add image column to rooms table...');
    
    // Check if image column exists
    const [imageColumns] = await sequelize.query('SHOW COLUMNS FROM rooms LIKE "image"');
    
    if (imageColumns.length === 0) {
      // Add the image column if it doesn't exist
      await sequelize.query(`
        ALTER TABLE rooms 
        ADD COLUMN image VARCHAR(255) NULL AFTER description;
      `);
      console.log('Successfully added image column to rooms table');
    } else {
      console.log('image column already exists in rooms table');
    }
    
    // Verify the table structure
    const [results] = await sequelize.query('DESCRIBE rooms');
    console.log('Rooms table structure:', results.map(r => r.Field));
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding image column to rooms table:', error);
    process.exit(1);
  }
}

addImageColumn();