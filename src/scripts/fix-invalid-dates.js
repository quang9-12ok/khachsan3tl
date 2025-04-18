const sequelize = require('../config/db');

async function fixInvalidDates() {
  try {
    console.log('Starting to fix invalid dates in database...');
    
    // Update Users table
    await sequelize.query(`
      UPDATE Users 
      SET createdAt = NOW(), updatedAt = NOW() 
      WHERE createdAt = '0000-00-00 00:00:00' OR updatedAt = '0000-00-00 00:00:00'
    `);
    console.log('Fixed Users table dates');
    
    // Update Rooms table
    await sequelize.query(`
      UPDATE Rooms 
      SET createdAt = NOW(), updatedAt = NOW() 
      WHERE createdAt = '0000-00-00 00:00:00' OR updatedAt = '0000-00-00 00:00:00'
    `);
    console.log('Fixed Rooms table dates');
    
    // Update Bookings table
    await sequelize.query(`
      UPDATE Bookings 
      SET createdAt = NOW(), updatedAt = NOW() 
      WHERE createdAt = '0000-00-00 00:00:00' OR updatedAt = '0000-00-00 00:00:00'
    `);
    console.log('Fixed Bookings table dates');
    
    // Update other tables as needed
    const tables = ['Services', 'Reviews', 'AdminLogs'];
    for (const table of tables) {
      await sequelize.query(`
        UPDATE ${table} 
        SET createdAt = NOW(), updatedAt = NOW() 
        WHERE createdAt = '0000-00-00 00:00:00' OR updatedAt = '0000-00-00 00:00:00'
      `).catch(err => {
        // If table doesn't have updatedAt column, try with just createdAt
        if (err.message.includes("Unknown column 'updatedAt'")) {
          return sequelize.query(`
            UPDATE ${table} 
            SET createdAt = NOW()
            WHERE createdAt = '0000-00-00 00:00:00'
          `);
        }
        throw err;
      });
      console.log(`Fixed ${table} table dates`);
    }
    
    console.log('All invalid dates have been fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing invalid dates:', error);
    process.exit(1);
  }
}

fixInvalidDates();