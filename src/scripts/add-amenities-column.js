const sequelize = require('../config/database');

async function addAmenitiesColumn() {
  try {
    await sequelize.query(`
      ALTER TABLE rooms 
      ADD COLUMN amenities JSON DEFAULT NULL AFTER description;
    `);
    console.log('Successfully added amenities column to rooms table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding amenities column:', error);
    process.exit(1);
  }
}

addAmenitiesColumn();