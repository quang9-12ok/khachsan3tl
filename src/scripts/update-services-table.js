const sequelize = require('../config/db');

async function updateServicesTable() {
  try {
    console.log('Starting to update services table...');
    
    // Check if type column exists
    const [typeColumns] = await sequelize.query('SHOW COLUMNS FROM services LIKE "type"');
    if (typeColumns.length === 0) {
      await sequelize.query(`
        ALTER TABLE services 
        ADD COLUMN type VARCHAR(50) NULL AFTER name
      `);
      console.log('Added type column');
    }
    
    // Check if details column exists
    const [detailsColumns] = await sequelize.query('SHOW COLUMNS FROM services LIKE "details"');
    if (detailsColumns.length === 0) {
      await sequelize.query(`
        ALTER TABLE services 
        ADD COLUMN details TEXT NULL AFTER description
      `);
      console.log('Added details column');
    }
    
    // Check if image column exists
    const [imageColumns] = await sequelize.query('SHOW COLUMNS FROM services LIKE "image"');
    if (imageColumns.length === 0) {
      await sequelize.query(`
        ALTER TABLE services 
        ADD COLUMN image VARCHAR(255) NULL AFTER price
      `);
      console.log('Added image column');
    }
    
    // Check if opening_hours column exists
    const [openingHoursColumns] = await sequelize.query('SHOW COLUMNS FROM services LIKE "opening_hours"');
    if (openingHoursColumns.length === 0) {
      await sequelize.query(`
        ALTER TABLE services 
        ADD COLUMN opening_hours VARCHAR(255) NULL AFTER image
      `);
      console.log('Added opening_hours column');
    }
    
    // Check if status column exists
    const [statusColumns] = await sequelize.query('SHOW COLUMNS FROM services LIKE "status"');
    if (statusColumns.length === 0) {
      await sequelize.query(`
        ALTER TABLE services 
        ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active' AFTER opening_hours
      `);
      console.log('Added status column');
    }
    
    console.log('Services table updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating services table:', error);
    process.exit(1);
  }
}

updateServicesTable();